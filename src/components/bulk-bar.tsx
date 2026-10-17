import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import type { Selection } from "../lib/selection";

export function RowCheck({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <input
      type="checkbox"
      className="row-check"
      checked={checked}
      aria-label={label}
      onChange={onChange}
    />
  );
}

/** Header checkbox that selects or clears everything on the visible page. */
export function PageCheck({
  pageIds,
  selection,
}: {
  pageIds: readonly string[];
  selection: Selection;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const chosen = pageIds.filter((id) => selection.selected.has(id)).length;
  const all = pageIds.length > 0 && chosen === pageIds.length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = chosen > 0 && !all;
  }, [chosen, all]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="row-check"
      checked={all}
      aria-label="Select all rows on this page"
      onChange={() => selection.setMany(pageIds, !all)}
    />
  );
}

export function BulkBar({
  selection,
  total,
  noun,
  children,
}: {
  selection: Selection;
  total: number;
  noun: string;
  children: ReactNode;
}) {
  if (!selection.count) return null;
  return (
    <div className="bulk-bar" role="region" aria-label="Bulk actions">
      <strong>
        {selection.count} {noun} selected
      </strong>
      {selection.count < total && (
        <Button variant="ghost" size="sm" onClick={selection.selectAll}>
          Select all {total.toLocaleString()}
        </Button>
      )}
      <div className="bulk-actions">{children}</div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Clear selection"
        onClick={selection.clear}
      >
        <X size={15} />
      </Button>
    </div>
  );
}
