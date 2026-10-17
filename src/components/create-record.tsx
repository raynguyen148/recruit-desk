import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal } from "./ui/dialog";
import { Button } from "./ui/button";
import { Combobox } from "./ui/combobox";
import { Field, TextInput } from "./common";
import { createEntity } from "../lib/db";
import { fold } from "../lib/search";
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
  const linked = useMemo(
    () => new Set(data.applications.map((a) => `${a.candidateId}:${a.jobId}`)),
    [data.applications],
  );
  // Hide choices that would create an application which already exists.
  const candidateOptions = data.candidates
    .filter((c) => !job || !linked.has(`${c.id}:${job}`))
    .map((c) => ({ value: c.id, label: c.name, hint: c.cpmID }));
  const jobOptions = data.jobs
    .filter((j) => !candidate || !linked.has(`${candidate}:${j.id}`))
    .map((j) => ({
      value: j.id,
      label: j.title,
      hint: data.companies.find((c) => c.id === j.companyId)?.name,
    }));
  const duplicates = useMemo(() => {
    if (kind !== "candidates") return [];
    const foldedName = fold(name.trim()).replace(/\s+/g, " ");
    const mail = email.trim().toLowerCase();
    return data.candidates
      .filter(
        (c) =>
          (foldedName.length >= 3 &&
            fold(c.name).replace(/\s+/g, " ") === foldedName) ||
          (!!mail && c.email.trim().toLowerCase() === mail),
      )
      .slice(0, 3);
  }, [kind, name, email, data.candidates]);
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
          ? "Link one candidate to one job."
          : "Start with the essentials; add the rest later."
      }
    >
      <form onSubmit={submit}>
        <div className="form-stack">
          {kind === "applications" ? (
            <>
              <Field label="Candidate">
                <Combobox
                  label="Candidate"
                  value={candidate}
                  onChange={(v) => {
                    setCandidate(v);
                    if (linked.has(`${v}:${job}`)) setJob("");
                  }}
                  options={candidateOptions}
                  placeholder="Search candidates…"
                />
              </Field>
              <Field label="Job">
                <Combobox
                  label="Job"
                  value={job}
                  onChange={(v) => {
                    setJob(v);
                    if (linked.has(`${candidate}:${v}`)) setCandidate("");
                  }}
                  options={jobOptions}
                  placeholder="Search jobs…"
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
              <Combobox
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
          {duplicates.length > 0 && (
            <p className="warning-banner" role="status">
              Possible duplicate:{" "}
              {duplicates.map((c) => `${c.name} (${c.cpmID})`).join(", ")}. You
              can still create this candidate.
            </p>
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
