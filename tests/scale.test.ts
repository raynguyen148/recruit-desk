import "fake-indexeddb/auto";
import { afterEach, expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { db, initializeDB, getDataset, createEntity } from "../src/lib/db";
import {
  parseVendorCSV,
  prepareImport,
  applyImport,
  exportData,
  parseImport,
} from "../src/lib/transfer";
import { newCompany, newJob, newApplication } from "../src/lib/types";

afterEach(async () => {
  await db.delete();
});
it("preserves 10,000 vendor profiles and relational workspace backup through a fresh restore", async () => {
  await db.delete();
  await initializeDB();
  const timings: Record<string, number> = {};
  let start = performance.now();
  const header =
    "Issue Type,Issue key,Issue id,Summary,Custom field (Years of experience),Custom field (Skill Set),Custom field (Country/ City),Status,Assignee,Assignee Id,Custom field (Sourcer),Custom field (Sourcer)Id,Updated,Due date";
  const csv = [
    header,
    ...Array.from(
      { length: 10_000 },
      (_, i) =>
        `Candidate,CPM-${i},${100000 + i},"Candidate ${i}, Nguyễn",${i % 20},"TypeScript, React",Vietnam,Interview,Recruiter,user-1,Referral,source-1,2026-10-17,2026-11-01`,
    ),
  ].join("\n");
  const parsed = parseVendorCSV(csv);
  expect(parsed.errors).toEqual([]);
  timings.parse = performance.now() - start;
  start = performance.now();
  const initial = await prepareImport(parsed);
  expect(initial).toMatchObject({ added: 10_000, updated: 0, errors: [] });
  timings.preview = performance.now() - start;
  start = performance.now();
  await applyImport(initial, false);
  timings.apply = performance.now() - start;
  const data = await getDataset();
  expect(data.candidates).toHaveLength(10_000);
  expect(new Set(data.candidates.map((c) => c.cpmID)).size).toBe(10_000);
  for (const index of [0, 4999, 9999])
    expect(
      data.candidates.find((c) => c.cpmID === `CPM-${index}`),
    ).toMatchObject({
      name: `Candidate ${index}, Nguyễn`,
      yearsExperience: String(index % 20),
      skills: ["TypeScript", "React"],
      location: "Vietnam",
      status: "Pre-qualification",
      vendorData: {
        Status: "Interview",
        "Issue id": String(100000 + index),
        "Custom field (Sourcer)": "Referral",
      },
    });
  // Reparse to create different incoming IDs: identity must still match CPM IDs.
  start = performance.now();
  const repeated = await prepareImport(parseVendorCSV(csv));
  expect(repeated).toMatchObject({ added: 0, updated: 10_000, errors: [] });
  timings.duplicatePreviewIncludingParse = performance.now() - start;
  const company = { ...newCompany(), name: "Scale verification company" };
  await createEntity("companies", company);
  const job = {
    ...newJob(),
    title: "TypeScript engineer",
    companyId: company.id,
  };
  await createEntity("jobs", job);
  await createEntity(
    "applications",
    newApplication(data.candidates[0].id, job.id),
  );
  start = performance.now();
  const backup = await exportData("workspace");
  timings.export = performance.now() - start;
  start = performance.now();
  const restoreInput = parseImport(backup, "workspace");
  expect(restoreInput.errors).toEqual([]);
  timings.parseBackup = performance.now() - start;
  await db.delete();
  await initializeDB();
  start = performance.now();
  const restore = await prepareImport(restoreInput);
  expect(restore.errors).toEqual([]);
  await applyImport(restore, true);
  timings.freshRestore = performance.now() - start;
  const restored = await getDataset();
  expect(restored.candidates).toHaveLength(10_000);
  expect(restored.companies[0].id).toBe(company.id);
  expect(restored.jobs[0].companyId).toBe(company.id);
  expect(restored.applications[0]).toMatchObject({
    candidateId: data.candidates[0].id,
    jobId: job.id,
  });
  expect(
    restored.candidates.find((c) => c.id === data.candidates[0].id),
  ).toEqual(data.candidates[0]);
  console.info(
    "10,000-profile local fake-indexeddb verification (milliseconds, not a performance SLA):",
    Object.fromEntries(
      Object.entries(timings).map(([k, v]) => [k, Math.round(v)]),
    ),
    `backupBytes=${new TextEncoder().encode(backup).byteLength}`,
  );
}, 30_000);
