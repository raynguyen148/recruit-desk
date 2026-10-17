import { useEffect, useState } from "react";
import {
  Download,
  Upload,
  HardDrive,
  Database,
  ArrowUpRight,
} from "lucide-react";
import { PageHeading, Section, Field } from "../components/common";
import { AutoField } from "../components/autosave";
import { Select } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Confirm } from "../components/ui/confirm";
import { toast } from "sonner";
import {
  isSampleCandidate,
  isSampleCompany,
  isSampleJob,
  removeSample,
} from "../lib/sample";
import { Modal } from "../components/ui/dialog";
import { clearAllData, patchSettings } from "../lib/db";
import type { Dataset, Settings as WorkspaceSettings } from "../lib/types";
import type { ImportKind } from "../lib/transfer";

type Props = {
  data: Dataset;
  onImport: (kind: ImportKind) => void;
  onExport: (kind: "workspace" | "candidates" | "jobs") => void;
  onSample: () => void;
};
const bytes = (n: number) =>
  n < 1024 * 1024
    ? `${(n / 1024).toFixed(1)} KB`
    : n < 1024 ** 3
      ? `${(n / 1024 / 1024).toFixed(1)} MB`
      : `${(n / 1024 ** 3).toFixed(1)} GB`;
const sectionLinks = [
  ["preferences", "Preferences"],
  ["workspace-backup", "Backup & restore"],
  ["record-transfer", "Import & export"],
  ["local-storage", "Local storage"],
  ["sample-records", "Sample records"],
  ["danger-zone", "Delete all data"],
] as const;
export default function Settings({
  data,
  onImport,
  onExport,
  onSample,
}: Props) {
  const s = data.settings;
  const workspaceEmpty =
    !data.candidates.length && !data.jobs.length && !data.companies.length;
  const sampleCount =
    data.candidates.filter(isSampleCandidate).length +
    data.jobs.filter(isSampleJob).length +
    data.companies.filter(isSampleCompany).length;
  const [removingSample, setRemovingSample] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [wipeText, setWipeText] = useState("");
  const [wipeBusy, setWipeBusy] = useState(false);
  const recordCount =
    data.candidates.length +
    data.jobs.length +
    data.companies.length +
    data.applications.length;
  async function wipeAll() {
    setWipeBusy(true);
    try {
      await clearAllData();
      toast.success("All data deleted");
      setWiping(false);
      setWipeText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete data");
    } finally {
      setWipeBusy(false);
    }
  }
  async function clearSample() {
    setSampleBusy(true);
    try {
      const r = await removeSample();
      toast.success(
        `Removed ${r.candidates} candidates, ${r.jobs} jobs and ${r.companies} companies`,
      );
      setRemovingSample(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove samples");
    } finally {
      setSampleBusy(false);
    }
  }
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [storage, setStorage] = useState<{
    usage?: number;
    quota?: number;
    persistent?: boolean;
  }>({});
  const [storageMessage, setStorageMessage] = useState(
      "Checking browser storage…",
    ),
    [requesting, setRequesting] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!navigator.storage) {
          if (active)
            setStorageMessage(
              "Storage information is unavailable in this browser.",
            );
          return;
        }
        const estimate = await navigator.storage.estimate?.();
        const persistent = await navigator.storage.persisted?.();
        if (active) {
          setStorage({ ...estimate, persistent });
          setStorageMessage(
            persistent
              ? "Persistent storage is enabled. Keep regular backups too."
              : "This browser may reclaim local data. Download backups regularly.",
          );
        }
      } catch {
        if (active)
          setStorageMessage(
            "Your browser could not report its storage status.",
          );
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  async function save<K extends keyof WorkspaceSettings>(
    field: K,
    value: WorkspaceSettings[K],
  ) {
    setSaving(true);
    setError("");
    try {
      await patchSettings({ [field]: value }, { [field]: s[field] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this setting.");
    } finally {
      setSaving(false);
    }
  }
  async function persist() {
    setRequesting(true);
    try {
      if (!navigator.storage?.persist) {
        setStorageMessage(
          "Persistent storage requests are not supported in this browser.",
        );
        return;
      }
      const granted = await navigator.storage.persist();
      setStorage((old) => ({ ...old, persistent: granted }));
      setStorageMessage(
        granted
          ? "Persistent storage is enabled. This is not a backup; export your workspace regularly."
          : "The browser did not grant persistent storage. Your data remains here, but regular backups are important.",
      );
    } catch {
      setStorageMessage(
        "The browser could not complete the storage request. Try again later.",
      );
    } finally {
      setRequesting(false);
    }
  }
  return (
    <>
      <PageHeading title="Settings & data" />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {sectionLinks.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(id)?.scrollIntoView();
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="settings-content">
          <Section id="preferences" title="Your preferences">
            <div className="grid sm:grid-cols-2 gap-5">
              <AutoField
                label="Workspace name"
                normalize={(value) => value.trim()}
                value={s.workspaceName}
                onSave={(v, e) =>
                  patchSettings({ workspaceName: v }, { workspaceName: e })
                }
              />
              <Field label="Appearance">
                <Select
                  label="Appearance"
                  value={s.theme}
                  options={[
                    { value: "system", label: "Follow system" },
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                  ]}
                  disabled={saving}
                  onChange={(v) =>
                    void save("theme", v as WorkspaceSettings["theme"])
                  }
                />
              </Field>
              <Field label="Start page">
                <Select
                  label="Start page"
                  value={s.defaultPage}
                  options={[
                    { value: "today", label: "Today" },
                    { value: "candidates", label: "Candidates" },
                    { value: "jobs", label: "Jobs" },
                    { value: "applications", label: "Applications" },
                  ]}
                  disabled={saving}
                  onChange={(v) =>
                    void save(
                      "defaultPage",
                      v as WorkspaceSettings["defaultPage"],
                    )
                  }
                />
              </Field>
              <Field label="Records per page">
                <Select
                  label="Records per page"
                  value={String(s.pageSize)}
                  options={["25", "50", "100"]}
                  disabled={saving}
                  onChange={(v) => void save("pageSize", Number(v))}
                />
              </Field>
              <Field label="Table density">
                <Select
                  label="Table density"
                  value={s.density}
                  options={[
                    { value: "comfortable", label: "Comfortable" },
                    { value: "compact", label: "Compact" },
                  ]}
                  disabled={saving}
                  onChange={(v) =>
                    void save("density", v as WorkspaceSettings["density"])
                  }
                />
              </Field>
            </div>
            {error && (
              <p role="alert" className="save-error mt-3">
                {error}
              </p>
            )}
            <p role="status" className="text-xs muted mt-4">
              {saving
                ? "Saving preference…"
                : "Preferences save automatically in this browser."}
            </p>
          </Section>

          <Section
            id="workspace-backup"
            title="Workspace backup"
            action={<Database size={18} className="muted" />}
          >
            <p className="muted mb-5">
              A full backup includes candidates, jobs, companies, applications,
              and your preferences. Save it somewhere you trust.
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              <Button onClick={() => onExport("workspace")}>
                <Download size={16} />
                Download full backup
              </Button>
              <Button variant="outline" onClick={() => onImport("workspace")}>
                <Upload size={16} />
                Restore workspace JSON
              </Button>
            </div>
            <p className="text-xs muted">
              Last backup export:{" "}
              {s.lastBackup
                ? new Date(s.lastBackup).toLocaleString()
                : "No backup exported yet"}
              . An export starts a download; check that the file was saved.
            </p>
            <div className="backup-inventory">
              {[
                ["Candidates", data.candidates.length],
                ["Jobs", data.jobs.length],
                ["Companies", data.companies.length],
                ["Applications", data.applications.length],
              ].map(([label, count]) => (
                <div key={label}>
                  <strong className="text-xl font-semibold">
                    {Number(count).toLocaleString()}
                  </strong>
                  <div className="text-xs muted mt-1">{label}</div>
                </div>
              ))}
            </div>
          </Section>
          <Section id="record-transfer" title="Bring in your records">
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-lg">
                  <h4 className="font-medium">Vendor CSV</h4>
                  <p className="text-sm muted mt-1">
                    Import candidate rows from your vendor. Preview column
                    mappings and duplicates before anything changes.
                  </p>
                </div>
                <Button variant="outline" onClick={() => onImport("vendor")}>
                  <Upload size={15} />
                  Import vendor CSV
                </Button>
              </div>
              <div className="border-t border-[var(--border)] pt-5">
                <h4 className="font-medium">Recruitdesk JSON files</h4>
                <p className="text-sm muted mt-1 mb-4">
                  Move selected record types between workspaces. Candidate files
                  omit applications. Job files include their companies, without
                  applications.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onImport("candidates")}
                  >
                    Import candidates
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onExport("candidates")}
                  >
                    <Download size={14} />
                    Export candidates
                  </Button>
                  <Button variant="outline" onClick={() => onImport("jobs")}>
                    Import jobs
                  </Button>
                  <Button variant="outline" onClick={() => onExport("jobs")}>
                    <Download size={14} />
                    Export jobs
                  </Button>
                </div>
              </div>
            </div>
          </Section>
          <Section
            id="local-storage"
            title="Local storage"
            action={<HardDrive size={18} className="muted" />}
          >
            <p className="text-sm muted">
              Records stay in this browser profile on this device. There is no
              account or cloud sync. Local data and exported files are not
              encrypted by Recruitdesk; anyone with access to this browser
              profile or a backup can read them.
            </p>
            <p className="text-sm mt-4">
              {storage.usage !== undefined
                ? `${bytes(storage.usage)} used${storage.quota !== undefined ? ` of approximately ${bytes(storage.quota)} available to this site` : ""}`
                : "Storage size is unavailable."}
            </p>
            <p className="text-sm muted mt-2" role="status">
              {storageMessage}
            </p>
            {!storage.persistent && (
              <Button
                variant="outline"
                className="mt-4"
                disabled={requesting}
                onClick={() => void persist()}
              >
                {requesting ? "Requesting…" : "Request persistent storage"}
              </Button>
            )}
            <p className="text-xs muted mt-4">
              Clearing site data, deleting this browser profile, or using a
              private session can remove your records. Restore a downloaded
              backup to recover them.
            </p>
          </Section>
          <Section id="sample-records" title="Explore with sample records">
            <p className="text-sm muted mb-4">
              {workspaceEmpty
                ? "Add a small fictional dataset to try the workflow."
                : "Sample records can only be added to an empty workspace."}
            </p>
            <Button
              variant="outline"
              onClick={onSample}
              disabled={!workspaceEmpty}
            >
              Add sample records
              <ArrowUpRight size={15} />
            </Button>
            {sampleCount > 0 && (
              <>
                <Button
                  variant="outline"
                  className="ml-2"
                  onClick={() => setRemovingSample(true)}
                >
                  Remove sample records
                </Button>
                <Confirm
                  open={removingSample}
                  onOpenChange={setRemovingSample}
                  title="Remove the sample records?"
                  description="Only the fictional sample candidates, jobs and companies (and their applications) are deleted. Records you added yourself are kept."
                  onConfirm={() => void clearSample()}
                  busy={sampleBusy}
                />
              </>
            )}
          </Section>
          <Section id="danger-zone" title="Delete all data">
            <p className="text-sm muted mb-4">
              Permanently removes every candidate, job, company and application
              from this browser and resets settings. Download a backup first if
              you may need these records again.
            </p>
            <div className="danger-actions">
              <Button
                variant="outline"
                onClick={() => onExport("workspace")}
                disabled={!recordCount}
              >
                <Download size={15} />
                Back up first
              </Button>
              <Button
                variant="destructive"
                disabled={!recordCount}
                onClick={() => setWiping(true)}
              >
                Delete all data
              </Button>
            </div>
            <Modal
              open={wiping}
              onOpenChange={(v) => {
                if (!wipeBusy) {
                  setWiping(v);
                  setWipeText("");
                }
              }}
              title="Delete all data?"
              description={`This permanently deletes ${recordCount} records from this browser. It cannot be undone.`}
            >
              <div className="form-grid">
                <Field label="Type DELETE to confirm">
                  <input
                    className="input"
                    value={wipeText}
                    autoComplete="off"
                    onChange={(e) => setWipeText(e.target.value)}
                  />
                </Field>
              </div>
              <div className="dialog-actions">
                <Button
                  variant="outline"
                  disabled={wipeBusy}
                  onClick={() => onExport("workspace")}
                >
                  <Download size={15} />
                  Back up first
                </Button>
                <Button
                  variant="destructive"
                  disabled={wipeText.trim() !== "DELETE" || wipeBusy}
                  onClick={() => void wipeAll()}
                >
                  {wipeBusy ? "Deleting…" : "Delete everything"}
                </Button>
              </div>
            </Modal>
          </Section>
        </div>
      </div>
    </>
  );
}
