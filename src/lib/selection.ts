import { useCallback, useMemo, useState } from "react";

/** Row selection that quietly drops ids which no longer match the current list. */
export function useSelection(ids: readonly string[]) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const selected = useMemo(() => {
    const live = new Set(ids);
    return new Set([...picked].filter((id) => live.has(id)));
  }, [picked, ids]);
  const toggle = useCallback(
    (id: string) =>
      setPicked((old) => {
        const next = new Set(old);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    [],
  );
  const setMany = useCallback(
    (list: readonly string[], on: boolean) =>
      setPicked((old) => {
        const next = new Set(old);
        for (const id of list) on ? next.add(id) : next.delete(id);
        return next;
      }),
    [],
  );
  const clear = useCallback(() => setPicked(new Set()), []);
  const selectAll = useCallback(() => setPicked(new Set(ids)), [ids]);
  return { selected, count: selected.size, toggle, setMany, clear, selectAll };
}
export type Selection = ReturnType<typeof useSelection>;
