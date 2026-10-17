import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { Confirm } from "./ui/confirm";
import { useAutosave } from "./autosave";
import { bulkPatch, bulkRemove } from "../lib/bulk";
import { downloadText, toCSV } from "../lib/csv";
import type { Selection } from "../lib/selection";
import type { EntityMap } from "../lib/types";

type Kind = "jobs" | "applications";

/** Set one field, export, or delete the selected jobs or applications. */
export function BulkActions<K extends Kind>({
  kind,
  noun,
  selection,
  records,
  field,
  fieldLabel,
  options,
  csv,
}: {
  kind: K;
  noun: string;
  selection: Selection;
  records: EntityMap[K][];
  field: keyof EntityMap[K] & string;
  fieldLabel: string;
  options: readonly string[];
  csv: (record: EntityMap[K]) => Record<string, string | number>;
}) {
  const { flush } = useAutosave();
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const chosen = () => records.filter((r) => selection.selected.has(r.id));
  async function apply(next: string) {
    if (!next || busy || !(await flush())) return;
    setBusy(true);
    try {
      const picked = chosen();
      const undo = await bulkPatch(kind, picked, {
        [field]: next,
      } as Partial<EntityMap[K]>);
      toast.success(`${picked.length} moved to ${next}`, {
        action: {
          label: "Undo",
          onClick: () => void undo().catch((e) => toast.error(e.message)),
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    const count = selection.count;
    const failed = await bulkRemove(kind, [...selection.selected]);
    setBusy(false);
    setDeleting(false);
    selection.clear();
    if (failed) toast.error(`${failed} could not be deleted`);
    else toast.success(`${count} ${noun} deleted`);
  }
  return (
    <>
      <Select
        label={`Set ${fieldLabel} for selected`}
        value=""
        disabled={busy}
        options={[{ value: "", label: `Set ${fieldLabel}…` }, ...options]}
        onChange={(v) => void apply(v)}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const picked = chosen();
          downloadText(
            toCSV(picked.map(csv)),
            `recruitdesk-${kind}-${new Date().toISOString().slice(0, 10)}.csv`,
            "text/csv;charset=utf-8",
          );
          toast.success(`Exported ${picked.length} ${noun}`);
        }}
      >
        <FileSpreadsheet size={14} />
        Export CSV
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="danger-text"
        onClick={() => setDeleting(true)}
      >
        <Trash2 size={14} />
        Delete
      </Button>
      <Confirm
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${selection.count} ${noun}?`}
        description={
          kind === "jobs"
            ? "The jobs and their applications are removed from this browser. This cannot be undone."
            : "These applications are removed from this browser. This cannot be undone."
        }
        onConfirm={() => void remove()}
        busy={busy}
      />
    </>
  );
}
