import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { db, initializeDB, getDataset } from "../src/lib/db";
import {
  parseImport,
  prepareImport,
  applyImport,
  exportData,
} from "../src/lib/transfer";
import {
  candidateStatuses,
  jobStatuses,
  stages,
  channels,
} from "../src/lib/types";

const input = readFileSync(
  new URL("../samples/recruitdesk-full-sample.json", import.meta.url),
  "utf8",
);
beforeEach(async () => {
  await db.delete();
  await initializeDB();
});
afterEach(async () => {
  await db.delete();
});

describe("complete fictional sample workspace", () => {
  it("covers every entity, profile kind, stage and contact channel with valid relationships", async () => {
    const parsed = parseImport(input, "workspace");
    expect(parsed.errors).toEqual([]);
    const plan = await prepareImport(parsed);
    expect(plan).toMatchObject({ errors: [], added: 80, updated: 1 });
    await applyImport(plan, true);
    const data = await getDataset();
    expect(data.candidates).toHaveLength(24);
    expect(data.companies).toHaveLength(8);
    expect(data.jobs).toHaveLength(12);
    expect(data.applications).toHaveLength(36);
    expect(data.settings).toMatchObject({
      workspaceName: "Sample recruiting workspace",
      theme: "system",
      defaultPage: "candidates",
    });
    expect(new Set(data.candidates.map((c) => c.status))).toEqual(
      new Set(candidateStatuses),
    );
    expect(new Set(data.jobs.map((j) => j.status))).toEqual(
      new Set(jobStatuses),
    );
    expect(new Set(data.jobs.map((j) => j.workMode))).toEqual(
      new Set(["Remote", "Hybrid", "On-site", "Other"]),
    );
    expect(new Set(data.jobs.map((j) => j.priority))).toEqual(
      new Set(["Low", "Normal", "High", "Urgent"]),
    );
    expect(new Set(data.applications.map((a) => a.stage))).toEqual(
      new Set(stages),
    );
    expect(
      new Set(
        data.candidates.flatMap((c) =>
          c.contacts.map((contact) => contact.channel),
        ),
      ),
    ).toEqual(new Set(channels));
    const candidateIds = new Set(data.candidates.map((c) => c.id));
    const jobIds = new Set(data.jobs.map((j) => j.id));
    const companyIds = new Set(data.companies.map((c) => c.id));
    const vendorHeaders = [
      "Issue Type",
      "Issue key",
      "Issue id",
      "Summary",
      "Custom field (Years of experience)",
      "Custom field (Skill Set)",
      "Custom field (Country/ City)",
      "Status",
      "Assignee",
      "Assignee Id",
      "Custom field (Sourcer)",
      "Custom field (Sourcer)Id",
      "Updated",
      "Due date",
    ];
    for (const c of data.candidates) {
      expect(c.id.startsWith("sample-full-")).toBe(true);
      expect(c.email.endsWith("@example.invalid")).toBe(true);
      expect(c.phone).toContain("SAMPLE ONLY");
      expect(new Set(c.entries.map((e) => e.type))).toEqual(
        new Set(["Experience", "Education", "Certificate", "Project", "Other"]),
      );
      expect(Object.keys(c.vendorData).sort()).toEqual(
        vendorHeaders.slice().sort(),
      );
      expect(c.vendorData["Issue key"]).toBe(c.cpmID);
      expect(c.expectation.length).toBeGreaterThan(0);
      expect(c.customFields).toHaveLength(2);
    }
    for (const j of data.jobs) expect(companyIds.has(j.companyId)).toBe(true);
    const pairs = new Set<string>();
    for (const a of data.applications) {
      expect(candidateIds.has(a.candidateId)).toBe(true);
      expect(jobIds.has(a.jobId)).toBe(true);
      pairs.add(`${a.candidateId}/${a.jobId}`);
      expect(a.history.at(-1)?.stage).toBe(a.stage);
      expect(
        a.history.every((h, i) => i === 0 || h.date > a.history[i - 1].date),
      ).toBe(true);
      expect(a.history.every((h) => h.date <= a.updatedAt)).toBe(true);
      if (["Hired", "Rejected", "Withdrawn"].includes(a.stage))
        expect(a.followUp).toBe("");
    }
    expect(pairs.size).toBe(36);
    expect(
      data.candidates.some(
        (c) =>
          data.applications.filter((a) => a.candidateId === c.id).length > 1,
      ),
    ).toBe(true);
    expect(
      data.jobs.every(
        (j) => data.applications.filter((a) => a.jobId === j.id).length > 1,
      ),
    ).toBe(true);
    for (const date of ["2026-10-15", "2026-10-17", "2026-10-20"])
      expect(data.applications.some((a) => a.followUp === date)).toBe(true);
  });

  it("round-trips all collections and reimports as updates without duplicate records", async () => {
    await applyImport(
      await prepareImport(parseImport(input, "workspace")),
      true,
    );
    const before = await getDataset();
    const exported = parseImport(await exportData("workspace"), "workspace");
    expect(exported.errors).toEqual([]);
    expect(exported.data).toEqual(before);
    const repeat = await prepareImport(parseImport(input, "workspace"));
    expect(repeat).toMatchObject({ errors: [], added: 0, updated: 81 });
    expect(await applyImport(repeat, true)).toEqual({ added: 0, updated: 81 });
    const after = await getDataset();
    for (const kind of [
      "candidates",
      "companies",
      "jobs",
      "applications",
    ] as const) {
      expect(after[kind].map((r) => r.id).sort()).toEqual(
        before[kind].map((r) => r.id).sort(),
      );
      expect(after[kind].every((r) => r.revision === 1)).toBe(true);
    }
    expect(
      parseImport(await exportData("workspace"), "workspace").errors,
    ).toEqual([]);
    await db.delete();
    await initializeDB();
    await applyImport(await prepareImport(exported), true);
    const restored = await getDataset();
    for (const kind of [
      "candidates",
      "companies",
      "jobs",
      "applications",
    ] as const)
      expect(restored[kind]).toEqual(before[kind]);
  });
});
