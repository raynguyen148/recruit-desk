import Papa from "papaparse";
import { z } from "zod";
import { db, getDataset } from "./db";
import {
  candidateStatuses,
  migrateCandidateStatus,
  jobStatuses,
  stages,
  channels,
  newCandidate,
  type Dataset,
  type Candidate,
  type EntityKind,
} from "./types";

// Vendor CSV batch limits; native JSON uses browser memory without a fixed size cap.
export const MAX_IMPORT_BYTES = 100 * 1024 * 1024;
export const MAX_ENTITY_RECORDS = 100_000;
export const IMPORT_LIMIT_LABEL = "100 MiB";
const exceedsSize = (input: string) =>
  input.length > MAX_IMPORT_BYTES ||
  new TextEncoder().encode(input).byteLength > MAX_IMPORT_BYTES;
const sizeError = `File exceeds the ${IMPORT_LIMIT_LABEL} supported limit.`;

export type ImportKind = "vendor" | "workspace" | "candidates" | "jobs";
export interface ParsedImport {
  kind: ImportKind;
  data: Partial<Dataset>;
  errors: string[];
  warnings: string[];
}
export interface ImportPlan extends ParsedImport {
  added: number;
  updated: number;
}
const text = z.string().max(100000);
const short = z.string().max(1000);
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
const base = {
  id,
  createdAt: timestamp,
  updatedAt: timestamp,
  revision: z.number().int().min(0),
};
const customFields = z
  .array(z.object({ id, label: short, value: text }).strict())
  .max(200);
const candidate = z
  .object({
    ...base,
    cpmID: short.trim().min(1),
    name: short.trim().min(1),
    headline: short,
    email: short,
    phone: short,
    location: short,
    yearsExperience: short,
    skills: z.array(short).max(500),
    status: z.preprocess(migrateCandidateStatus, z.enum(candidateStatuses)),
    salary: short,
    expectation: text,
    notes: text,
    linkedinURL: short.default(""),
    source: short,
    entries: z
      .array(
        z
          .object({
            id,
            type: z.enum([
              "Experience",
              "Education",
              "Certificate",
              "Project",
              "Other",
            ]),
            title: short,
            organization: short,
            startDate: short,
            endDate: short,
            notes: text,
          })
          .strict(),
      )
      .max(1000),
    customFields,
    contacts: z
      .array(
        z
          .object({
            id,
            channel: z.enum(channels),
            date: z.union([timestamp, date]),
            note: text,
          })
          .strict(),
      )
      .max(10000),
    vendorData: z.record(z.string().max(1000), text),
  })
  .strict();
const company = z
  .object({
    ...base,
    name: short.trim().min(1),
    industry: short,
    location: short,
    website: short,
    contactName: short,
    email: short,
    phone: short,
    notes: text,
  })
  .strict();
const job = z
  .object({
    ...base,
    title: short.trim().min(1),
    companyId: short,
    description: text,
    status: z.enum(jobStatuses),
    location: short,
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
    salary: short,
    skills: z.array(short).max(500),
    priority: z.enum(["Low", "Normal", "High", "Urgent"]),
    notes: text,
    customFields,
  })
  .strict();
const application = z
  .object({
    ...base,
    candidateId: id,
    jobId: id,
    stage: z.enum(stages),
    nextAction: text,
    followUp: z.union([timestamp, date]),
    notes: text,
    history: z
      .array(
        z
          .object({ id, date: timestamp, stage: z.enum(stages), note: text })
          .strict(),
      )
      .max(10000),
  })
  .strict();
const settings = z
  .object({
    id: z.literal("workspace"),
    theme: z.enum(["system", "light", "dark"]),
    workspaceName: short,
    defaultPage: z.enum(["candidates", "jobs", "applications"]),
    pageSize: z.number().int().min(1).max(500),
    density: z.enum(["comfortable", "compact"]),
    lastBackup: z.union([timestamp, z.literal("")]),
    revision: z.number().int().min(0),
  })
  .strict();
const workspace = z
  .object({
    candidates: z.array(candidate),
    jobs: z.array(job),
    companies: z.array(company),
    applications: z.array(application),
    settings,
  })
  .strict();
const schemas = {
  workspace,
  candidates: workspace.pick({ candidates: true }),
  jobs: workspace.pick({ jobs: true, companies: true }),
};
const envelopeSchema = (kind: Exclude<ImportKind, "vendor">) =>
  z
    .object({
      format: z.literal("recruitdesk"),
      version: z.literal(1),
      kind: z.literal(kind),
      exportedAt: timestamp,
      data: schemas[kind],
    })
    .strict();
const kinds: EntityKind[] = ["candidates", "companies", "jobs", "applications"];
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const key = (value: string) => value.trim().toLocaleLowerCase("en-US");
const fingerprint = (data: Dataset) =>
  JSON.stringify({
    ...data,
    ...Object.fromEntries(
      kinds.map((k) => [
        k,
        [...data[k]].sort((a, b) => a.id.localeCompare(b.id)),
      ]),
    ),
  });
const plans = new WeakMap<
  ImportPlan,
  {
    snapshot: string;
    data: Partial<Dataset>;
    added: number;
    updated: number;
    errors: string[];
  }
>();

export function parseVendorCSV(input: string): ParsedImport {
  const result: ParsedImport = {
    kind: "vendor",
    data: { candidates: [] },
    errors: [],
    warnings: [],
  };
  if (exceedsSize(input)) {
    result.errors.push(sizeError);
    return result;
  }
  const csv = Papa.parse<string[]>(input.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
  });
  result.errors.push(
    ...csv.errors.map((e) => `CSV row ${(e.row ?? 0) + 1}: ${e.message}`),
  );
  const [headers, ...rows] = csv.data;
  if (rows.length > MAX_ENTITY_RECORDS) {
    result.errors.push(
      `Candidate files support at most ${MAX_ENTITY_RECORDS.toLocaleString("en-US")} rows. Split this CSV into smaller files.`,
    );
    return result;
  }
  if (!headers?.length) {
    result.errors.push("The CSV is empty.");
    return result;
  }
  if (new Set(headers).size !== headers.length)
    result.errors.push("The CSV has duplicated column headers.");
  for (const h of ["Issue key", "Summary"])
    if (!headers.includes(h))
      result.errors.push(`Missing required column: ${h}.`);
  if (result.errors.length) return result;
  rows.forEach((values, index) => {
    if (values.length !== headers.length) {
      result.errors.push(
        `CSV row ${index + 2}: expected ${headers.length} columns, received ${values.length}.`,
      );
      return;
    }
    const raw = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    if (!raw["Issue key"].trim() || !raw.Summary.trim()) {
      result.errors.push(
        `CSV row ${index + 2}: Issue key and Summary are required.`,
      );
      return;
    }
    const record: Candidate = {
      ...newCandidate(),
      cpmID: raw["Issue key"].trim(),
      name: raw.Summary.trim(),
      yearsExperience:
        raw["Custom field (Years of experience)"] ?? raw.YOE ?? "",
      skills: (raw["Custom field (Skill Set)"] ?? raw["Skill Set"] ?? "")
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
      location:
        raw["Custom field (Country/ City)"] ?? raw["Country/ City"] ?? "",
      vendorData: raw,
      source: "Vendor CSV",
    };
    const checked = candidate.safeParse(record);
    if (!checked.success)
      result.errors.push(
        `CSV row ${index + 2}: ${checked.error.issues.map((e) => e.message).join("; ")}`,
      );
    else result.data.candidates!.push(checked.data);
  });
  if (!rows.length) result.errors.push("The CSV contains no candidate rows.");
  duplicateErrors(result.data, result.errors);
  result.warnings.push(
    "All original CSV columns are preserved in vendorData. Existing candidate matches are updated only after confirmation.",
  );
  return result;
}
export function parseImport(input: string, kind: ImportKind): ParsedImport {
  if (kind === "vendor") return parseVendorCSV(input);
  const result: ParsedImport = { kind, data: {}, errors: [], warnings: [] };
  try {
    const envelope = envelopeSchema(kind).parse(JSON.parse(input));
    result.data = envelope.data;
    duplicateErrors(result.data, result.errors);
    if (kind === "candidates")
      result.warnings.push(
        "Candidate-only files omit applications, jobs, companies, and settings.",
      );
    if (kind === "jobs")
      result.warnings.push(
        "Job-only files include referenced companies and omit applications and settings.",
      );
    if (kind === "workspace")
      result.warnings.push(
        "Workspace restore merges records and restores settings after confirmation; it never clears existing data.",
      );
  } catch (error) {
    result.errors.push(
      error instanceof z.ZodError
        ? error.issues
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join("; ")
        : error instanceof Error
          ? error.message
          : "Invalid import.",
    );
  }
  return result;
}
function duplicateErrors(data: Partial<Dataset>, errors: string[]) {
  for (const kind of kinds) {
    const seen = new Set<string>();
    for (const row of data[kind] ?? []) {
      if (seen.has(row.id))
        errors.push(`Duplicate ${kind} ID in file: ${row.id}.`);
      seen.add(row.id);
    }
  }
  const seen = new Set<string>();
  for (const row of data.candidates ?? [])
    if (row.cpmID.trim()) {
      const k = key(row.cpmID);
      if (seen.has(k))
        errors.push(`Duplicate candidate CPM ID in file: ${row.cpmID}.`);
      seen.add(k);
    }
}
export async function prepareImport(parsed: ParsedImport): Promise<ImportPlan> {
  const current = await getDataset();
  const data = clone(parsed.data),
    errors = [...parsed.errors],
    warnings = [...parsed.warnings];
  const checked =
    schemas[parsed.kind === "vendor" ? "candidates" : parsed.kind].safeParse(
      data,
    );
  if (!checked.success)
    errors.push(
      ...checked.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
    );
  duplicateErrors(data, errors);
  const remap = new Map<string, string>();
  const currentById = new Map(current.candidates.map((c) => [c.id, c]));
  const currentByCPM = new Map<string, Candidate[]>();
  for (const row of current.candidates) {
    const k = key(row.cpmID);
    const group = currentByCPM.get(k) ?? [];
    group.push(row);
    currentByCPM.set(k, group);
  }
  for (const row of data.candidates ?? []) {
    const byId = currentById.get(row.id);
    const matches = row.cpmID.trim()
      ? (currentByCPM.get(key(row.cpmID)) ?? [])
      : [];
    if (
      matches.length > 1 ||
      (byId && matches.length && matches[0].id !== byId.id)
    ) {
      errors.push(`Ambiguous candidate identity: ${row.cpmID || row.id}.`);
      continue;
    }
    const match = byId ?? matches[0];
    if (match) {
      remap.set(row.id, match.id);
      if (parsed.kind === "vendor") {
        const vendor = {
          cpmID: row.cpmID,
          name: row.name,
          source: row.source,
          vendorData: row.vendorData,
        };
        const optional = {
          ...(Object.hasOwn(
            row.vendorData,
            "Custom field (Years of experience)",
          ) || Object.hasOwn(row.vendorData, "YOE")
            ? { yearsExperience: row.yearsExperience }
            : {}),
          ...(Object.hasOwn(row.vendorData, "Custom field (Skill Set)") ||
          Object.hasOwn(row.vendorData, "Skill Set")
            ? { skills: row.skills }
            : {}),
          ...(Object.hasOwn(row.vendorData, "Custom field (Country/ City)") ||
          Object.hasOwn(row.vendorData, "Country/ City")
            ? { location: row.location }
            : {}),
        };
        Object.assign(row, match, vendor, optional);
      }
      row.id = match.id;
    }
  }
  for (const row of data.applications ?? [])
    row.candidateId = remap.get(row.candidateId) ?? row.candidateId;
  duplicateErrors(data, errors);
  const merged = Object.fromEntries(
    kinds.map((k) => [
      k,
      new Map([...current[k], ...(data[k] ?? [])].map((r) => [r.id, r])),
    ]),
  ) as { [K in EntityKind]: Map<string, Dataset[K][number]> };
  for (const row of data.jobs ?? [])
    if (row.companyId && !merged.companies.has(row.companyId))
      errors.push(
        `Job ${row.title} references missing company ${row.companyId}.`,
      );
  const pairs = new Map<string, string>();
  for (const row of merged.applications.values()) {
    if (!merged.candidates.has(row.candidateId) || !merged.jobs.has(row.jobId))
      errors.push(
        `Application ${row.id} references a missing candidate or job.`,
      );
    const pair = JSON.stringify([row.candidateId, row.jobId]);
    if (pairs.has(pair))
      errors.push(
        `Duplicate application for candidate ${row.candidateId} and job ${row.jobId}.`,
      );
    pairs.set(pair, row.id);
  }
  let added = 0,
    updated = 0;
  for (const kind of kinds) {
    const ids = new Set(current[kind].map((c) => c.id));
    for (const row of data[kind] ?? []) {
      if (ids.has(row.id)) updated++;
      else added++;
    }
  }
  if (data.settings) {
    updated++;
    warnings.push("Workspace settings are included as one update.");
  }
  const plan: ImportPlan = {
    kind: parsed.kind,
    data: clone(data),
    errors: [...new Set(errors)],
    warnings,
    added,
    updated,
  };
  plans.set(plan, {
    snapshot: fingerprint(current),
    data,
    added,
    updated,
    errors: plan.errors.slice(),
  });
  return plan;
}
export async function applyImport(
  plan: ImportPlan,
  allowUpdates: boolean,
): Promise<{ added: number; updated: number }> {
  const saved = plans.get(plan);
  if (!saved)
    throw new Error(
      "Import preview is missing or expired. Prepare the import again.",
    );
  if (saved.errors.length)
    throw new Error(
      "Import contains errors. Fix the file and preview it again.",
    );
  if (saved.updated && !allowUpdates)
    throw new Error(
      "Confirm updates to existing records and settings before importing.",
    );
  return db.transaction(
    "rw",
    [db.candidates, db.companies, db.jobs, db.applications, db.settings],
    async () => {
      const current = await getDataset();
      if (fingerprint(current) !== saved.snapshot)
        throw new Error(
          "Workspace changed after preview. Preview the import again.",
        );
      const now = new Date().toISOString();
      for (const kind of kinds) {
        const existing = new Map(current[kind].map((c) => [c.id, c]));
        const rows = (saved.data[kind] ?? []).map((row) => {
          const old = existing.get(row.id);
          return old
            ? {
                ...row,
                createdAt: old.createdAt,
                updatedAt: now,
                revision: old.revision + 1,
              }
            : row;
        });
        // The table is selected alongside records of the same entity kind.
        if (rows.length) {
          if (kind === "candidates")
            await db.candidates.bulkPut(
              (rows as Candidate[]).map((row) => ({
                ...row,
                cpmKey: key(row.cpmID),
              })),
            );
          else await db.table(kind).bulkPut(rows);
        }
      }
      if (saved.data.settings)
        await db.settings.put({
          ...saved.data.settings,
          revision: current.settings.revision + 1,
        });
      plans.delete(plan);
      return { added: saved.added, updated: saved.updated };
    },
  );
}
export async function exportData(
  kind: Exclude<ImportKind, "vendor">,
): Promise<string> {
  const all = await getDataset();
  const companyIds = new Set(all.jobs.map((j) => j.companyId));
  const data =
    kind === "workspace"
      ? all
      : kind === "candidates"
        ? { candidates: all.candidates }
        : {
            jobs: all.jobs,
            companies: all.companies.filter((c) => companyIds.has(c.id)),
          };
  const envelope = {
    format: "recruitdesk",
    version: 1,
    kind,
    exportedAt: new Date().toISOString(),
    data,
  };
  // Validate against the exact restore schema before offering a download.
  const checked = envelopeSchema(kind).safeParse(envelope);
  if (!checked.success)
    throw new Error(
      `Export cannot produce a restorable file: ${checked.error.issues
        .slice(0, 5)
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ")}.`,
    );
  const errors: string[] = [];
  duplicateErrors(data, errors);
  if (errors.length)
    throw new Error(
      `Export cannot produce a restorable file: ${errors.slice(0, 5).join(" ")}`,
    );
  return JSON.stringify(envelope, null, 2);
}
