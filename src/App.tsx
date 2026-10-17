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
  CalendarCheck,
  Search,
} from "lucide-react";
import { getDataset, initializeDB, patchSettings } from "./lib/db";
import { exportData } from "./lib/transfer";
import { loadSample } from "./lib/sample";
import type { EntityKind } from "./lib/types";
import { followUpBucket } from "./lib/followups";
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
import { CommandPalette } from "./components/command-palette";
import { ShortcutsDialog } from "./components/shortcuts-dialog";
import Candidates from "./pages/candidates";
import { Jobs, Companies, Applications } from "./pages/records";
import Settings from "./pages/settings";
import Today from "./pages/today";
type Page = EntityKind | "today" | "settings";
const entityKinds: EntityKind[] = [
  "candidates",
  "jobs",
  "companies",
  "applications",
];
const pages: Page[] = [
  "today",
  "candidates",
  "jobs",
  "companies",
  "applications",
  "settings",
];
/** `#jobs` is a page; `#jobs/<id>` is a page with that record open. */
function parseHash(hash: string) {
  const [head, id] = hash.replace(/^#/, "").split("/");
  const page = pages.find((p) => p === head);
  const kind = entityKinds.find((k) => k === page);
  return {
    page,
    record: kind && id ? { kind, id: decodeURIComponent(id) } : null,
  };
}
type Selected = { kind: EntityKind; id: string } | null;
const hashFor = (selected: Selected, page: Page) =>
  selected
    ? `#${selected.kind}/${encodeURIComponent(selected.id)}`
    : `#${page}`;
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
  const [selected, setSelected] = useState<Selected>(null);
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const goRef = useRef<{ at: number }>({ at: 0 });
  const navigateRef = useRef<(page: Page) => Promise<void>>(async () => {});
  const [create, setCreate] = useState<{
    kind: EntityKind;
    candidateId?: string;
    jobId?: string;
  } | null>(null);
  const [importKind, setImportKind] = useState<ImportKind | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const pageRef = useRef<Page>(page);
  const selectedRef = useRef<Selected>(selected);
  const dataRef = useRef(data);
  selectedRef.current = selected;
  dataRef.current = data;
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
      const { page: linked, record } = parseHash(location.hash);
      setPage(linked ?? data.settings.defaultPage);
      if (record && data[record.kind].some((r) => r.id === record.id))
        setSelected(record);
      else if (record) history.replaceState(null, "", `#${record.kind}`);
      setNavInitialized(true);
    }
  }, [data, navInitialized]);
  useEffect(() => {
    if (!navInitialized) return;
    // Browser Back/Forward moves between pages like in-app navigation does.
    const onHistory = () => {
      const { page: linked, record } = parseHash(location.hash);
      // An open record leaves the page underneath it alone.
      const next = record
        ? pageRef.current
        : (linked ?? defaultPageRef.current);
      const target =
        record && dataRef.current?.[record.kind].some((r) => r.id === record.id)
          ? record
          : null;
      void flush().then((saved) => {
        if (saved) {
          setSelected(target);
          if (next !== pageRef.current) {
            setPage(next);
            window.scrollTo({ top: 0, behavior: "instant" });
          }
        } else {
          history.replaceState(
            history.state,
            "",
            hashFor(selectedRef.current, pageRef.current),
          );
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
        ?.setAttribute("content", dark ? "#0e1621" : "#edf1f7");
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
  useEffect(() => {
    if (!navInitialized) return;
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setPalette((open) => !open);
        return;
      }
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.defaultPrevented
      )
        return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable], [role=dialog], [role=alertdialog]",
        )
      )
        return;
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;
      const now = Date.now();
      if (goRef.current.at && now - goRef.current.at < 1200) {
        goRef.current.at = 0;
        const dest: Record<string, Page> = {
          t: "today",
          c: "candidates",
          j: "jobs",
          a: "applications",
          p: "companies",
          s: "settings",
        };
        if (dest[key]) {
          event.preventDefault();
          void navigateRef.current(dest[key]);
          return;
        }
      }
      if (key === "g") {
        goRef.current.at = now;
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        setShortcuts(true);
        return;
      }
      if (key === "j" || key === "k") {
        const links = [
          ...document.querySelectorAll<HTMLElement>(
            "tbody tr .record-link, .today-row .record-link",
          ),
        ];
        if (links.length) {
          event.preventDefault();
          const at = links.indexOf(document.activeElement as HTMLElement);
          const next =
            key === "j"
              ? Math.min(at + 1, links.length - 1)
              : Math.max(at < 0 ? 0 : at - 1, 0);
          links[next].focus();
          links[next].scrollIntoView({ block: "nearest" });
        }
        return;
      }
      if (event.key === "/") {
        const search =
          document.querySelector<HTMLInputElement>(".search-box input");
        if (search) {
          event.preventDefault();
          search.focus();
        }
      } else if (
        key === "n" &&
        entityKinds.some((k) => k === pageRef.current)
      ) {
        event.preventDefault();
        void startCreate(pageRef.current as EntityKind);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // startCreate only reads refs and `flush`, which is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navInitialized, flush]);
  navigateRef.current = navigate;
  async function navigate(next: Page) {
    if (await flush()) {
      setSelected(null);
      setPage(next);
      if (next !== page) window.scrollTo({ top: 0, behavior: "instant" });
      if (location.hash !== `#${next}`) history.pushState(null, "", `#${next}`);
    } else toast.error("Resolve unsaved changes before leaving this page.");
  }
  async function open(kind: EntityKind, id: string) {
    if (!(await flush())) {
      toast.error("Resolve unsaved changes before opening another record.");
      return;
    }
    setSelected({ kind, id });
    // Each open adds one history entry, so Back closes the record again.
    history.pushState(
      { depth: (history.state?.depth ?? 0) + 1 },
      "",
      hashFor({ kind, id }, pageRef.current),
    );
  }
  function closeDetails() {
    setSelected(null);
    const depth: number = history.state?.depth ?? 0;
    if (depth > 0) history.go(-depth);
    else history.replaceState(null, "", `#${pageRef.current}`);
  }
  async function startCreate(kind: EntityKind) {
    if (await flush()) setCreate({ kind });
    else toast.error("Resolve unsaved changes before creating a record.");
  }
  function cycleTheme() {
    const current = dataRef.current?.settings.theme ?? "system";
    void patchSettings({ theme: themeCycle[current] }).catch((e) =>
      toast.error(e.message),
    );
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
      <div className="boot" role="status" aria-busy="true">
        <span className="sr-only">Opening your local workspace…</span>
        <aside className="boot-side" aria-hidden="true">
          <i className="skeleton boot-logo" />
          <i className="skeleton" />
          <i className="skeleton" />
          <i className="skeleton" />
        </aside>
        <div className="boot-main" aria-hidden="true">
          <i className="skeleton boot-title" />
          <i className="skeleton boot-bar" />
          <div className="boot-card">
            {Array.from({ length: 6 }, (_, i) => (
              <i className="skeleton boot-row" key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  const hasRecords =
    data.candidates.length + data.jobs.length + data.companies.length > 0;
  const lastBackup = Date.parse(data.settings.lastBackup);
  const backupStale =
    hasRecords &&
    (Number.isNaN(lastBackup) ||
      Date.now() - lastBackup > BACKUP_STALE_DAYS * 86_400_000);
  const dueToday = data.applications.filter((a) => {
    const bucket = followUpBucket(a);
    return bucket === "overdue" || bucket === "today";
  }).length;
  const links = [
    {
      key: "today" as const,
      label: "Today",
      icon: CalendarCheck,
      count: dueToday,
    },
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
            <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
              <rect width="64" height="64" rx="16" fill="currentColor" />
              <path
                d="M23 45V21m0 10c0-6 4-10 11-10"
                stroke="#fff"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="44" cy="44" r="4.5" fill="#9acbff" />
            </svg>
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
            <button
              className="palette-trigger"
              aria-label="Open command palette"
              title="Command palette (Ctrl or ⌘ K)"
              onClick={() => setPalette(true)}
            >
              <Search size={15} aria-hidden="true" />
              <span>Search…</span>
              <kbd aria-hidden="true">⌘K</kbd>
            </button>
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
                onClick={cycleTheme}
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
              {page === "today" ? (
                <Today
                  data={data}
                  onOpen={(id) => void open("applications", id)}
                />
              ) : page === "candidates" ? (
                <Candidates
                  data={data}
                  onOpen={(id) => void open("candidates", id)}
                  onCreate={() => void startCreate("candidates")}
                  onImport={() => void showImport("vendor")}
                  onExport={() => void download("candidates")}
                  onSample={() => void sample()}
                />
              ) : page === "jobs" ? (
                <Jobs
                  data={data}
                  onOpen={(id) => void open("jobs", id)}
                  onCreate={() => void startCreate("jobs")}
                  onImport={() => void showImport("jobs")}
                  onExport={() => void download("jobs")}
                />
              ) : page === "companies" ? (
                <Companies
                  data={data}
                  onOpen={(id) => void open("companies", id)}
                  onCreate={() => void startCreate("companies")}
                />
              ) : page === "applications" ? (
                <Applications
                  data={data}
                  onOpen={(id) => void open("applications", id)}
                  onCreate={() => void startCreate("applications")}
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
          onClose={closeDetails}
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
      {shortcuts && <ShortcutsDialog onClose={() => setShortcuts(false)} />}
      {palette && (
        <CommandPalette
          data={data}
          onClose={() => setPalette(false)}
          actions={{
            go: (next) => void navigate(next),
            create: (kind) => void startCreate(kind),
            open: (kind, id) => void open(kind, id),
            importCSV: () => void showImport("vendor"),
            backup: () => void download("workspace"),
            cycleTheme,
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
