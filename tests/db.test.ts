import "fake-indexeddb/auto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as first from "../src/lib/db";
import {
  newCandidate,
  newJob,
  newCompany,
  newApplication,
} from "../src/lib/types";

let second: typeof first;
beforeEach(async () => {
  if (second) second.db.close();
  await first.db.delete();
  await first.initializeDB();
  vi.resetModules();
  second = await import("../src/lib/db");
  await second.initializeDB();
});
afterAll(async () => {
  second.db.close();
  await first.db.delete();
});
async function candidate(cpmID = "CPM-1") {
  const record = { ...newCandidate(), name: "Ada", cpmID };
  await first.createEntity("candidates", record);
  return record;
}
async function job() {
  const record = { ...newJob(), title: "Engineer" };
  await first.createEntity("jobs", record);
  return record;
}
describe("transactional local storage", () => {
  it("normalizes CPM IDs and rejects case-insensitive duplicates across connections", async () => {
    await candidate("  CPM-1  ");
    await expect(
      second.createEntity("candidates", {
        ...newCandidate(),
        name: "Grace",
        cpmID: "cpm-1",
      }),
    ).rejects.toThrow("already exists");
    expect((await first.getDataset()).candidates).toHaveLength(1);
    expect((await first.getDataset()).candidates[0].cpmID).toBe("CPM-1");
    expect((await first.getDataset()).candidates[0]).not.toHaveProperty(
      "cpmKey",
    );
  });
  it("serializes simultaneous duplicate creation from two tabs", async () => {
    const results = await Promise.allSettled([
      first.createEntity("candidates", {
        ...newCandidate(),
        name: "Ada",
        cpmID: "CPM-1",
      }),
      second.createEntity("candidates", {
        ...newCandidate(),
        name: "Grace",
        cpmID: "cpm-1",
      }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect((await first.getDataset()).candidates).toHaveLength(1);
  });
  it("merges independent concurrent fields and detects stale same-field updates", async () => {
    const record = await candidate();
    await Promise.all([
      first.patchEntity(
        "candidates",
        record.id,
        { name: "Ada Lovelace" },
        { name: "Ada" },
      ),
      second.patchEntity(
        "candidates",
        record.id,
        { location: "London" },
        { location: "" },
      ),
    ]);
    expect(await first.db.candidates.get(record.id)).toMatchObject({
      name: "Ada Lovelace",
      location: "London",
      revision: 3,
    });
    const results = await Promise.allSettled([
      first.patchEntity(
        "candidates",
        record.id,
        { notes: "First tab" },
        { notes: "" },
      ),
      second.patchEntity(
        "candidates",
        record.id,
        { notes: "Second tab" },
        { notes: "" },
      ),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === "rejected"),
    ).toMatchObject({ reason: { name: "ConflictError" } });
  });
  it("rejects invalid names, references and duplicate applications without writes", async () => {
    await expect(
      first.createEntity("candidates", newCandidate()),
    ).rejects.toThrow();
    await expect(
      first.createEntity("jobs", {
        ...newJob(),
        title: "Engineer",
        companyId: "missing",
      }),
    ).rejects.toThrow("company");
    await expect(
      first.createEntity("applications", newApplication("missing", "missing")),
    ).rejects.toThrow("candidate");
    const c = await candidate(),
      j = await job();
    await first.createEntity("applications", newApplication(c.id, j.id));
    await expect(
      second.createEntity("applications", newApplication(c.id, j.id)),
    ).rejects.toThrow("already has");
    expect((await first.getDataset()).applications).toHaveLength(1);
  });
  it("rejects malformed nested data and undefined required fields without modifying records", async () => {
    const c = await candidate();
    await expect(
      first.patchEntity(
        "candidates",
        c.id,
        { skills: undefined },
        { skills: [] },
      ),
    ).rejects.toThrow("Invalid candidates data");
    await expect(
      first.createEntity("candidates", {
        ...newCandidate(),
        name: "Grace",
        cpmID: "CPM-2",
        contacts: [
          {
            id: "contact",
            channel: "Email",
            date: "",
            note: 42 as unknown as string,
          },
        ],
      }),
    ).rejects.toThrow("Invalid candidates data");
    const data = await first.getDataset();
    expect(data.candidates).toHaveLength(1);
    expect(data.candidates[0]).toMatchObject({ skills: [], revision: 1 });
  });
  it("protects lifecycle metadata and appends immutable stage history", async () => {
    const c = await candidate(),
      j = await job(),
      app = newApplication(c.id, j.id);
    await first.createEntity("applications", app);
    const original = (await first.db.applications.get(app.id))!;
    await first.patchEntity(
      "applications",
      app.id,
      {
        stage: "Interview",
        createdAt: "bad",
        id: "bad",
        revision: -1,
        history: [],
      },
      { stage: "Sourced" },
    );
    const updated = (await first.db.applications.get(app.id))!;
    expect(updated).toMatchObject({
      id: app.id,
      createdAt: original.createdAt,
      revision: 2,
      stage: "Interview",
    });
    expect(updated.history.map((entry) => entry.stage)).toEqual([
      "Sourced",
      "Interview",
    ]);
  });
  it("blocks linked-company deletion and cascades candidate/job deletion atomically", async () => {
    const company = { ...newCompany(), name: "Acme" };
    await first.createEntity("companies", company);
    const j = { ...newJob(), title: "Engineer", companyId: company.id };
    await first.createEntity("jobs", j);
    const c = await candidate();
    await first.createEntity("applications", newApplication(c.id, j.id));
    await expect(first.removeEntity("companies", company.id)).rejects.toThrow(
      "jobs",
    );
    await first.removeEntity("candidates", c.id);
    expect((await first.getDataset()).applications).toEqual([]);
    const c2 = await candidate("CPM-2");
    await first.createEntity("applications", newApplication(c2.id, j.id));
    await second.removeEntity("jobs", j.id);
    const data = await first.getDataset();
    expect(data.applications).toEqual([]);
    expect(data.candidates).toHaveLength(1);
    await first.removeEntity("companies", company.id);
    expect((await first.getDataset()).companies).toEqual([]);
  });
  it("allows a consistent dataset read inside an import transaction", async () => {
    await first.db.transaction("rw", first.db.tables, async () => {
      const data = await first.getDataset();
      expect(data.settings.id).toBe("workspace");
    });
  });
  it("cannot leave an orphan when another tab deletes a candidate during application creation", async () => {
    const c = await candidate(),
      j = await job();
    await Promise.allSettled([
      first.createEntity("applications", newApplication(c.id, j.id)),
      second.removeEntity("candidates", c.id),
    ]);
    const data = await first.getDataset();
    expect(data.candidates).toEqual([]);
    expect(data.applications).toEqual([]);
  });
  it("keeps local values exportable at transfer limits and rejects oversized writes atomically", async () => {
    const { exportData, parseImport } = await import("../src/lib/transfer");
    const c = await candidate();
    await first.patchEntity(
      "candidates",
      c.id,
      {
        headline: "h".repeat(1000),
        notes: "n".repeat(100000),
        skills: Array.from({ length: 500 }, (_, i) => `skill-${i}`),
      },
      { headline: "", notes: "", skills: [] },
    );
    const before = await first.getDataset();
    expect(
      parseImport(await exportData("workspace"), "workspace").errors,
    ).toEqual([]);
    await expect(
      first.patchEntity("candidates", c.id, { headline: "h".repeat(1001) }, {}),
    ).rejects.toThrow("Invalid candidates data");
    await expect(
      first.patchEntity("candidates", c.id, { notes: "n".repeat(100001) }, {}),
    ).rejects.toThrow("Invalid candidates data");
    await expect(
      first.patchEntity(
        "candidates",
        c.id,
        { skills: Array(501).fill("skill") },
        {},
      ),
    ).rejects.toThrow("Invalid candidates data");
    await expect(
      first.patchEntity(
        "candidates",
        c.id,
        {
          customFields: [
            { id: "field", label: "label", value: "v".repeat(100001) },
          ],
        },
        {},
      ),
    ).rejects.toThrow("Invalid candidates data");
    await expect(
      first.patchSettings({ workspaceName: "w".repeat(1001) }),
    ).rejects.toThrow("1000");
    expect(await first.getDataset()).toEqual(before);
  });
  it("allows edits after importing offset timestamps and retains backup compatibility", async () => {
    const { exportData, parseImport, prepareImport, applyImport } =
      await import("../src/lib/transfer");
    const c = await candidate();
    const envelope = JSON.parse(await exportData("workspace"));
    envelope.data.candidates[0].createdAt = "2026-10-17T10:00:00+07:00";
    envelope.data.candidates[0].updatedAt = "2026-10-17T10:00:00+07:00";
    envelope.data.candidates[0].id = "imported-offset";
    envelope.data.candidates[0].cpmID = "CPM-OFFSET";
    envelope.data.settings.lastBackup = "2026-10-17T10:00:00+07:00";
    const parsed = parseImport(JSON.stringify(envelope), "workspace");
    expect(parsed.errors).toEqual([]);
    await applyImport(await prepareImport(parsed), true);
    await first.patchEntity(
      "candidates",
      "imported-offset",
      { notes: "Editable" },
      { notes: "" },
    );
    await first.patchSettings({ density: "compact" });
    expect((await first.db.candidates.get("imported-offset"))?.createdAt).toBe(
      "2026-10-17T10:00:00+07:00",
    );
    expect((await first.db.candidates.get("imported-offset"))?.notes).toBe(
      "Editable",
    );
    expect(
      parseImport(await exportData("workspace"), "workspace").errors,
    ).toEqual([]);
    expect(await first.db.candidates.get(c.id)).toBeDefined();
  });
});
