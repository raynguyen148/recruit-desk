import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Toaster, toast } from "sonner";
import {
  Users,
  BriefcaseBusiness,
  Building2,
  GitPullRequestArrow,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  Database,
  ArrowDownToLine,
  Sun,
  Moon,
  Monitor,
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
const pages: Page[] = [
  "candidates",
  "jobs",
  "companies",
  "applications",
  "settings",
];
const pageFromHash = (hash: string) =>
  pages.find((p) => p === hash.replace(/^#/, ""));
const THEME_KEY = "recruitdesk-theme";
const themeCycle = { system: "light", light: "dark", dark: "system" } as const;
const BACKUP_STALE_DAYS = 14;
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
  const pageRef = useRef<Page>(page);
  const defaultPageRef = useRef<Page>("candidates");
  pageRef.current = page;
  if (data) defaultPageRef.current = data.settings.defaultPage;
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
      setPage(pageFromHash(location.hash) ?? data.settings.defaultPage);
      setNavInitialized(true);
    }
  }, [data, navInitialized]);
  useEffect(() => {
    if (!navInitialized) return;
    // Browser Back/Forward moves between pages like in-app navigation does.
    const onHistory = () => {
      const next = pageFromHash(location.hash) ?? defaultPageRef.current;
      if (next === pageRef.current) return;
      void flush().then((saved) => {
        if (saved) {
          setSelected(null);
          setPage(next);
          window.scrollTo({ top: 0, behavior: "instant" });
        } else {
          history.replaceState(null, "", `#${pageRef.current}`);
          toast.error("Resolve unsaved changes before leaving this page.");
        }
      });
    };
    window.addEventListener("popstate", onHistory);
    return () => window.removeEventListener("popstate", onHistory);
  }, [navInitialized, flush]);
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
      if (data?.settings.theme) {
        try {
          localStorage.setItem(THEME_KEY, data.settings.theme);
        } catch {
          /* The pre-paint theme is a nicety; storage may be unavailable. */
        }
      }
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [data?.settings.theme]);
  async function navigate(next: Page) {
    if (await flush()) {
      setPage(next);
      if (next !== page) window.scrollTo({ top: 0, behavior: "instant" });
      if (location.hash !== `#${next}`) history.pushState(null, "", `#${next}`);
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
    if (sampleBusy) return;
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
  const hasRecords =
    data.candidates.length + data.jobs.length + data.companies.length > 0;
  const lastBackup = Date.parse(data.settings.lastBackup);
  const backupStale =
    hasRecords &&
    (Number.isNaN(lastBackup) ||
      Date.now() - lastBackup > BACKUP_STALE_DAYS * 86_400_000);
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
            <strong>Recruitdesk</strong>
          </button>
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
            <div className="sidebar-footer">
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
              <strong>
                {page === "settings"
                  ? "Settings & data"
                  : links.find((l) => l.key === page)?.label}
              </strong>
            </div>
            <div className="topbar-right">
              {backupStale && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void download("workspace")}
                >
                  <ArrowDownToLine size={14} />
                  Back up
                </Button>
              )}
              <SaveIndicator />
              <span className="top-divider" />
              <button
                className="theme-toggle"
                aria-label={`Theme: ${data.settings.theme}. Switch to ${themeCycle[data.settings.theme]}`}
                title={`Theme: ${data.settings.theme}`}
                onClick={() =>
                  void patchSettings({
                    theme: themeCycle[data.settings.theme],
                  }).catch((e) => toast.error(e.message))
                }
              >
                {data.settings.theme === "system" ? (
                  <Monitor size={17} />
                ) : data.settings.theme === "dark" ? (
                  <Moon size={17} />
                ) : (
                  <Sun size={17} />
                )}
              </button>
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
                  onSample={() => void sample()}
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
            </div>
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
