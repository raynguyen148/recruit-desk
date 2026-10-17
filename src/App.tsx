import { Component, useEffect, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Toaster, toast } from "sonner";
import {
  Users,
  BriefcaseBusiness,
  Building2,
  GitPullRequestArrow,
  Settings2,
  ShieldCheck,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Database,
  ArrowDownToLine,
  Sun,
  Moon,
  LoaderCircle,
} from "lucide-react";
import { getDataset, initializeDB, patchSettings } from "./lib/db";
import { exportData } from "./lib/transfer";
import { loadSample } from "./lib/sample";
import type { EntityKind } from "./lib/types";
import { usePageMotion } from "./lib/use-page-motion";
import { Button } from "./components/ui/button";
import {
  AutosaveProvider,
  useAutosave,
  SaveIndicator,
} from "./components/autosave";
import { CreateRecord } from "./components/create-record";
import { Details } from "./components/details";
import { ImportDialog } from "./components/import-dialog";
import Candidates from "./pages/candidates";
import { Jobs, Companies, Applications } from "./pages/records";
import Settings from "./pages/settings";
type Page = EntityKind | "settings";
type ImportKind = "vendor" | "workspace" | "candidates" | "jobs";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    return this.state.error ? (
      <div className="startup">
        <h1>Unable to open Recruitdesk</h1>
        <p>{this.state.error}</p>
        <p>
          Your stored data has not been cleared. Reload the app to try again.
        </p>
        <Button onClick={() => location.reload()}>Reload app</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <AutosaveProvider>
        <Workspace />
      </AutosaveProvider>
    </ErrorBoundary>
  );
}
function Workspace() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const data = useLiveQuery(() => getDataset(), []);
  const [page, setPage] = useState<Page>("candidates");
  const [navInitialized, setNavInitialized] = useState(false);
  const [selected, setSelected] = useState<{
    kind: EntityKind;
    id: string;
  } | null>(null);
  const [create, setCreate] = useState<{
    kind: EntityKind;
    candidateId?: string;
    jobId?: string;
  } | null>(null);
  const [importKind, setImportKind] = useState<ImportKind | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sampleBusy, setSampleBusy] = useState(false);
  const { flush } = useAutosave();
  const pageContentRef = usePageMotion(page, ready && !!data);
  useEffect(() => {
    initializeDB()
      .then(() => setReady(true))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (data && !navInitialized) {
      const hash = location.hash.slice(1);
      setPage(
        [
          "candidates",
          "jobs",
          "companies",
          "applications",
          "settings",
        ].includes(hash)
          ? (hash as Page)
          : data.settings.defaultPage,
      );
      setNavInitialized(true);
    }
  }, [data, navInitialized]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark =
        data?.settings.theme === "dark" ||
        ((data?.settings.theme ?? "system") === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#141d2a" : "#f7f9fc");
      setTheme(dark ? "dark" : "light");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [data?.settings.theme]);
  async function navigate(next: Page) {
    if (await flush()) {
      setPage(next);
      if (next !== page) window.scrollTo({ top: 0, behavior: "instant" });
      history.replaceState(null, "", `#${next}`);
    } else toast.error("Resolve unsaved changes before leaving this page.");
  }
  async function open(kind: EntityKind, id: string) {
    if (await flush()) setSelected({ kind, id });
    else toast.error("Resolve unsaved changes before opening another record.");
  }
  async function showImport(kind: ImportKind) {
    if (await flush()) setImportKind(kind);
    else toast.error("Resolve unsaved changes before importing.");
  }
  async function download(kind: "workspace" | "candidates" | "jobs") {
    if (!(await flush())) {
      toast.error("Resolve unsaved changes before exporting.");
      return;
    }
    try {
      const text = await exportData(kind);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recruitdesk-${kind}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (kind === "workspace")
        await patchSettings({ lastBackup: new Date().toISOString() });
      toast.success(
        "Backup download prepared. Keep the JSON file somewhere safe.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }
  async function sample() {
    setSampleBusy(true);
    try {
      await loadSample();
      toast.success("Fictional sample workspace added");
      await navigate("candidates");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add sample data");
    } finally {
      setSampleBusy(false);
    }
  }
  if (error)
    return (
      <div className="startup">
        <Database size={35} />
        <h1>Browser storage is unavailable</h1>
        <p>{error}</p>
        <p>
          Enable browser storage and reopen the app. No data has been cleared.
        </p>
        <Button onClick={() => location.reload()}>Try again</Button>
      </div>
    );
  if (!ready || !data)
    return (
      <div className="startup">
        <LoaderCircle className="spin" size={28} />
        <p>Opening your local workspace…</p>
      </div>
    );
  const links = [
    {
      key: "candidates" as const,
      label: "Candidates",
      icon: Users,
      count: data.candidates.length,
    },
    {
      key: "jobs" as const,
      label: "Jobs",
      icon: BriefcaseBusiness,
      count: data.jobs.length,
    },
    {
      key: "applications" as const,
      label: "Applications",
      icon: GitPullRequestArrow,
      count: data.applications.length,
    },
    {
      key: "companies" as const,
      label: "Companies",
      icon: Building2,
      count: data.companies.length,
    },
  ];
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to main content
      </a>
      <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
        <aside className="sidebar">
          <button
            className="brand"
            onClick={() => void navigate("candidates")}
            aria-label="Recruitdesk home"
          >
            <span className="brand-mark">
              r<span />
            </span>
            <strong>
              Recruitdesk<span>PERSONAL EDITION</span>
            </strong>
          </button>
          <div className="workspace-switch">
            <span className="workspace-avatar">R</span>
            <div>
              <strong>{data.settings.workspaceName}</strong>
              <small>Just you. Fully local.</small>
            </div>
          </div>
          <div className="nav-label">WORKSPACE</div>
          <nav aria-label="Main navigation">
            {links.map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => void navigate(key)}
                className={`nav-item ${page === key ? "active" : ""}`}
                aria-current={page === key ? "page" : undefined}
                aria-label={collapsed ? `${label} ${count}` : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
                <small>{count}</small>
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button
              className={`nav-item ${page === "settings" ? "active" : ""}`}
              onClick={() => void navigate("settings")}
              aria-current={page === "settings" ? "page" : undefined}
              aria-label="Settings & data"
              title="Settings & data"
            >
              <Settings2 size={18} />
              <span>Settings & data</span>
            </button>
            <div className="privacy-panel">
              <ShieldCheck size={19} />
              <strong>Private by design</strong>
              <p>Your workspace lives in this browser. No account. No cloud.</p>
              <button onClick={() => void download("workspace")}>
                Back up workspace <ArrowDownToLine size={13} />
              </button>
            </div>
            <div className="sidebar-footer">
              <span className="local-dot" /> <span>Offline workspace</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  collapsed ? "Expand navigation" : "Collapse navigation"
                }
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? (
                  <PanelLeftOpen size={15} />
                ) : (
                  <PanelLeftClose size={15} />
                )}
              </Button>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={13} />
              <strong>
                {page === "settings"
                  ? "Settings & data"
                  : links.find((l) => l.key === page)?.label}
              </strong>
            </div>
            <div className="topbar-right">
              <SaveIndicator />
              <span className="top-divider" />
              <button
                className="theme-toggle"
                aria-label={`Theme: ${data.settings.theme}. Switch to ${theme === "dark" ? "light" : "dark"}`}
                onClick={() =>
                  void patchSettings({
                    theme: theme === "dark" ? "light" : "dark",
                  }).catch((e) => toast.error(e.message))
                }
              >
                {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
              </button>
              <span className="user-avatar" aria-label="Personal workspace">
                R
              </span>
            </div>
          </header>
          <main id="main-content" tabIndex={-1}>
            <div className="page-content" ref={pageContentRef}>
              {page === "candidates" ? (
                <Candidates
                  data={data}
                  onOpen={(id) => void open("candidates", id)}
                  onCreate={() => setCreate({ kind: "candidates" })}
                  onImport={() => void showImport("vendor")}
                  onExport={() => void download("candidates")}
                />
              ) : page === "jobs" ? (
                <Jobs
                  data={data}
                  onOpen={(id) => void open("jobs", id)}
                  onCreate={() => setCreate({ kind: "jobs" })}
                  onImport={() => void showImport("jobs")}
                  onExport={() => void download("jobs")}
                />
              ) : page === "companies" ? (
                <Companies
                  data={data}
                  onOpen={(id) => void open("companies", id)}
                  onCreate={() => setCreate({ kind: "companies" })}
                />
              ) : page === "applications" ? (
                <Applications
                  data={data}
                  onOpen={(id) => void open("applications", id)}
                  onCreate={() => setCreate({ kind: "applications" })}
                />
              ) : (
                <Settings
                  data={data}
                  onImport={(kind) => void showImport(kind)}
                  onExport={(kind) => void download(kind)}
                  onSample={() => void sample()}
                />
              )}
              {data.candidates.length === 0 &&
                data.jobs.length === 0 &&
                data.companies.length === 0 &&
                page === "candidates" && (
                  <div className="sample-banner">
                    <div>
                      <strong>
                        A blank workspace, ready for your way of working.
                      </strong>
                      <p>
                        Want to explore first? Try a small, clearly labeled
                        fictional dataset.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => void sample()}
                      disabled={sampleBusy}
                    >
                      {sampleBusy ? "Loading…" : "Explore sample workspace"}
                    </Button>
                  </div>
                )}
            </div>
            <footer className="main-footer">
              <span>
                Recruitdesk{" "}
                <span className="muted">/ Personal recruiting workspace</span>
              </span>
              <span>
                <ShieldCheck size={12} /> Stored on this device
              </span>
            </footer>
          </main>
        </div>
      </div>
      <Toaster
        position="bottom-right"
        mobileOffset={{
          bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
          left: 16,
          right: 16,
        }}
        theme={theme}
        richColors
        closeButton
      />
      {selected && (
        <Details
          key={`${selected.kind}-${selected.id}`}
          {...selected}
          data={data}
          onClose={() => setSelected(null)}
          onNavigate={(kind, id) => void open(kind, id)}
          onLink={(candidateId, jobId) =>
            setCreate({ kind: "applications", candidateId, jobId })
          }
        />
      )}
      {create && (
        <CreateRecord
          {...create}
          data={data}
          onClose={() => setCreate(null)}
          onCreated={(id) => {
            const kind = create.kind;
            setCreate(null);
            void open(kind, id);
          }}
        />
      )}
      {importKind && (
        <ImportDialog
          kind={importKind}
          onClose={() => setImportKind(null)}
          onImported={() => setImportKind(null)}
        />
      )}
    </>
  );
}
