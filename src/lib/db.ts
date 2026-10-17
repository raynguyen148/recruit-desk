import Dexie, { type Table } from "dexie";
import { z } from "zod";
import {
  defaultSettings,
  stages,
  candidateStatuses,
  migrateCandidateStatus,
  advancedCandidateStatus,
  jobStatuses,
  channels,
  type Candidate,
  type Job,
  type Company,
  type Application,
  type Settings,
  type SavedView,
  type Dataset,
  type EntityKind,
  type EntityMap,
} from "./types";

// Keep persisted values within the version-1 transfer format's bounds.
const short = z.string().max(1000);
const text = z.string().max(100000);
const id = z.string().min(1).max(200);
const timestamp = z.string().datetime({ offset: true });
const date = z
  .string()
  .refine(
    (v) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    "Invalid date",
  );
const strings = <T extends string>(...keys: T[]) =>
  Object.fromEntries(keys.map((key) => [key, short])) as Record<T, z.ZodString>;
const metadata = {
  id,
  createdAt: timestamp,
  updatedAt: timestamp,
  revision: z.number().int().nonnegative(),
};
const fields = z
  .array(z.object({ id, label: short, value: text }).strict())
  .max(200);
const schemas = {
  candidates: z
    .object({
      ...metadata,
      ...strings(
        "cpmID",
        "name",
        "headline",
        "email",
        "phone",
        "location",
        "yearsExperience",
        "salary",
        "source",
      ),
      linkedinURL: short.default(""),
      expectation: text,
      notes: text,
      status: z.preprocess(migrateCandidateStatus, z.enum(candidateStatuses)),
      skills: z.array(short).max(500),
      entries: z
        .array(
          z
            .object({
              id,
              ...strings("title", "organization", "startDate", "endDate"),
              notes: text,
              type: z.enum([
                "Experience",
                "Education",
                "Certificate",
                "Project",
                "Other",
              ]),
            })
            .strict(),
        )
        .max(1000),
      customFields: fields,
      contacts: z
        .array(
          z
            .object({
              id,
              date: z.union([timestamp, date]),
              note: text,
              channel: z.enum(channels),
            })
            .strict(),
        )
        .max(10000),
      vendorData: z.record(short, text),
      cpmKey: z.string().optional(),
    })
    .strict(),
  companies: z
    .object({
      ...metadata,
      ...strings(
        "name",
        "industry",
        "location",
        "website",
        "contactName",
        "email",
        "phone",
      ),
      notes: text,
    })
    .strict(),
  jobs: z
    .object({
      ...metadata,
      ...strings("title", "companyId", "location", "salary"),
      description: text,
      notes: text,
      employmentType: z.enum([
        "Full-time",
        "Part-time",
        "Contract",
        "Freelance",
        "Internship",
        "Temporary",
        "Other",
      ]),
      workMode: z.enum(["Remote", "Hybrid", "On-site", "Other"]),
      priority: z.enum(["Low", "Normal", "High", "Urgent"]),
      status: z.enum(jobStatuses),
      skills: z.array(short).max(500),
      customFields: fields,
    })
    .strict(),
  applications: z
    .object({
      ...metadata,
      candidateId: id,
      jobId: id,
      nextAction: text,
      followUp: z.union([timestamp, date]),
      notes: text,
      stage: z.enum(stages),
      history: z
        .array(
          z
            .object({ id, note: text, date: timestamp, stage: z.enum(stages) })
            .strict(),
        )
        .max(10000),
    })
    .strict(),
};

type StoredCandidate = Candidate & { cpmKey: string };
export class ConflictError extends Error {
  constructor(
    message = "This field changed in another tab. Your draft is kept. Choose Use saved value to load the latest value, then edit again.",
  ) {
    super(message);
    this.name = "ConflictError";
  }
}
class RecruitdeskDB extends Dexie {
  candidates!: Table<StoredCandidate, string>;
  jobs!: Table<Job, string>;
  companies!: Table<Company, string>;
  applications!: Table<Application, string>;
  settings!: Table<Settings, string>;
  constructor() {
    super("recruitdesk");
    this.version(1).stores({
      candidates: "id,&cpmKey,name,updatedAt",
      jobs: "id,companyId,title,updatedAt",
      companies: "id,name",
      applications: "id,&[candidateId+jobId],candidateId,jobId,stage,followUp",
      settings: "id",
    });
    this.version(2)
      .stores({})
      .upgrade((tx) =>
        tx
          .table("candidates")
          .toCollection()
          .modify((c) => {
            c.status = migrateCandidateStatus(c.status);
          }),
      );
    this.version(3)
      .stores({})
      .upgrade((tx) =>
        tx
          .table("candidates")
          .toCollection()
          .modify((c) => {
            c.linkedinURL ??= "";
          }),
      );
  }
}
export const db = new RecruitdeskDB();
const tables = () => [
  db.candidates,
  db.jobs,
  db.companies,
  db.applications,
  db.settings,
];
export async function initializeDB(): Promise<void> {
  await db.open();
  await db.transaction("rw", db.settings, async () => {
    if (!(await db.settings.get("workspace")))
      await db.settings.add({ ...defaultSettings });
  });
}
/** Deletes every record and restores default settings. */
export async function clearAllData(): Promise<void> {
  await db.transaction("rw", tables(), async () => {
    await Promise.all(tables().map((table) => table.clear()));
    await db.settings.add({ ...defaultSettings });
  });
}
export async function getDataset(): Promise<Dataset> {
  return db.transaction("r", tables(), async () => {
    const [candidates, jobs, companies, applications, settings] =
      await Promise.all([
        db.candidates.toArray(),
        db.jobs.toArray(),
        db.companies.toArray(),
        db.applications.toArray(),
        db.settings.get("workspace"),
      ]);
    return {
      candidates: candidates.map(({ cpmKey: _key, ...candidate }) => candidate),
      jobs,
      companies,
      applications,
      settings: settings ?? { ...defaultSettings },
    };
  });
}
function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aa = a as Record<string, unknown>,
    bb = b as Record<string, unknown>;
  return (
    Object.keys(aa).length === Object.keys(bb).length &&
    Object.keys(aa).every(
      (key) => Object.hasOwn(bb, key) && equal(aa[key], bb[key]),
    )
  );
}
function checkExpected(current: object, expected: object) {
  for (const key of Object.keys(expected)) {
    if (
      !equal(
        (current as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
      )
    )
      throw new ConflictError();
  }
}
function required(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${label} is required.`);
  return value.trim();
}
async function validate<K extends EntityKind>(
  kind: K,
  record: EntityMap[K],
): Promise<EntityMap[K]> {
  const shape = schemas[kind].safeParse(record);
  if (!shape.success)
    throw new Error(
      `Invalid ${kind} data: ${shape.error.issues[0].path.join(".")} ${shape.error.issues[0].message}`,
    );
  required(record.id, "Record ID");
  if (kind === "candidates") {
    const candidate = record as Candidate;
    candidate.name = required(candidate.name, "Candidate name");
    candidate.cpmID = required(candidate.cpmID, "CPM ID");
    const cpmKey = candidate.cpmID.toLocaleLowerCase("en-US");
    const duplicate = await db.candidates
      .where("cpmKey")
      .equals(cpmKey)
      .first();
    if (duplicate && duplicate.id !== record.id)
      throw new Error("A candidate with this CPM ID already exists.");
    Object.assign(candidate, { cpmKey });
  } else if (kind === "companies") {
    const company = record as Company;
    company.name = required(company.name, "Company name");
  } else if (kind === "jobs") {
    const job = record as Job;
    job.title = required(job.title, "Job title");
    if (job.companyId && !(await db.companies.get(job.companyId)))
      throw new Error("The selected company no longer exists.");
  } else {
    const application = record as Application;
    if (!(await db.candidates.get(application.candidateId)))
      throw new Error("The selected candidate no longer exists.");
    if (!(await db.jobs.get(application.jobId)))
      throw new Error("The selected job no longer exists.");
    if (!(stages as readonly string[]).includes(application.stage))
      throw new Error("Choose a valid application stage.");
    const duplicate = await db.applications
      .where("[candidateId+jobId]")
      .equals([application.candidateId, application.jobId])
      .first();
    if (duplicate && duplicate.id !== record.id)
      throw new Error(
        "This candidate already has an application for this job.",
      );
  }
  return record;
}
function entityTable<K extends EntityKind>(
  kind: K,
): Table<EntityMap[K], string> {
  return db.table(kind);
}
export async function createEntity<K extends EntityKind>(
  kind: K,
  record: EntityMap[K],
): Promise<void> {
  await db.transaction("rw", tables(), async () => {
    const next = structuredClone(record);
    const now = new Date().toISOString();
    next.createdAt = now;
    next.updatedAt = now;
    next.revision = 1;
    await validate(kind, next);
    if (kind === "applications") {
      const application = next as Application;
      application.history = [
        {
          id: crypto.randomUUID(),
          date: now,
          stage: application.stage,
          note: "Application created",
        },
      ];
    }
    await entityTable(kind).add(next);
    if (kind === "applications")
      await advanceCandidate(next as Application, now);
  });
}
/** Keep the candidate status in step with an application that moved forward. */
async function advanceCandidate(application: Application, now: string) {
  const candidate = await db.candidates.get(application.candidateId);
  if (!candidate) return;
  const status = advancedCandidateStatus(candidate.status, application.stage);
  if (!status) return;
  await db.candidates.put({
    ...candidate,
    status,
    updatedAt: now,
    revision: candidate.revision + 1,
  });
}
export async function patchEntity<K extends EntityKind>(
  kind: K,
  id: string,
  patch: Partial<EntityMap[K]>,
  expected: Partial<EntityMap[K]>,
): Promise<void> {
  await db.transaction("rw", tables(), async () => {
    const current = await entityTable(kind).get(id);
    if (!current)
      throw new ConflictError("This record was deleted in another tab.");
    checkExpected(current, expected);
    const now = new Date().toISOString();
    const next = {
      ...current,
      ...structuredClone(patch),
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: now,
      revision: current.revision + 1,
    };
    if (kind === "applications") {
      const oldApplication = current as Application,
        application = next as Application;
      application.history = [...oldApplication.history];
      if (application.stage !== oldApplication.stage)
        application.history.push({
          id: crypto.randomUUID(),
          date: now,
          stage: application.stage,
          note: `Moved from ${oldApplication.stage}`,
        });
    }
    await validate(kind, next);
    await entityTable(kind).put(next);
    if (
      kind === "applications" &&
      (next as Application).stage !== (current as Application).stage
    )
      await advanceCandidate(next as Application, now);
  });
}
export async function removeEntity(
  kind: EntityKind,
  id: string,
): Promise<void> {
  await db.transaction("rw", tables(), async () => {
    if (
      kind === "companies" &&
      (await db.jobs.where("companyId").equals(id).count())
    )
      throw new Error(
        "Move or delete this company’s jobs before deleting the company.",
      );
    if (kind === "candidates")
      await db.applications.where("candidateId").equals(id).delete();
    if (kind === "jobs")
      await db.applications.where("jobId").equals(id).delete();
    await entityTable(kind).delete(id);
  });
}
export async function patchSettings(
  patch: Partial<Settings>,
  expected: Partial<Settings> = {},
): Promise<void> {
  await db.transaction("rw", db.settings, async () => {
    const current = (await db.settings.get("workspace")) ?? {
      ...defaultSettings,
    };
    checkExpected(current, expected);
    const next: Settings = {
      ...current,
      ...patch,
      id: "workspace",
      revision: current.revision + 1,
    };
    next.workspaceName = required(next.workspaceName, "Workspace name");
    if (!short.safeParse(next.workspaceName).success)
      throw new Error("Workspace name must be at most 1000 characters.");
    if (
      !["system", "light", "dark"].includes(next.theme) ||
      !["comfortable", "compact"].includes(next.density) ||
      !["today", "candidates", "jobs", "applications"].includes(
        next.defaultPage,
      ) ||
      !Number.isInteger(next.pageSize) ||
      next.pageSize < 1 ||
      next.pageSize > 500 ||
      !z.union([z.literal(""), timestamp]).safeParse(next.lastBackup).success
    )
      throw new Error("Invalid workspace settings.");
    await db.settings.put(next);
  });
}

/** Saves a filter/sort combination so it can be re-applied from the list page. */
export async function saveView(view: Omit<SavedView, "id">): Promise<void> {
  const name = required(view.name, "View name");
  await db.transaction("rw", db.settings, async () => {
    const current = (await db.settings.get("workspace")) ?? {
      ...defaultSettings,
    };
    const rest = (current.savedViews ?? []).filter(
      (v) =>
        !(v.page === view.page && v.name.toLowerCase() === name.toLowerCase()),
    );
    if (rest.length >= 100) throw new Error("Too many saved views.");
    await db.settings.put({
      ...current,
      savedViews: [...rest, { ...view, name, id: crypto.randomUUID() }],
      revision: current.revision + 1,
    });
  });
}
export async function deleteView(id: string): Promise<void> {
  await db.transaction("rw", db.settings, async () => {
    const current = await db.settings.get("workspace");
    if (!current) return;
    await db.settings.put({
      ...current,
      savedViews: (current.savedViews ?? []).filter((v) => v.id !== id),
      revision: current.revision + 1,
    });
  });
}
