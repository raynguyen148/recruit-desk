import type { Candidate } from "./types";

/** Search the recruiter's editable profile data, including flexible fields. */
export function candidateSearchText(candidate: Candidate): string {
  return [
    candidate.name,
    candidate.cpmID,
    candidate.email,
    candidate.phone,
    candidate.headline,
    candidate.location,
    ...candidate.skills,
    candidate.notes,
    candidate.expectation,
    candidate.source,
    ...candidate.entries.flatMap((entry) => [
      entry.type,
      entry.title,
      entry.organization,
      entry.startDate,
      entry.endDate,
      entry.notes,
    ]),
    ...candidate.customFields.flatMap((field) => [field.label, field.value]),
    ...candidate.contacts.flatMap((contact) => [contact.channel, contact.note]),
  ]
    .join(" ")
    .toLowerCase();
}

export function countBy<T>(
  rows: readonly T[],
  key: (row: T) => string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = key(row);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}
