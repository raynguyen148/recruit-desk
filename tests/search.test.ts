import { describe, expect, it } from "vitest";
import {
  candidateSearchText,
  countBy,
  matchesTerms,
  searchTerms,
} from "../src/lib/search";
import { initials } from "../src/lib/utils";
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

describe("query matching", () => {
  const text = candidateSearchText({
    ...newCandidate(),
    name: "Nguyễn Văn An",
    headline: "Senior React Engineer",
    location: "Đà Nẵng",
  });
  it("requires every term but not in order or adjacent", () => {
    expect(matchesTerms(text, searchTerms("engineer react"))).toBe(true);
    expect(matchesTerms(text, searchTerms("react   senior"))).toBe(true);
    expect(matchesTerms(text, searchTerms("react python"))).toBe(false);
  });
  it("ignores Vietnamese diacritics in both directions", () => {
    expect(matchesTerms(text, searchTerms("nguyen van"))).toBe(true);
    expect(matchesTerms(text, searchTerms("đà nẵng"))).toBe(true);
    expect(matchesTerms(text, searchTerms("da nang"))).toBe(true);
  });
  it("treats an empty query as no filter", () => {
    expect(searchTerms("   ")).toEqual([]);
  });
});

describe("initials", () => {
  it("uses the first and last word", () => {
    expect(initials("Nguyễn Văn An")).toBe("NA");
    expect(initials("Ada")).toBe("A");
    expect(initials("  ")).toBe("?");
  });
});
