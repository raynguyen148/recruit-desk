import type { Candidate } from "./types";

/** Lowercase and strip diacritics so "Nguyễn" matches "nguyen" (đ has no decomposition). */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

/** Split a query into folded terms; a record must contain every term. */
export function searchTerms(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean);
}

export function matchesTerms(haystack: string, terms: readonly string[]) {
  return terms.every((term) => haystack.includes(term));
}

/** Folded, space-joined text for matching against `searchTerms`. */
export function searchable(parts: readonly (string | undefined)[]): string {
  return fold(parts.filter(Boolean).join(" "));
}

/** Search the recruiter's editable profile data, including flexible fields. */
export function candidateSearchText(candidate: Candidate): string {
  return searchable([
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
  ]);
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
