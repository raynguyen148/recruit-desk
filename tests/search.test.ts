import { describe, expect, it } from "vitest";
import { candidateSearchText, countBy } from "../src/lib/search";
import { newCandidate } from "../src/lib/types";

describe("candidate profile search", () => {
  const candidate = {
    ...newCandidate(),
    name: "Test Person",
    cpmID: "CPM-123",
    phone: "+84 900 123 456",
    source: "Community referral",
    entries: [
      {
        id: "certificate",
        type: "Certificate" as const,
        title: "AWS Solutions Architect",
        organization: "Amazon",
        startDate: "2025",
        endDate: "",
        notes: "Cloud networking",
      },
      {
        id: "employer",
        type: "Experience" as const,
        title: "Engineer",
        organization: "Acme Robotics",
        startDate: "2022",
        endDate: "2025",
        notes: "Warehouse systems",
      },
    ],
    customFields: [
      {
        id: "custom",
        label: "Work authorization",
        value: "Permanent resident",
      },
    ],
    contacts: [
      {
        id: "contact",
        channel: "Email",
        date: "2026-10-17",
        note: "Prefers a four-day week",
      },
    ],
  };

  it.each([
    "AWS SOLUTIONS ARCHITECT",
    "Acme Robotics",
    "cloud networking",
    "work authorization",
    "permanent resident",
    "four-day week",
    "+84 900 123 456",
    "community referral",
    "CPM-123",
  ])("finds %s inside the profile", (query) => {
    expect(candidateSearchText(candidate).includes(query.toLowerCase())).toBe(
      true,
    );
  });

  it("does not expose internal IDs or concatenate unrelated terms", () => {
    const searchable = candidateSearchText(candidate);
    expect(searchable.includes(candidate.id)).toBe(false);
    expect(searchable.includes("Amazon2025".toLowerCase())).toBe(false);
    expect(searchable.includes("not in the profile")).toBe(false);
  });
});

describe("relationship counts", () => {
  it("counts each relationship, includes terminal stages, and leaves missing groups absent", () => {
    const counts = countBy(
      [
        { candidateId: "one", stage: "Sourced" },
        { candidateId: "two", stage: "Interview" },
        { candidateId: "one", stage: "Rejected" },
      ],
      (row) => row.candidateId,
    );
    expect([...counts]).toEqual([
      ["one", 2],
      ["two", 1],
    ]);
    expect(counts.get("none") ?? 0).toBe(0);
  });
});
