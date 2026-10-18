import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import * as storageModule from "../src/lib/db";
import { db, initializeDB, getDataset, createEntity } from "../src/lib/db";
import {
  newCandidate,
  newJob,
  newCompany,
  newApplication,
} from "../src/lib/types";
import {
  parseVendorCSV,
  parseImport,
  prepareImport,
  applyImport,
  exportData,
  MAX_IMPORT_BYTES,
  MAX_ENTITY_RECORDS,
} from "../src/lib/transfer";

beforeEach(async () => {
  await db.delete();
  await initializeDB();
});
afterEach(() => vi.restoreAllMocks());
const csv = (id = "CPM-1", name = "Ada") =>
  `Issue key,Summary,YOE,Skill Set,Country/ City\n${id},${name},7,TypeScript,London`;
describe("import boundaries", () => {
  it("preserves exact vendor columns and handles BOM, commas, and multiline quotes", () => {
    const parsed = parseVendorCSV(
      '\uFEFFIssue key,Summary,YOE,Skill Set,Country/ City,Extra\nCPM-1,"Ada, Lovelace",7,"TypeScript, React",London,"one\ntwo"',
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.data.candidates![0]).toMatchObject({
      cpmID: "CPM-1",
      name: "Ada, Lovelace",
      source: "Vendor CSV",
      skills: ["TypeScript", "React"],
      vendorData: { Extra: "one\ntwo" },
    });
  });
  it("maps the vendor LinkedIn custom field to linkedinURL", () => {
    const parsed = parseVendorCSV(
      "Issue key,Summary,Custom field (LinkedIn)\nCPM-1,Ada, https://linkedin.com/in/ada \nCPM-2,Bob,",
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.data.candidates!.map((c) => c.linkedinURL)).toEqual([
      "https://linkedin.com/in/ada",
      "",
    ]);
  });
  it("rejects missing/duplicate headers, malformed and blank rows without writes", async () => {
    for (const input of [
      "Summary\nAda",
      "Issue key,Summary,Summary\n1,A,B",
      "Issue key,Summary\n,Ada",
      "Issue key,Summary\n1,A,extra",
      'Issue key,Summary\n1,"unterminated',
    ]) {
      const plan = await prepareImport(parseVendorCSV(input));
      expect(plan.errors.length).toBeGreaterThan(0);
      await expect(applyImport(plan, true)).rejects.toThrow();
    }
    expect(await db.candidates.count()).toBe(0);
  });
  it("rejects duplicates in an incoming file case-insensitively", async () => {
    const plan = await prepareImport(
      parseVendorCSV("Issue key,Summary\nCPM-1,A\ncpm-1,B"),
    );
    expect(plan.errors.join(" ")).toContain("Duplicate");
    await expect(applyImport(plan, true)).rejects.toThrow();
    expect(await db.candidates.count()).toBe(0);
  });
  it("requires explicit confirmation, matches CPM case-insensitively, preserves existing identity", async () => {
    const first = await prepareImport(parseVendorCSV(csv()));
    await applyImport(first, false);
    const before = (await getDataset()).candidates[0];
    const plan = await prepareImport(
      parseVendorCSV(csv("cpm-1", "Updated Ada")),
    );
    expect(plan).toMatchObject({ added: 0, updated: 1, errors: [] });
    await expect(applyImport(plan, false)).rejects.toThrow("Confirm");
    expect((await getDataset()).candidates[0].name).toBe("Ada");
    await applyImport(plan, true);
    expect((await getDataset()).candidates[0]).toMatchObject({
      id: before.id,
      name: "Updated Ada",
      revision: 1,
    });
  });
  it("fails closed if any data changed after the preview", async () => {
    const plan = await prepareImport(parseVendorCSV(csv()));
    await createEntity("companies", { ...newCompany(), name: "New company" });
    await expect(applyImport(plan, false)).rejects.toThrow("Workspace changed");
    expect(await db.candidates.count()).toBe(0);
  });
  it("rejects unsupported versions, invalid timestamps, enum values and unknown fields", async () => {
    const c = { ...newCandidate(), cpmID: "CPM-1", name: "Ada" };
    const envelope = {
      format: "recruitdesk",
      version: 1,
      kind: "candidates",
      exportedAt: new Date().toISOString(),
      data: { candidates: [c] },
    };
    for (const invalid of [
      { ...envelope, version: 2 },
      { ...envelope, data: { candidates: [{ ...c, status: "invalid" }] } },
      { ...envelope, data: { candidates: [{ ...c, createdAt: "bad" }] } },
      { ...envelope, unexpected: true },
    ]) {
      const parsed = parseImport(JSON.stringify(invalid), "candidates");
      expect(parsed.errors.length).toBeGreaterThan(0);
      await expect(
        applyImport(await prepareImport(parsed), true),
      ).rejects.toThrow();
    }
    expect(await db.candidates.count()).toBe(0);
  });
  it("exports and imports workspace links and settings, and provides portable job bundles", async () => {
    const c = { ...newCandidate(), cpmID: "CPM-1", name: "Ada" },
      co = { ...newCompany(), name: "Acme" };
    const j = { ...newJob(), title: "Engineer", companyId: co.id };
    const a = newApplication(c.id, j.id);
    await createEntity("candidates", c);
    await createEntity("companies", co);
    await createEntity("jobs", j);
    await createEntity("applications", a);
    const original = await getDataset();
    const json = await exportData("workspace");
    const jobs = await exportData("jobs");
    const candidates = await exportData("candidates");
    expect(Object.keys(JSON.parse(candidates).data)).toEqual(["candidates"]);
    expect(JSON.parse(jobs).data.companies).toHaveLength(1);
    await db.delete();
    await initializeDB();
    const plan = await prepareImport(parseImport(json, "workspace"));
    expect(plan.errors).toEqual([]);
    await applyImport(plan, true);
    const restored = await getDataset();
    expect(restored.candidates).toEqual(original.candidates);
    expect(restored.applications).toEqual(original.applications);
    expect(restored.jobs).toEqual(original.jobs);
  });
  it("rejects orphaned links and ambiguous candidate identities", async () => {
    const c1 = { ...newCandidate(), cpmID: "CPM-1", name: "Ada" },
      c2 = { ...newCandidate(), cpmID: "CPM-2", name: "Bob" };
    await createEntity("candidates", c1);
    await createEntity("candidates", c2);
    const env = JSON.parse(await exportData("workspace"));
    env.data.candidates = [{ ...c1, cpmID: c2.cpmID }];
    expect(
      (
        await prepareImport(parseImport(JSON.stringify(env), "workspace"))
      ).errors.join(" "),
    ).toContain("Ambiguous");
    env.data.candidates = [];
    env.data.jobs = [{ ...newJob(), title: "Orphan", companyId: "missing" }];
    const plan = await prepareImport(
      parseImport(JSON.stringify(env), "workspace"),
    );
    expect(plan.errors.join(" ")).toContain("missing company");
    await expect(applyImport(plan, true)).rejects.toThrow();
    expect(await db.jobs.count()).toBe(0);
  });
  it("remaps incoming applications when a CPM match has a different local ID", async () => {
    const local = { ...newCandidate(), cpmID: "CPM-1", name: "Local Ada" };
    await createEntity("candidates", local);
    const env = JSON.parse(await exportData("workspace"));
    const imported = { ...local, id: "imported", name: "Imported Ada" };
    const job = { ...newJob(), title: "Engineer" };
    env.data.candidates = [imported];
    env.data.jobs = [job];
    env.data.applications = [newApplication(imported.id, job.id)];
    const plan = await prepareImport(
      parseImport(JSON.stringify(env), "workspace"),
    );
    expect(plan.errors).toEqual([]);
    await applyImport(plan, true);
    expect((await getDataset()).applications[0].candidateId).toBe(local.id);
  });
  it("preserves manual fields when a vendor match is refreshed", async () => {
    const local = {
      ...newCandidate(),
      cpmID: "CPM-1",
      name: "Ada",
      notes: "Keep this note",
      email: "ada@example.com",
      skills: ["React"],
    };
    await createEntity("candidates", local);
    const plan = await prepareImport(
      parseVendorCSV("Issue key,Summary\nCPM-1,Ada Updated"),
    );
    await applyImport(plan, true);
    expect((await getDataset()).candidates[0]).toMatchObject({
      notes: local.notes,
      email: local.email,
      skills: ["React"],
      name: "Ada Updated",
    });
  });
  it("does not trust edited preview data", async () => {
    const plan = await prepareImport(parseVendorCSV(csv()));
    plan.data.candidates![0].name = "Tampered";
    await applyImport(plan, false);
    expect((await getDataset()).candidates[0].name).toBe("Ada");
  });

  it("caps vendor CSV but accepts valid native JSON beyond the CSV byte threshold", async () => {
    const json = await exportData("candidates");
    const oversized = json + " ".repeat(MAX_IMPORT_BYTES + 1);
    expect(parseImport(oversized, "candidates").errors).toEqual([]);
    const vendor = parseVendorCSV(oversized);
    expect(vendor.errors[0]).toContain("100 MiB");
    expect(vendor.data.candidates).toEqual([]);
  });
  it("enforces the vendor row bound before creating candidate profiles", () => {
    const csv =
      "Issue key,Summary\n" + "CPM-1,Ada\n".repeat(MAX_ENTITY_RECORDS + 1);
    const parsed = parseVendorCSV(csv);
    expect(parsed.errors[0]).toContain("100,000");
    expect(parsed.data.candidates).toEqual([]);
  });
  it("every supported export is valid for its corresponding import parser", async () => {
    await createEntity("candidates", {
      ...newCandidate(),
      cpmID: "CPM-UNICODE",
      name: "Nguyễn Ánh 🎉",
    });
    for (const kind of ["workspace", "candidates", "jobs"] as const) {
      const json = await exportData(kind);
      expect(parseImport(json, kind).errors).toEqual([]);
    }
  });
  it("refuses exports of records that the import schema would reject", async () => {
    const dataset = await getDataset();
    dataset.candidates = [
      {
        ...newCandidate(),
        name: "Ada",
        cpmID: "CPM-1",
        status: "Invalid status",
      },
    ];
    vi.spyOn(storageModule, "getDataset").mockResolvedValue(dataset);
    await expect(exportData("workspace")).rejects.toThrow(
      "Export cannot produce a restorable file",
    );
  });

  it("maps the complete supplied vendor header set and preserves every original column", async () => {
    const headers = [
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
    const values = [
      "Candidate",
      "CPM-88",
      "12345",
      "Nguyễn, An",
      "8",
      "React, TypeScript\nNode.js",
      "Vietnam / Ho Chi Minh City",
      "Interview",
      "Recruiter",
      "user-1",
      "Source name",
      "source-1",
      "2026-10-17 12:00",
      "2026-11-01",
    ];
    const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
    const input =
      "\uFEFF" +
      headers.map(quote).join(",") +
      "\r\n" +
      values.map(quote).join(",");
    const parsed = parseVendorCSV(input);
    expect(parsed.errors).toEqual([]);
    expect(parsed.data.candidates![0]).toMatchObject({
      cpmID: "CPM-88",
      name: "Nguyễn, An",
      yearsExperience: "8",
      skills: ["React", "TypeScript", "Node.js"],
      location: "Vietnam / Ho Chi Minh City",
      status: "Pre-qualification",
      vendorData: Object.fromEntries(headers.map((h, i) => [h, values[i]])),
    });
    const local = {
      ...newCandidate(),
      cpmID: "CPM-88",
      name: "Old name",
      status: "Not open",
      yearsExperience: "2",
      skills: ["Java"],
      location: "Old city",
      notes: "Keep manual note",
    };
    await createEntity("candidates", local);
    const plan = await prepareImport(parsed);
    expect(plan.updated).toBe(1);
    await applyImport(plan, true);
    expect((await getDataset()).candidates[0]).toMatchObject({
      id: local.id,
      yearsExperience: "8",
      skills: ["React", "TypeScript", "Node.js"],
      location: "Vietnam / Ho Chi Minh City",
      status: "Not open",
      notes: "Keep manual note",
      vendorData: { Status: "Interview" },
    });
  });
});
describe("field-by-field import preview", () => {
  it("lists changed fields and keeps the ones the user declines to overwrite", async () => {
    await applyImport(
      await prepareImport(parseVendorCSV(csv("CPM-1", "Ada"))),
      false,
    );
    const plan = await prepareImport(
      parseVendorCSV(
        "Issue key,Summary,YOE,Skill Set,Country/ City\nCPM-1,Ada L,9,TypeScript,Paris",
      ),
    );
    expect(plan.changes).toHaveLength(1);
    const fields = plan.changes[0].fields.map((f) => f.field);
    expect(fields).toEqual(expect.arrayContaining(["name", "location"]));
    const id = plan.changes[0].id;
    await applyImport(plan, true, { [id]: ["location"] });
    const [row] = (await getDataset()).candidates;
    expect(row).toMatchObject({ name: "Ada L", location: "London" });
  });
});
describe("saved views", () => {
  it("saves, replaces by name, deletes and survives a workspace export", async () => {
    await storageModule.saveView({
      page: "jobs",
      name: "Remote",
      state: { workMode: "Remote" },
    });
    await storageModule.saveView({
      page: "jobs",
      name: "remote",
      state: { workMode: "Hybrid" },
    });
    let { settings } = await getDataset();
    expect(settings.savedViews).toHaveLength(1);
    expect(settings.savedViews![0].state).toEqual({ workMode: "Hybrid" });
    const file = await exportData("workspace");
    expect(() => parseImport(file, "workspace")).not.toThrow();
    expect(parseImport(file, "workspace").errors).toEqual([]);
    await storageModule.deleteView(settings.savedViews![0].id);
    ({ settings } = await getDataset());
    expect(settings.savedViews).toEqual([]);
  });
});
