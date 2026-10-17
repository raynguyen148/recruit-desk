import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, AlertCircle, Check, LoaderCircle } from "lucide-react";
import { Modal } from "./ui/dialog";
import { Button } from "./ui/button";
import {
  parseImport,
  prepareImport,
  applyImport,
  MAX_IMPORT_BYTES,
  IMPORT_LIMIT_LABEL,
  MAX_ENTITY_RECORDS,
  type ImportKind,
  type ImportPlan,
} from "../lib/transfer";
const titles: Record<ImportKind, string> = {
  vendor: "Import vendor CSV",
  workspace: "Restore workspace backup",
  candidates: "Import candidates",
  jobs: "Import jobs",
};
const mapping = [
  ["Issue key", "CPM ID"],
  ["Summary", "Candidate name"],
  ["Custom field (Years of experience)", "Years of experience"],
  ["Custom field (Skill Set)", "Skills"],
  ["Custom field (Country/ City)", "Location"],
];
export function ImportDialog({
  kind,
  onClose,
  onImported,
}: {
  kind: ImportKind;
  onClose: () => void;
  onImported: () => void;
}) {
  const [plan, setPlan] = useState<ImportPlan | null>(null),
    [filename, setFilename] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [allowUpdates, setAllowUpdates] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  async function read(file: File, confirmedLargeJSON = false) {
    setPendingFile(null);
    setError("");
    setPlan(null);
    setAllowUpdates(false);
    setFilename(file.name);
    if (
      kind !== "vendor" &&
      file.size > MAX_IMPORT_BYTES &&
      !confirmedLargeJSON
    ) {
      setPendingFile(file);
      return;
    }
    setBusy(true);
    try {
      if (kind === "vendor" && file.size > MAX_IMPORT_BYTES)
        throw new Error(`Choose a file no larger than ${IMPORT_LIMIT_LABEL}.`);
      const content = await file.text();
      const next = await prepareImport(parseImport(content, kind));
      setPlan(next);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not read this file. Please try another file.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    if (!plan) return;
    setBusy(true);
    setError("");
    try {
      const result = await applyImport(plan, allowUpdates);
      toast.success(
        `Import complete: ${result.added} added, ${result.updated} updated.`,
      );
      onImported();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Import failed. No changes were saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  const names =
    plan?.data.candidates?.map((c) => `${c.name} · ${c.cpmID}`) ??
    plan?.data.jobs?.map((j) => j.title) ??
    [];
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={titles[kind]}
      description={
        kind === "vendor"
          ? "Choose your vendor’s CSV, review the preview, then import."
          : "Choose a Recruitdesk JSON export. Review the changes before saving."
      }
      wide
    >
      <div className="space-y-5 mt-5">
        {kind === "vendor" ? (
          <div className="rounded-lg border border-[var(--border)] p-4">
            <h3 className="text-sm font-medium mb-2">CSV column mapping</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm">
              {mapping.map(([from, to]) => (
                <div key={from} className="flex justify-between gap-3">
                  <code className="text-xs">{from}</code>
                  <span className="muted">→ {to}</span>
                </div>
              ))}
            </div>
            <p className="text-xs muted mt-3">
              Issue key and Summary are required. All original columns are
              preserved. Vendor Status is kept as source data, separate from
              candidate availability. Quoted commas and multiline cells are
              supported. Up to {MAX_ENTITY_RECORDS.toLocaleString()} candidate
              rows per file.
            </p>
          </div>
        ) : (
          <p className="text-sm muted">
            {kind === "workspace"
              ? "Restore merges records and restores workspace preferences. It does not clear your existing workspace."
              : kind === "candidates"
                ? "Candidate files contain profiles only. Applications, jobs, companies, and settings are not included."
                : "Job files include referenced companies. Applications and workspace settings are not included."}
          </p>
        )}
        <div className="rounded-lg border border-dashed border-[var(--border)] p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <FileUp size={24} className="muted shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium break-all">
                {filename ||
                  `Choose a ${kind === "vendor" ? "CSV" : "JSON"} file`}
              </p>
              <p className="text-xs muted mt-1">
                Processed locally in this browser
                {kind === "vendor"
                  ? ` · Maximum ${IMPORT_LIMIT_LABEL}`
                  : " · Large JSON files require confirmation"}
              </p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-label="Import file"
            accept={
              kind === "vendor" ? ".csv,text/csv" : ".json,application/json"
            }
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void read(file);
            }}
          />
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {filename ? "Choose another file" : "Choose file"}
          </Button>
        </div>
        {pendingFile && (
          <div
            role="alert"
            className="rounded-lg border border-[var(--border)] p-4 space-y-3"
          >
            <h3 className="text-sm font-medium">Large JSON file</h3>
            <p className="text-sm muted">
              This file is larger than {IMPORT_LIMIT_LABEL}. Reading and
              validating it can use substantial memory and temporarily make this
              tab unresponsive. Browser memory limits may interrupt the process.
              Nothing will be imported until you review and confirm the preview.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void read(pendingFile, true)}>
                Read large JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPendingFile(null);
                  setFilename("");
                }}
              >
                Cancel file
              </Button>
            </div>
          </div>
        )}
        {busy && (
          <p role="status" className="flex gap-2 items-center text-sm">
            <LoaderCircle size={16} className="spin" />
            Processing locally…
          </p>
        )}
        {error && (
          <div role="alert" className="save-error flex items-start gap-2">
            <AlertCircle size={17} className="shrink-0" />
            <div>
              {error}
              <p className="mt-1">
                Choose the file again to create a fresh preview.
              </p>
            </div>
          </div>
        )}
        {plan && (
          <div className="space-y-4" aria-live="polite">
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-[var(--border)] p-4">
              <div>
                <strong className="text-2xl">
                  {plan.added.toLocaleString()}
                </strong>
                <p className="text-xs muted mt-1">New records</p>
              </div>
              <div>
                <strong className="text-2xl">
                  {plan.updated.toLocaleString()}
                </strong>
                <p className="text-xs muted mt-1">
                  Updates{kind === "workspace" ? " (including settings)" : ""}
                </p>
              </div>
            </div>
            {plan.errors.length > 0 ? (
              <div role="alert" className="save-error">
                <h3 className="font-medium">
                  Fix {plan.errors.length}{" "}
                  {plan.errors.length === 1 ? "issue" : "issues"} before
                  importing
                </h3>
                <ul className="list-disc pl-5 mt-2 space-y-1 max-h-40 overflow-auto text-sm">
                  {plan.errors.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
                <p className="text-xs mt-3">
                  Nothing has been imported. Fix the file and choose it again.
                </p>
              </div>
            ) : (
              <p className="text-sm flex gap-2 items-center">
                <Check size={16} />
                File validated. No changes have been saved yet.
              </p>
            )}
            {names.length > 0 && (
              <div>
                <h3 className="text-sm font-medium">Record preview</h3>
                <ul className="text-sm muted mt-2 space-y-1">
                  {names.slice(0, 5).map((name, i) => (
                    <li key={i} className="truncate">
                      {name}
                    </li>
                  ))}
                </ul>
                {names.length > 5 && (
                  <p className="text-xs muted mt-2">
                    And {(names.length - 5).toLocaleString()} more…
                  </p>
                )}
              </div>
            )}
            {plan.warnings.length > 0 && (
              <ul className="text-xs muted list-disc pl-4 space-y-1">
                {plan.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            )}
            {plan.updated > 0 && plan.errors.length === 0 && (
              <label className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-4 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowUpdates}
                  disabled={busy}
                  onChange={(e) => setAllowUpdates(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I confirm updating {plan.updated} existing{" "}
                  {plan.updated === 1 ? "record" : "records"}
                  {kind === "workspace"
                    ? ", including restoring workspace settings"
                    : ""}
                  .{" "}
                  {kind === "vendor"
                    ? "Mapped vendor fields will be refreshed; manual notes and profile history are kept."
                    : "Imported values will overwrite matching records."}
                </span>
              </label>
            )}
          </div>
        )}
        <div className="dialog-actions flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              busy ||
              !plan ||
              plan.errors.length > 0 ||
              Boolean(plan.updated && !allowUpdates)
            }
            onClick={() => void apply()}
          >
            {busy
              ? "Working…"
              : kind === "workspace"
                ? "Restore workspace"
                : "Import records"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
