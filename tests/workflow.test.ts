import "fake-indexeddb/auto";
import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllData,
  db,
  initializeDB,
  createEntity,
  getDataset,
} from "../src/lib/db";
import { bulkLink, bulkPatch, bulkRemove } from "../src/lib/bulk";
import { toCSV } from "../src/lib/csv";
import { addDays, dayKey, followUpBucket } from "../src/lib/followups";
import { loadSample, removeSample } from "../src/lib/sample";
import { parseImport } from "../src/lib/transfer";
import { linkedinHref } from "../src/lib/utils";
import {
  migrateCandidateStatus,
  newApplication,
  newCandidate,
  newCompany,
  newJob,
} from "../src/lib/types";

beforeEach(async () => {
  await db.delete();
  await initializeDB();
});

describe("follow-up buckets", () => {
  const today = "2026-03-10";
  const app = (followUp: string, stage = "Interview") => ({ followUp, stage });
  it("sorts open applications into overdue, today and the next week", () => {
    expect(followUpBucket(app("2026-03-09"), today)).toBe("overdue");
    expect(followUpBucket(app("2026-03-10"), today)).toBe("today");
    expect(followUpBucket(app("2026-03-17"), today)).toBe("week");
    expect(followUpBucket(app("2026-03-18"), today)).toBeNull();
  });
  it("ignores closed stages and missing dates", () => {
    expect(followUpBucket(app("2026-03-01", "Hired"), today)).toBeNull();
    expect(followUpBucket(app("2026-03-01", "Rejected"), today)).toBeNull();
    expect(followUpBucket(app(""), today)).toBeNull();
  });
  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("CSV export", () => {
  it("neutralizes spreadsheet formulas and quotes commas", () => {
    const text = toCSV([{ name: "=SUM(A1)", note: "a, b", n: 3 }]);
    expect(text).toContain("'=SUM(A1)");
    expect(text).toContain('"a, b"');
  });
});

describe("bulk actions", () => {
  async function seed() {
    const job = { ...newJob(), title: "Engineer" };
    await createEntity("jobs", job);
    const people = [];
    for (const name of ["A", "B", "C"]) {
      const c = { ...newCandidate(), name, cpmID: `CPM-${name}` };
      await createEntity("candidates", c);
      people.push(c);
    }
    return { job, people };
  }
  it("patches many records and can undo", async () => {
    const { people } = await seed();
    const undo = await bulkPatch("candidates", people, {
      status: "Not open",
    });
    expect(
      (await getDataset()).candidates.every((c) => c.status === "Not open"),
    ).toBe(true);
    await undo();
    expect(
      (await getDataset()).candidates.every(
        (c) => c.status === people[0].status,
      ),
    ).toBe(true);
  });
  it("links candidates to a job once and skips existing pairs", async () => {
    const { job, people } = await seed();
    const ids = people.map((p) => p.id);
    expect(await bulkLink(ids.slice(0, 2), job.id, [])).toEqual({
      created: 2,
      skipped: 0,
    });
    const existing = (await getDataset()).applications;
    expect(await bulkLink(ids, job.id, existing)).toEqual({
      created: 1,
      skipped: 2,
    });
    expect((await getDataset()).applications).toHaveLength(3);
  });
  it("removes records with their applications and reports failures", async () => {
    const { job, people } = await seed();
    await createEntity("applications", newApplication(people[0].id, job.id));
    expect(await bulkRemove("candidates", [people[0].id])).toBe(0);
    expect((await getDataset()).applications).toHaveLength(0);
    const company = { ...newCompany(), name: "Acme" };
    await createEntity("companies", company);
    await createEntity("jobs", {
      ...newJob(),
      title: "X",
      companyId: company.id,
    });
    expect(await bulkRemove("companies", [company.id])).toBe(1);
  });
});

describe("sample records", () => {
  it("removes only the sample data and keeps the user's own", async () => {
    await loadSample();
    const mine = { ...newCandidate(), name: "Mine", cpmID: "CPM-MINE" };
    await createEntity("candidates", mine);
    const removed = await removeSample();
    expect(removed.candidates).toBeGreaterThan(0);
    const after = await getDataset();
    expect(after.candidates.map((c) => c.id)).toEqual([mine.id]);
    expect(after.jobs).toHaveLength(0);
    expect(after.companies).toHaveLength(0);
    expect(after.applications).toHaveLength(0);
  });
  it("keeps a sample company that now holds one of the user's jobs", async () => {
    await loadSample();
    const company = (await getDataset()).companies[0];
    await createEntity("jobs", {
      ...newJob(),
      title: "Mine",
      companyId: company.id,
    });
    await removeSample();
    const after = await getDataset();
    expect(after.companies.map((c) => c.id)).toEqual([company.id]);
    expect(after.jobs).toHaveLength(1);
  });
});

describe("candidate status pipeline", () => {
  const legacy = [
    ["Available", "Pre-qualification"],
    ["Open to opportunities", "Pre-qualification"],
    ["Not looking", "Not open"],
    ["Do not contact", "Not suitable"],
    ["Updating CV", "CV update"],
    ["Not Suitable", "Not suitable"],
    ["Interview", "Interview"],
  ] as const;
  it("maps legacy status names onto the new pipeline", () => {
    for (const [old, next] of legacy)
      expect(migrateCandidateStatus(old)).toBe(next);
    expect(migrateCandidateStatus("unknown")).toBe("unknown");
  });
  it("upgrades stored candidates when an older database opens", async () => {
    await db.delete();
    const old = new Dexie("recruitdesk");
    old.version(1).stores({
      candidates: "id,&cpmKey,name,updatedAt",
      jobs: "id,companyId,title,updatedAt",
      companies: "id,name",
      applications: "id,&[candidateId+jobId],candidateId,jobId,stage,followUp",
      settings: "id",
    });
    await old.table("candidates").bulkPut(
      legacy.map(([status], i) => ({
        ...newCandidate(),
        id: `c${i}`,
        cpmKey: `cpm-${i}`,
        cpmID: `CPM-${i}`,
        name: `Person ${i}`,
        status,
      })),
    );
    old.close();
    await initializeDB();
    const statuses = (await getDataset()).candidates
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => c.status);
    expect(statuses).toEqual(legacy.map(([, next]) => next));
  });
  it("accepts legacy names in imported backups", () => {
    const c = { ...newCandidate(), cpmID: "CPM-1", name: "Ada" };
    const parsed = parseImport(
      JSON.stringify({
        format: "recruitdesk",
        version: 1,
        kind: "candidates",
        exportedAt: new Date().toISOString(),
        data: { candidates: [{ ...c, status: "Not looking" }] },
      }),
      "candidates",
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.data.candidates![0].status).toBe("Not open");
  });
});

describe("linkedinHref", () => {
  it("accepts web addresses and rejects other schemes", () => {
    expect(linkedinHref("linkedin.com/in/ada")).toBe(
      "https://linkedin.com/in/ada",
    );
    expect(linkedinHref(" https://www.linkedin.com/in/ada ")).toBe(
      "https://www.linkedin.com/in/ada",
    );
    expect(linkedinHref("javascript:alert(1)")).toBe("");
    expect(linkedinHref("")).toBe("");
    expect(linkedinHref(undefined)).toBe("");
  });
});

describe("clearAllData", () => {
  it("removes every record and restores default settings", async () => {
    const { people } = await seedForClear();
    expect(people.length).toBeGreaterThan(0);
    await clearAllData();
    const data = await getDataset();
    expect(data.candidates).toHaveLength(0);
    expect(data.jobs).toHaveLength(0);
    expect(data.companies).toHaveLength(0);
    expect(data.applications).toHaveLength(0);
    expect(data.settings.theme).toBe("system");
  });
});
async function seedForClear() {
  const people = [{ ...newCandidate(), cpmID: "CPM-X", name: "X" }];
  for (const c of people) await createEntity("candidates", c);
  await createEntity("jobs", { ...newJob(), title: "Job" });
  return { people };
}
