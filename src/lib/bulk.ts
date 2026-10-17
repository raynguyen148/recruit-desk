import { createEntity, patchEntity, removeEntity } from "./db";
import { newApplication, type EntityKind, type EntityMap } from "./types";

type Patch<K extends EntityKind> = Partial<EntityMap[K]>;

/** Apply one patch to many records; the returned function puts the old values back. */
export async function bulkPatch<K extends EntityKind>(
  kind: K,
  records: EntityMap[K][],
  patch: Patch<K>,
): Promise<() => Promise<void>> {
  const keys = Object.keys(patch) as (keyof EntityMap[K])[];
  const before = new Map(
    records.map((r) => [
      r.id,
      Object.fromEntries(keys.map((k) => [k, r[k]])) as Patch<K>,
    ]),
  );
  for (const r of records)
    await patchEntity(kind, r.id, patch, before.get(r.id) as Patch<K>);
  return async () => {
    for (const [id, old] of before) await patchEntity(kind, id, old, patch);
  };
}

export async function bulkRemove(kind: EntityKind, ids: Iterable<string>) {
  let failed = 0;
  for (const id of ids) {
    try {
      await removeEntity(kind, id);
    } catch {
      failed += 1;
    }
  }
  return failed;
}

/** Link every candidate to the job, skipping pairs that already exist. */
export async function bulkLink(
  candidateIds: string[],
  jobId: string,
  existing: { candidateId: string; jobId: string }[],
) {
  const linked = new Set(
    existing.filter((a) => a.jobId === jobId).map((a) => a.candidateId),
  );
  let created = 0;
  for (const id of candidateIds) {
    if (linked.has(id)) continue;
    await createEntity("applications", newApplication(id, jobId));
    created += 1;
  }
  return { created, skipped: candidateIds.length - created };
}
