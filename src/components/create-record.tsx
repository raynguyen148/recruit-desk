import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "./ui/dialog";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { Field, TextInput } from "./common";
import { createEntity } from "../lib/db";
import {
  newCandidate,
  newJob,
  newCompany,
  newApplication,
  type Dataset,
  type EntityKind,
} from "../lib/types";
export function CreateRecord({
  kind,
  data,
  onClose,
  onCreated,
  candidateId = "",
  jobId = "",
}: {
  kind: EntityKind;
  data: Dataset;
  onClose: () => void;
  onCreated: (id: string) => void;
  candidateId?: string;
  jobId?: string;
}) {
  const [name, setName] = useState("");
  const [cpmID, setCpmID] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [candidate, setCandidate] = useState(candidateId);
  const [job, setJob] = useState(jobId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const singular = {
    candidates: "candidate",
    jobs: "job",
    companies: "company",
    applications: "application",
  }[kind];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let id = "";
      if (kind === "candidates") {
        const r = {
          ...newCandidate(),
          name: name.trim(),
          cpmID: cpmID.trim(),
          email: email.trim(),
        };
        await createEntity(kind, r);
        id = r.id;
      } else if (kind === "jobs") {
        const r = { ...newJob(), title: name.trim(), companyId: company };
        await createEntity(kind, r);
        id = r.id;
      } else if (kind === "companies") {
        const r = { ...newCompany(), name: name.trim() };
        await createEntity(kind, r);
        id = r.id;
      } else {
        const r = newApplication(candidate, job);
        await createEntity(kind, r);
        id = r.id;
      }
      toast.success(`${singular[0].toUpperCase() + singular.slice(1)} created`);
      onCreated(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create record");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(v) => !v && !busy && onClose()}
      title={`New ${singular}`}
      description={
        kind === "applications"
          ? "Connect one candidate with one job. Each pairing has its own hiring process."
          : "Start with the essentials. Add the rest in the detail panel."
      }
    >
      <form onSubmit={submit}>
        <div className="form-stack">
          {kind === "applications" ? (
            <>
              <Field label="Candidate">
                <Select
                  label="Candidate"
                  value={candidate}
                  onChange={setCandidate}
                  options={[
                    { value: "", label: "Choose a candidate" },
                    ...data.candidates.map((c) => ({
                      value: c.id,
                      label: `${c.name} · ${c.cpmID}`,
                    })),
                  ]}
                />
              </Field>
              <Field label="Job">
                <Select
                  label="Job"
                  value={job}
                  onChange={setJob}
                  options={[
                    { value: "", label: "Choose a job" },
                    ...data.jobs.map((j) => ({ value: j.id, label: j.title })),
                  ]}
                />
              </Field>
            </>
          ) : (
            <TextInput
              label={
                kind === "jobs"
                  ? "Job title"
                  : kind === "companies"
                    ? "Company name"
                    : "Full name"
              }
              value={name}
              onChange={setName}
              required
            />
          )}
          {kind === "candidates" && (
            <>
              <TextInput
                label="CPM ID"
                value={cpmID}
                onChange={setCpmID}
                required
                placeholder="e.g. CPM-1024"
              />
              <p className="field-help">
                Required, unique ID linking this person to your main recruiting
                system.
              </p>
              <TextInput
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
              />
            </>
          )}
          {kind === "jobs" && (
            <Field label="Company">
              <Select
                label="Company"
                value={company}
                onChange={setCompany}
                options={[
                  { value: "", label: "Not assigned" },
                  ...data.companies.map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
                ]}
              />
            </Field>
          )}
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
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
          <Button
            type="submit"
            disabled={busy || (kind === "applications" && (!candidate || !job))}
          >
            {busy ? "Creating…" : `Create ${singular}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
