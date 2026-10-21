import { useState, type ReactNode } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Plus,
  Trash2,
  ArrowUpRight,
  MapPin,
  Mail,
  Phone,
  Copy,
  Check,
  BriefcaseBusiness,
  Clock3,
  Linkedin,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useCopy } from "../lib/use-copy";
import { DetailModal, Modal } from "./ui/dialog";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { Confirm } from "./ui/confirm";
import { RemoveItem } from "./remove-item";
import { FlagToggle } from "./flag-toggle";
import { AutoField, safeAction, useAutosave, SaveIndicator } from "./autosave";
import { Badge, DetailTabs, Field, Section, TextInput } from "./common";
import { createEntity, patchEntity, removeEntity } from "../lib/db";
import {
  candidateStatuses,
  closedCandidateStatuses,
  type CandidateStatus,
  channels,
  newApplication,
  jobStatuses,
  stages,
  type Dataset,
  type EntityKind,
  type Candidate,
  type Job,
  type Company,
  type Application,
  type ProfileEntry,
  type CustomField,
} from "../lib/types";
import { avatarStyle, displayDate, initials, linkedinHref } from "../lib/utils";
function recordLabel(kind: EntityKind, record: unknown, data: Dataset) {
  if (kind === "candidates") return (record as Candidate).name;
  if (kind === "jobs") return (record as Job).title;
  if (kind === "companies") return (record as Company).name;
  const name = data.candidates.find(
    (c) => c.id === (record as Application).candidateId,
  )?.name;
  return name ? `application · ${name}` : "application";
}
export function Details({
  kind,
  id,
  data,
  onClose,
  onNavigate,
  onLink,
  back,
  onBack,
}: {
  kind: EntityKind;
  id: string;
  data: Dataset;
  onClose: () => void;
  onNavigate: (kind: EntityKind, id: string) => void;
  /** The record this one was opened from, if any. */
  back?: { kind: EntityKind; id: string };
  onBack?: () => void;
  onLink: (candidateId?: string, jobId?: string) => void;
}) {
  const record = data[kind].find((r) => r.id === id);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const { flush, hasAttachedDirty } = useAutosave();
  if (!record)
    return (
      <DetailModal
        open
        onOpenChange={() => onClose()}
        title="Record no longer available"
        description="It may have been deleted in another tab."
      >
        <Button onClick={onClose}>Close</Button>
      </DetailModal>
    );
  const title =
    kind === "candidates"
      ? (record as Candidate).name
      : kind === "jobs"
        ? (record as Job).title
        : kind === "companies"
          ? (record as Company).name
          : data.candidates.find(
              (c) => c.id === (record as Application).candidateId,
            )?.name || "Application";
  const backTarget = back
    ? data[back.kind].find((r) => r.id === back.id)
    : null;
  const backLabel =
    back && backTarget ? recordLabel(back.kind, backTarget, data) : null;
  const goBack = async () => {
    if ((await flush()) || !hasAttachedDirty()) onBack?.();
    else toast.error("Resolve the unsaved changes before going back.");
  };
  const close = async () => {
    if ((await flush()) || !hasAttachedDirty()) onClose();
    else toast.error("Resolve the unsaved changes before closing.");
  };
  async function deleteRecord() {
    setBusy(true);
    try {
      await removeEntity(kind, id);
      toast.success("Record deleted");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }
  return (
    <>
      <DetailModal
        open
        onOpenChange={(v) => !v && void close()}
        title={title}
        back={
          backLabel && onBack
            ? { label: backLabel, onBack: () => void goBack() }
            : undefined
        }
        description={
          kind === "candidates"
            ? `Candidate profile · ${(record as Candidate).cpmID}`
            : kind === "applications"
              ? "Application"
              : kind === "jobs"
                ? "Job"
                : "Company"
        }
      >
        <div className="detail-save-row">
          <SaveIndicator />
          <Button
            variant="ghost"
            size="sm"
            className="danger-text"
            onClick={async () => {
              if (await flush()) setConfirm(true);
              else
                toast.error(
                  "Resolve unsaved changes before deleting this record.",
                );
            }}
          >
            <Trash2 size={13} />
            Delete
          </Button>
        </div>
        {kind === "candidates" ? (
          <CandidateDetail
            candidate={record as Candidate}
            data={data}
            onNavigate={onNavigate}
            onLink={() => onLink(id, undefined)}
          />
        ) : kind === "jobs" ? (
          <JobDetail
            job={record as Job}
            data={data}
            onNavigate={onNavigate}
            onLink={() => onLink(undefined, id)}
          />
        ) : kind === "companies" ? (
          <CompanyDetail
            company={record as Company}
            data={data}
            onNavigate={onNavigate}
          />
        ) : (
          <ApplicationDetail
            application={record as Application}
            data={data}
            onNavigate={onNavigate}
          />
        )}
        <p className="record-meta">
          Created {displayDate(record.createdAt)} · Updated{" "}
          {displayDate(record.updatedAt)}
        </p>
      </DetailModal>
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${title}?`}
        description={
          kind === "companies"
            ? "A company with linked jobs cannot be deleted. Move those jobs first."
            : kind === "applications"
              ? "This removes this application and its stage history. The candidate and job will remain."
              : "This permanently removes the record and its linked applications. Export a backup first if you may need it later."
        }
        onConfirm={() => void deleteRecord()}
        busy={busy}
      />
    </>
  );
}
function CopyButton({ value, label }: { value: string; label: string }) {
  const { copied, copy } = useCopy();
  return (
    <Button
      size="sm"
      variant="ghost"
      className={copied ? "copy-button copied" : "copy-button"}
      onClick={() => void copy(value)}
    >
      {copied ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
      {copied ? "Copied" : `Copy ${label}`}
    </Button>
  );
}
/** Quick ways to reach someone from their saved (not in-progress) details. */
function ContactActions({
  email,
  phone,
  linkedin,
}: {
  email: string;
  phone: string;
  linkedin?: string;
}) {
  const e = email.trim();
  const p = phone.trim();
  const l = linkedinHref(linkedin);
  if (!e && !p && !l) return null;
  return (
    <div className="contact-actions" aria-label="Quick contact">
      {e && (
        <>
          <a className="button-link" href={`mailto:${e}`}>
            <Mail size={14} aria-hidden="true" />
            Email
          </a>
          <CopyButton value={e} label="email" />
        </>
      )}
      {l && (
        <a
          className="button-link"
          href={l}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Linkedin size={14} aria-hidden="true" />
          LinkedIn
        </a>
      )}
      {p && (
        <>
          <a className="button-link" href={`tel:${p.replace(/[^\d+]/g, "")}`}>
            <Phone size={14} aria-hidden="true" />
            Call
          </a>
          <CopyButton value={p} label="phone" />
        </>
      )}
    </div>
  );
}
/** Candidates not yet linked to the job, ranked by shared skills. */
function suggestCandidates(job: Job, data: Dataset, limit = 5) {
  const wanted = new Set(job.skills.map((s) => s.trim().toLowerCase()));
  if (!wanted.size) return [];
  const linked = new Set(
    data.applications
      .filter((a) => a.jobId === job.id)
      .map((a) => a.candidateId),
  );
  return data.candidates
    .filter(
      (c) =>
        !linked.has(c.id) &&
        !closedCandidateStatuses.includes(c.status as CandidateStatus),
    )
    .map((candidate) => ({
      candidate,
      shared: candidate.skills.filter((s) =>
        wanted.has(s.trim().toLowerCase()),
      ),
    }))
    .filter((m) => m.shared.length)
    .sort((a, b) => b.shared.length - a.shared.length)
    .slice(0, limit);
}
function CandidateDetail({
  candidate: c,
  data,
  onNavigate,
  onLink,
}: {
  candidate: Candidate;
  data: Dataset;
  onNavigate: (k: EntityKind, id: string) => void;
  onLink: () => void;
}) {
  const [entryModal, setEntryModal] = useState(false);
  const [contactModal, setContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<
    Candidate["contacts"][number] | null
  >(null);
  const [customModal, setCustomModal] = useState(false);
  const apps = data.applications.filter((a) => a.candidateId === c.id);
  const text = (key: keyof Candidate, label: string, multiline = false) => (
    <AutoField
      label={label}
      value={String(c[key] ?? "")}
      normalize={
        key === "name" || key === "cpmID" ? (value) => value.trim() : undefined
      }
      multiline={multiline}
      onSave={(v, e) =>
        patchEntity("candidates", c.id, { [key]: v }, { [key]: e })
      }
    />
  );
  return (
    <>
      <div className="profile-summary">
        <div className="avatar large" style={avatarStyle(c.name)}>
          {initials(c.name)}
        </div>
        <div>
          <strong>{c.headline || "Add a professional headline"}</strong>
          <span>
            <MapPin size={13} />
            {c.location || "Location not set"}
          </span>
        </div>
        <Badge value={c.status} />
      </div>
      <GuardedTabs initial="profile">
        <DetailTabs label="Candidate sections">
          <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
          <Tabs.Trigger value="applications">
            Applications <span>{apps.length}</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="activity">
            Contact history <span>{c.contacts.length}</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="source">Source</Tabs.Trigger>
        </DetailTabs>
        <Tabs.Content value="profile">
          <Section title="Basic information">
            <div className="form-grid">
              {text("name", "Full name")}
              {text("cpmID", "CPM ID")}
              {text("headline", "Headline")}
              <Field label="Status">
                <Select
                  label="Status"
                  value={c.status}
                  options={[...candidateStatuses]}
                  onChange={(v) =>
                    void safeAction(() =>
                      patchEntity(
                        "candidates",
                        c.id,
                        { status: v },
                        { status: c.status },
                      ),
                    )
                  }
                />
              </Field>
              {(["screened", "potential"] as const).map((flag) => (
                <Field
                  key={flag}
                  label={flag === "screened" ? "Screened" : "Potential"}
                >
                  <FlagToggle
                    icon={flag === "screened" ? "check" : "star"}
                    label={flag === "screened" ? "Screened" : "Potential"}
                    value={c[flag]}
                    onChange={(v) =>
                      void safeAction(() =>
                        patchEntity(
                          "candidates",
                          c.id,
                          { [flag]: v },
                          { [flag]: c[flag] },
                        ),
                      )
                    }
                  />
                </Field>
              ))}
              {text("email", "Email")}
              {text("phone", "Phone")}
              {text("linkedinURL", "LinkedIn URL")}
              {text("location", "Location")}
              {text("yearsExperience", "Years of experience")}
            </div>
            <ContactActions
              email={c.email}
              phone={c.phone}
              linkedin={c.linkedinURL}
            />
          </Section>
          <Section title="Skills & expectations">
            <AutoField
              label="Skills (comma-separated)"
              value={c.skills.join(", ")}
              onSave={(v, e) =>
                patchEntity(
                  "candidates",
                  c.id,
                  {
                    skills: v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                  {
                    skills: e
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                )
              }
            />
            {text("salary", "Expected salary & currency")}
            {text("expectation", "Candidate expectations", true)}
            {text("notes", "Private notes", true)}
          </Section>
          <Section
            title="Experience & credentials"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEntryModal(true)}
              >
                <Plus size={14} />
                Add entry
              </Button>
            }
          >
            {c.entries.length === 0 ? (
              <p className="empty-inline">
                Add experience, education, certificates, projects, or something
                unique.
              </p>
            ) : (
              c.entries.map((entry) => (
                <div className="profile-entry" key={entry.id}>
                  <div className="entry-heading">
                    <span className="tag">{entry.type}</span>
                    <RemoveItem
                      label={`Remove ${entry.title}`}
                      title={entry.title || "profile entry"}
                      onRemove={() =>
                        patchEntity(
                          "candidates",
                          c.id,
                          {
                            entries: c.entries.filter((e) => e.id !== entry.id),
                          },
                          { entries: c.entries },
                        )
                      }
                    />
                  </div>
                  <div className="form-grid">
                    {(
                      [
                        "title",
                        "organization",
                        "startDate",
                        "endDate",
                        "notes",
                      ] as const
                    ).map((key) => (
                      <AutoField
                        key={key}
                        label={
                          {
                            title: "Title",
                            organization: "Organization",
                            startDate: "Start / issued date",
                            endDate: "End / expiry date",
                            notes: "Details",
                          }[key]
                        }
                        value={entry[key]}
                        onSave={(v, e) => {
                          const expected = c.entries.map((x) =>
                            x.id === entry.id ? { ...x, [key]: e } : x,
                          );
                          return patchEntity(
                            "candidates",
                            c.id,
                            {
                              entries: expected.map((x) =>
                                x.id === entry.id ? { ...x, [key]: v } : x,
                              ),
                            },
                            { entries: expected },
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </Section>
          <Section
            title="Additional fields"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCustomModal(true)}
              >
                <Plus size={14} />
                Add field
              </Button>
            }
          >
            <CustomFields
              fields={c.customFields}
              onChange={(next, expected) =>
                patchEntity(
                  "candidates",
                  c.id,
                  { customFields: next },
                  { customFields: expected },
                )
              }
            />
          </Section>
        </Tabs.Content>
        <Tabs.Content value="applications">
          <Section
            title="Linked applications"
            action={
              <Button size="sm" onClick={onLink}>
                <Plus size={14} />
                Link job
              </Button>
            }
          >
            {apps.length ? (
              apps.map((a) => (
                <button
                  className="linked-row"
                  key={a.id}
                  onClick={() => onNavigate("applications", a.id)}
                >
                  <BriefcaseBusiness size={17} />
                  <div>
                    <strong>
                      {data.jobs.find((j) => j.id === a.jobId)?.title}
                    </strong>
                    <small>{a.nextAction || "No next action set"}</small>
                  </div>
                  <Badge value={a.stage} />
                  <ArrowUpRight size={14} />
                </button>
              ))
            ) : (
              <p className="empty-inline">
                No applications yet. Link a job to start a hiring journey.
              </p>
            )}
          </Section>
        </Tabs.Content>
        <Tabs.Content value="activity">
          <Section
            title="Contact history"
            action={
              <Button size="sm" onClick={() => setContactModal(true)}>
                <Plus size={14} />
                Log contact
              </Button>
            }
          >
            {c.contacts.length ? (
              [...c.contacts]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((contact) => (
                  <div className="timeline-row" key={contact.id}>
                    <span className="timeline-dot" />
                    <div>
                      <strong>{contact.channel}</strong>
                      <time>{displayDate(contact.date)}</time>
                      <p>{contact.note || "No notes added"}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit contact entry"
                      onClick={() => setEditingContact(contact)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <RemoveItem
                      label="Remove contact entry"
                      title="contact entry"
                      onRemove={() =>
                        patchEntity(
                          "candidates",
                          c.id,
                          {
                            contacts: c.contacts.filter(
                              (x) => x.id !== contact.id,
                            ),
                          },
                          { contacts: c.contacts },
                        )
                      }
                    />
                  </div>
                ))
            ) : (
              <p className="empty-inline">
                Log the channel, date, and outcome of each conversation.
              </p>
            )}
          </Section>
        </Tabs.Content>
        <Tabs.Content value="source">
          <Section title="Source & provenance">
            {text("source", "Source")}
            <p className="field-help">
              Vendor fields are preserved as imported. Candidate availability is
              separate from the vendor's issue status.
            </p>
            {Object.entries(c.vendorData).map(([key, value]) => (
              <div className="source-row" key={key}>
                <span>{key}</span>
                <strong>{value || "—"}</strong>
              </div>
            ))}
            {!Object.keys(c.vendorData).length && (
              <p className="empty-inline">
                This candidate has no vendor import data.
              </p>
            )}
          </Section>
        </Tabs.Content>
      </GuardedTabs>
      {entryModal && (
        <EntryForm
          onClose={() => setEntryModal(false)}
          onSave={async (entry) => {
            await patchEntity(
              "candidates",
              c.id,
              { entries: [...c.entries, entry] },
              { entries: c.entries },
            );
            setEntryModal(false);
          }}
        />
      )}
      {(contactModal || editingContact) && (
        <ContactForm
          initial={editingContact ?? undefined}
          onClose={() => {
            setContactModal(false);
            setEditingContact(null);
          }}
          onSave={async (contact) => {
            const exists = c.contacts.some((x) => x.id === contact.id);
            await patchEntity(
              "candidates",
              c.id,
              {
                contacts: exists
                  ? c.contacts.map((x) => (x.id === contact.id ? contact : x))
                  : [...c.contacts, contact],
              },
              { contacts: c.contacts },
            );
            setContactModal(false);
            setEditingContact(null);
          }}
        />
      )}
      {customModal && (
        <CustomForm
          onClose={() => setCustomModal(false)}
          onSave={async (field) => {
            await patchEntity(
              "candidates",
              c.id,
              { customFields: [...c.customFields, field] },
              { customFields: c.customFields },
            );
            setCustomModal(false);
          }}
        />
      )}
    </>
  );
}
function JobDetail({
  job: j,
  data,
  onNavigate,
  onLink,
}: {
  job: Job;
  data: Dataset;
  onNavigate: (k: EntityKind, id: string) => void;
  onLink: () => void;
}) {
  const [custom, setCustom] = useState(false);
  const apps = data.applications.filter((a) => a.jobId === j.id);
  const suggestions = suggestCandidates(j, data);
  const link = (candidateId: string) =>
    safeAction(
      () => createEntity("applications", newApplication(candidateId, j.id)),
      "Candidate linked",
    );
  const text = (key: keyof Job, label: string, multiline = false) => (
    <AutoField
      label={label}
      value={String(j[key] ?? "")}
      normalize={key === "title" ? (value) => value.trim() : undefined}
      multiline={multiline}
      onSave={(v, e) => patchEntity("jobs", j.id, { [key]: v }, { [key]: e })}
    />
  );
  const select = (
    key: keyof Job,
    label: string,
    options: (string | { value: string; label: string })[],
  ) => (
    <Field label={label}>
      <Select
        label={label}
        value={String(j[key])}
        options={options}
        onChange={(v) =>
          void safeAction(() =>
            patchEntity("jobs", j.id, { [key]: v }, { [key]: j[key] }),
          )
        }
      />
    </Field>
  );
  return (
    <>
      <GuardedTabs initial="overview">
        <DetailTabs label="Job sections">
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="candidates">
            Candidates <span>{apps.length}</span>
          </Tabs.Trigger>
        </DetailTabs>
        <Tabs.Content value="overview">
          <Section title="Job information">
            <div className="form-grid">
              {text("title", "Job title")}
              {select("companyId", "Company", [
                { value: "", label: "Not assigned" },
                ...data.companies.map((c) => ({ value: c.id, label: c.name })),
              ])}
              {select("status", "Job status", [...jobStatuses])}
              {select("priority", "Priority", [
                "Low",
                "Normal",
                "High",
                "Urgent",
              ])}
              {text("location", "Location")}
              {text("salary", "Salary range & currency")}
              {select("employmentType", "Employment type", [
                "Full-time",
                "Part-time",
                "Contract",
                "Freelance",
                "Internship",
                "Temporary",
                "Other",
              ])}
              {select("workMode", "Work mode", [
                "Remote",
                "Hybrid",
                "On-site",
                "Other",
              ])}
            </div>
          </Section>
          <Section title="Role & requirements">
            {text("description", "Job description", true)}
            <AutoField
              label="Skills (comma-separated)"
              value={j.skills.join(", ")}
              onSave={(v, e) =>
                patchEntity(
                  "jobs",
                  j.id,
                  {
                    skills: v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                  {
                    skills: e
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                )
              }
            />
            {text("notes", "Private notes", true)}
          </Section>
          <Section
            title="Additional fields"
            action={
              <Button variant="ghost" size="sm" onClick={() => setCustom(true)}>
                <Plus size={14} />
                Add field
              </Button>
            }
          >
            <CustomFields
              fields={j.customFields}
              onChange={(next, expected) =>
                patchEntity(
                  "jobs",
                  j.id,
                  { customFields: next },
                  { customFields: expected },
                )
              }
            />
          </Section>
        </Tabs.Content>
        <Tabs.Content value="candidates">
          <Section
            title="Candidates for this job"
            action={
              <Button size="sm" onClick={onLink}>
                <Plus size={14} />
                Link candidate
              </Button>
            }
          >
            {apps.length ? (
              apps.map((a) => (
                <button
                  className="linked-row"
                  key={a.id}
                  onClick={() => onNavigate("applications", a.id)}
                >
                  {(() => {
                    const name =
                      data.candidates.find((c) => c.id === a.candidateId)
                        ?.name || "";
                    return (
                      <span className="avatar small" style={avatarStyle(name)}>
                        {initials(name)}
                      </span>
                    );
                  })()}
                  <div>
                    <strong>
                      {
                        data.candidates.find((c) => c.id === a.candidateId)
                          ?.name
                      }
                    </strong>
                    <small>{a.nextAction || "No next action"}</small>
                  </div>
                  <Badge value={a.stage} />
                  <ArrowUpRight size={14} />
                </button>
              ))
            ) : (
              <p className="empty-inline">
                Link candidates to track their progress for this role.
              </p>
            )}
          </Section>
          {suggestions.length > 0 && (
            <Section title="Suggested candidates">
              {suggestions.map(({ candidate: c, shared }) => (
                <div className="linked-row suggestion" key={c.id}>
                  <span className="avatar small" style={avatarStyle(c.name)}>
                    {initials(c.name)}
                  </span>
                  <div>
                    <strong>{c.name}</strong>
                    <small>Matches {shared.join(", ")}</small>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Link ${c.name}`}
                    onClick={() => void link(c.id)}
                  >
                    Link
                  </Button>
                </div>
              ))}
            </Section>
          )}
        </Tabs.Content>
      </GuardedTabs>
      {custom && (
        <CustomForm
          onClose={() => setCustom(false)}
          onSave={async (field) => {
            await patchEntity(
              "jobs",
              j.id,
              { customFields: [...j.customFields, field] },
              { customFields: j.customFields },
            );
            setCustom(false);
          }}
        />
      )}
    </>
  );
}
function CompanyDetail({
  company: c,
  data,
  onNavigate,
}: {
  company: Company;
  data: Dataset;
  onNavigate: (k: EntityKind, id: string) => void;
}) {
  return (
    <>
      <Section title="Company information">
        <div className="form-grid">
          {(
            [
              "name",
              "industry",
              "location",
              "website",
              "contactName",
              "email",
              "phone",
            ] as const
          ).map((key) => (
            <AutoField
              key={key}
              label={
                {
                  name: "Company name",
                  industry: "Industry",
                  location: "Location",
                  website: "Website",
                  contactName: "Primary contact",
                  email: "Contact email",
                  phone: "Contact phone",
                }[key]
              }
              value={c[key]}
              normalize={key === "name" ? (value) => value.trim() : undefined}
              onSave={(v, e) =>
                patchEntity("companies", c.id, { [key]: v }, { [key]: e })
              }
            />
          ))}
        </div>
        <ContactActions email={c.email} phone={c.phone} />
        <AutoField
          label="Private notes"
          multiline
          value={c.notes}
          onSave={(v, e) =>
            patchEntity("companies", c.id, { notes: v }, { notes: e })
          }
        />
      </Section>
      <Section title="Company jobs">
        {data.jobs
          .filter((j) => j.companyId === c.id)
          .map((j) => (
            <button
              className="linked-row"
              key={j.id}
              onClick={() => onNavigate("jobs", j.id)}
            >
              <BriefcaseBusiness size={17} />
              <strong>{j.title}</strong>
              <Badge value={j.status} />
              <ArrowUpRight size={14} />
            </button>
          ))}
        {!data.jobs.some((j) => j.companyId === c.id) && (
          <p className="empty-inline">
            Assign this company when creating or editing a job.
          </p>
        )}
      </Section>
    </>
  );
}
function ApplicationDetail({
  application: a,
  data,
  onNavigate,
}: {
  application: Application;
  data: Dataset;
  onNavigate: (k: EntityKind, id: string) => void;
}) {
  const candidate = data.candidates.find((c) => c.id === a.candidateId);
  const job = data.jobs.find((j) => j.id === a.jobId);
  return (
    <>
      <div className="application-pair">
        <button onClick={() => onNavigate("candidates", a.candidateId)}>
          <span className="avatar" style={avatarStyle(candidate?.name || "")}>
            {initials(candidate?.name || "")}
          </span>
          <div>
            <small>Candidate</small>
            <strong>{candidate?.name}</strong>
          </div>
          <ArrowUpRight size={14} />
        </button>
        <button onClick={() => onNavigate("jobs", a.jobId)}>
          <BriefcaseBusiness size={22} />
          <div>
            <small>Job</small>
            <strong>{job?.title}</strong>
          </div>
          <ArrowUpRight size={14} />
        </button>
      </div>
      <Section title="Hiring journey">
        <Field label="Stage">
          <Select
            label="Application stage"
            value={a.stage}
            options={[...stages]}
            onChange={(v) =>
              void safeAction(() =>
                patchEntity(
                  "applications",
                  a.id,
                  { stage: v },
                  { stage: a.stage },
                ),
              )
            }
          />
        </Field>
        <AutoField
          label="Next action"
          value={a.nextAction}
          onSave={(v, e) =>
            patchEntity(
              "applications",
              a.id,
              { nextAction: v },
              { nextAction: e },
            )
          }
        />
        <AutoField
          label="Follow-up date"
          type="date"
          value={a.followUp.slice(0, 10)}
          onSave={(v, e) =>
            patchEntity(
              "applications",
              a.id,
              { followUp: v },
              { followUp: a.followUp.slice(0, 10) === e ? a.followUp : e },
            )
          }
        />
        <AutoField
          label="Application notes"
          multiline
          value={a.notes}
          onSave={(v, e) =>
            patchEntity("applications", a.id, { notes: v }, { notes: e })
          }
        />
      </Section>
      <Section title="Stage history">
        {[...a.history].reverse().map((h) => (
          <div className="timeline-row" key={h.id}>
            <span className="timeline-dot" />
            <div>
              <strong>{h.stage}</strong>
              <time>{displayDate(h.date)}</time>
              <p>{h.note}</p>
            </div>
          </div>
        ))}
        {!a.history.length && (
          <p className="empty-inline">
            Stage changes will appear here automatically.
          </p>
        )}
      </Section>
    </>
  );
}
function EntryForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (entry: ProfileEntry) => Promise<void>;
}) {
  const [entry, setEntry] = useState<ProfileEntry>({
    id: crypto.randomUUID(),
    type: "Experience",
    title: "",
    organization: "",
    startDate: "",
    endDate: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open
      onOpenChange={(v) => !v && !busy && onClose()}
      title="Add profile entry"
      description="Keep a flexible record of experience, education, and achievements."
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await safeAction(() => onSave(entry));
          setBusy(false);
        }}
      >
        <div className="form-stack">
          <Field label="Entry type">
            <Select
              label="Entry type"
              value={entry.type}
              options={[
                "Experience",
                "Education",
                "Certificate",
                "Project",
                "Other",
              ]}
              onChange={(v) =>
                setEntry({ ...entry, type: v as ProfileEntry["type"] })
              }
            />
          </Field>
          {(
            ["title", "organization", "startDate", "endDate", "notes"] as const
          ).map((key) => (
            <TextInput
              key={key}
              label={
                {
                  title: "Title",
                  organization: "Organization",
                  startDate: "Start / issued date",
                  endDate: "End / expiry date",
                  notes: "Details",
                }[key]
              }
              value={entry[key]}
              onChange={(v) => setEntry({ ...entry, [key]: v })}
              required={key === "title"}
            />
          ))}
        </div>
        <div className="dialog-actions">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button disabled={busy}>Add entry</Button>
        </div>
      </form>
    </Modal>
  );
}
function ContactForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: Candidate["contacts"][number];
  onClose: () => void;
  onSave: (contact: Candidate["contacts"][number]) => Promise<void>;
}) {
  const [channel, setChannel] = useState(initial?.channel ?? "Email");
  const [date, setDate] = useState(
    initial?.date ?? new Date().toLocaleDateString("en-CA"),
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open
      onOpenChange={(v) => !v && !busy && onClose()}
      title={initial ? "Edit conversation" : "Log a conversation"}
      description="Capture where you connected and what matters for the next conversation."
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await safeAction(() =>
            onSave({
              id: initial?.id ?? crypto.randomUUID(),
              channel,
              date,
              note,
            }),
          );
          setBusy(false);
        }}
      >
        <div className="form-stack">
          <Field label="Channel">
            <Select
              label="Channel"
              value={channel}
              options={[...channels]}
              onChange={setChannel}
            />
          </Field>
          <TextInput
            label="Contact date"
            type="date"
            required
            value={date}
            onChange={setDate}
          />
          <Field label="Conversation notes">
            <textarea
              aria-label="Conversation notes"
              className="input"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
          <Button disabled={busy}>
            {initial ? "Save changes" : "Log contact"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function CustomForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (f: CustomField) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open
      onOpenChange={(v) => !v && !busy && onClose()}
      title="Add a custom field"
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await safeAction(() =>
            onSave({ id: crypto.randomUUID(), label: label.trim(), value }),
          );
          setBusy(false);
        }}
      >
        <div className="form-stack">
          <TextInput
            label="Field name"
            value={label}
            onChange={setLabel}
            required
            placeholder="e.g. Notice period"
          />
          <TextInput label="Value" value={value} onChange={setValue} />
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
          <Button disabled={busy || !label.trim()}>Add field</Button>
        </div>
      </form>
    </Modal>
  );
}
function CustomFields({
  fields,
  onChange,
}: {
  fields: CustomField[];
  onChange: (next: CustomField[], expected: CustomField[]) => Promise<void>;
}) {
  return fields.length ? (
    <div className="custom-fields">
      {fields.map((f) => (
        <div className="custom-field" key={f.id}>
          <AutoField
            label={f.label}
            value={f.value}
            onSave={(v, e) => {
              const expected = fields.map((x) =>
                x.id === f.id ? { ...x, value: e } : x,
              );
              return onChange(
                expected.map((x) => (x.id === f.id ? { ...x, value: v } : x)),
                expected,
              );
            }}
          />
          <RemoveItem
            label={`Remove ${f.label} field`}
            title={`${f.label} field`}
            onRemove={() =>
              onChange(
                fields.filter((x) => x.id !== f.id),
                fields,
              )
            }
          />
        </div>
      ))}
    </div>
  ) : (
    <p className="empty-inline">
      Add your own fields, such as notice period, language, or relocation
      preferences.
    </p>
  );
}

function GuardedTabs({
  initial,
  children,
}: {
  initial: string;
  children: ReactNode;
}) {
  const [tab, setTab] = useState(initial);
  const { flush } = useAutosave();
  return (
    <Tabs.Root
      value={tab}
      onValueChange={async (next) => {
        if (await flush()) setTab(next);
        else toast.error("Resolve unsaved changes before switching sections.");
      }}
    >
      {children}
    </Tabs.Root>
  );
}
