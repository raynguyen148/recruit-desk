import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "./ui/dialog";
import { Button } from "./ui/button";
import { Combobox } from "./ui/combobox";
import { Field } from "./common";
import { bulkLink } from "../lib/bulk";
import type { Dataset } from "../lib/types";

/** Pick one job and add every selected candidate to it in one step. */
export function LinkJobDialog({
  data,
  candidateIds,
  onClose,
  onDone,
}: {
  data: Dataset;
  candidateIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [job, setJob] = useState("");
  const [busy, setBusy] = useState(false);
  const companies = new Map(data.companies.map((c) => [c.id, c.name]));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { created, skipped } = await bulkLink(
        candidateIds,
        job,
        data.applications,
      );
      toast.success(
        `Added ${created} to the job${skipped ? `, ${skipped} already linked` : ""}`,
      );
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(v) => !v && !busy && onClose()}
      title="Add to job"
      description={`${candidateIds.length} selected ${candidateIds.length === 1 ? "candidate" : "candidates"}`}
    >
      <form onSubmit={submit}>
        <div className="form-stack">
          <Field label="Job">
            <Combobox
              label="Job to add to"
              value={job}
              onChange={setJob}
              placeholder="Search jobs…"
              options={data.jobs.map((j) => ({
                value: j.id,
                label: j.title,
                hint: companies.get(j.companyId),
              }))}
            />
          </Field>
        </div>
        <div className="dialog-actions">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !job}>
            {busy ? "Adding…" : "Add to job"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
