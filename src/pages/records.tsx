import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Download,
  KanbanSquare,
  List,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Board } from "./board";
import { BulkActions } from "../components/bulk-actions";
import { BulkBar, PageCheck, RowCheck } from "../components/bulk-bar";
import { AutoField, safeAction, useAutosave } from "../components/autosave";
import {
  Badge,
  EmptyState,
  PageHeading,
  Pagination,
  SearchBox,
  SortHeader,
  TableViewport,
  toneOf,
} from "../components/common";
import { patchEntity } from "../lib/db";
import { useSelection } from "../lib/selection";
import { countBy, matchesTerms, searchable, searchTerms } from "../lib/search";
import { displayDate } from "../lib/utils";
import { jobStatuses, stages, type Dataset } from "../lib/types";

type Props = {
  data: Dataset;
  onOpen: (id: string) => void;
  onCreate: () => void;
};
const recordCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
const compare = (a: string, b: string) => recordCollator.compare(a, b);
/** Sort by position in a pipeline instead of alphabetically. */
const rank = (order: readonly string[], value: string) =>
  String(order.indexOf(value)).padStart(2, "0");
function useControls(pageSize: number) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "updatedAt", desc: true });
  const [page, setPage] = useState(1);
  const { flush } = useAutosave();
  const change = async (action: () => void) => {
    if (await flush()) {
      action();
      setPage(1);
    }
  };
  const onSort = (key: string) => {
    void change(() =>
      setSort({ key, desc: sort.key === key ? !sort.desc : false }),
    );
  };
  const header = (label: string, field: string) => (
    <SortHeader label={label} field={field} sort={sort} onSort={onSort} />
  );
  const searchBox = (placeholder: string) => (
    <SearchBox
      value={search}
      onChange={(v) => {
        void change(() => setSearch(v));
      }}
      placeholder={placeholder}
    />
  );
  return {
    search,
    setSearch,
    sort,
    page,
    setPage,
    change,
    header,
    searchBox,
    pageSize,
    flush,
  };
}
function ResultTable({
  data,
  count,
  controls,
  bar,
  children,
}: {
  data: Dataset;
  count: number;
  controls: ReturnType<typeof useControls>;
  bar?: ReactNode;
  children: ReactNode;
}) {
  const { page, setPage, pageSize, flush } = controls;
  useEffect(
    () => setPage((p) => Math.min(p, Math.max(1, Math.ceil(count / pageSize)))),
    [count, pageSize, setPage],
  );
  return (
    <div className={`data-surface ${data.settings.density}`}>
      {bar}
      <TableViewport label="Records, scroll for more columns">
        {children}
      </TableViewport>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={count}
        setPage={async (p) => {
          if (await flush()) setPage(p);
        }}
      />
    </div>
  );
}
function RecordName({
  name,
  subline,
  onOpen,
}: {
  name: string;
  subline?: string;
  onOpen: () => void;
}) {
  return (
    <div className="record-identity">
      <button className="record-link" onClick={onOpen}>
        <span>{name}</span>
        <ArrowUpRight size={12} aria-hidden="true" />
      </button>
      {subline && <div className="record-subtitle">{subline}</div>}
    </div>
  );
}
export function Jobs({
  data,
  onOpen,
  onCreate,
  onImport,
  onExport,
}: Props & { onImport: () => void; onExport: () => void }) {
  const c = useControls(data.settings.pageSize);
  const [status, setStatus] = useState("");
  const [company, setCompany] = useState("");
  const [workMode, setWorkMode] = useState("");
  const query = useDeferredValue(c.search);
  const companyNames = useMemo(
    () => new Map(data.companies.map((x) => [x.id, x.name])),
    [data.companies],
  );
  const applicationCounts = useMemo(
    () => countBy(data.applications, (application) => application.jobId),
    [data.applications],
  );
  const rows = useMemo(() => {
    const terms = searchTerms(query);
    return data.jobs
      .filter(
        (j) =>
          (!status || j.status === status) &&
          (!company || j.companyId === company) &&
          (!workMode || j.workMode === workMode) &&
          (!terms.length ||
            matchesTerms(
              searchable([
                j.title,
                companyNames.get(j.companyId),
                j.location,
                j.description,
                ...j.skills,
              ]),
              terms,
            )),
      )
      .sort((a, b) => {
        const value = (job: typeof a) =>
          c.sort.key === "company"
            ? (companyNames.get(job.companyId) ?? "")
            : c.sort.key === "status"
              ? rank(jobStatuses, job.status)
              : String(job[c.sort.key as keyof typeof job] ?? "");
        return compare(value(a), value(b)) * (c.sort.desc ? -1 : 1);
      });
  }, [data.jobs, query, c.sort, status, company, workMode, companyNames]);
  const reset = () => {
    void c.change(() => {
      c.setSearch("");
      setStatus("");
      setCompany("");
      setWorkMode("");
    });
  };
  const visible = rows.slice((c.page - 1) * c.pageSize, c.page * c.pageSize);
  const ids = useMemo(() => rows.map((j) => j.id), [rows]);
  const selection = useSelection(ids);
  const pageIds = visible.map((j) => j.id);
  return (
    <>
      <PageHeading
        title="Jobs"
        count={data.jobs.length}
        actions={
          <>
            <Button variant="outline" onClick={onImport}>
              <Upload size={15} />
              Import jobs
            </Button>
            <Button onClick={onCreate}>
              <Plus size={16} />
              New job
            </Button>
          </>
        }
      />
      <div className="toolbar">
        {c.searchBox("Search title, company, location, or skills…")}
        <Button variant="ghost" onClick={onExport}>
          <Download size={16} />
          Export
        </Button>
      </div>
      <div className="filters-row">
        <Select
          label="Job status filter"
          value={status}
          onChange={(v) => {
            void c.change(() => setStatus(v));
          }}
          options={[{ value: "", label: "All statuses" }, ...jobStatuses]}
        />
        <Select
          label="Company filter"
          value={company}
          onChange={(v) => {
            void c.change(() => setCompany(v));
          }}
          options={[
            { value: "", label: "All companies" },
            ...data.companies.map((x) => ({ value: x.id, label: x.name })),
          ]}
        />
        <Select
          label="Work mode filter"
          value={workMode}
          onChange={(v) => {
            void c.change(() => setWorkMode(v));
          }}
          options={[
            { value: "", label: "All work modes" },
            "Remote",
            "Hybrid",
            "On-site",
            "Other",
          ]}
        />
        {(c.search || status || company || workMode) && (
          <Button variant="ghost" onClick={reset}>
            <X size={14} />
            Reset
          </Button>
        )}
      </div>
      {!data.jobs.length ? (
        <EmptyState
          icon="jobs"
          title="No jobs yet"
          description="Add a role, then link candidates to it."
          action={
            <Button onClick={onCreate}>
              <Plus size={16} />
              Add your first job
            </Button>
          }
        />
      ) : !rows.length ? (
        <EmptyState
          icon="jobs"
          title="No matching jobs"
          description="Try another search or clear your filters."
          action={
            <Button variant="outline" onClick={reset}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ResultTable
          data={data}
          count={rows.length}
          controls={c}
          bar={
            <BulkBar selection={selection} total={rows.length} noun="jobs">
              <BulkActions
                kind="jobs"
                noun="jobs"
                selection={selection}
                records={data.jobs}
                field="status"
                fieldLabel="status"
                options={jobStatuses}
                csv={(j) => ({
                  Title: j.title,
                  Company: companyNames.get(j.companyId) ?? "",
                  Status: j.status,
                  Location: j.location,
                  "Work mode": j.workMode,
                  "Employment type": j.employmentType,
                  Salary: j.salary,
                  Skills: j.skills.join("; "),
                  Priority: j.priority,
                })}
              />
            </BulkBar>
          }
        >
          <table className="data-table">
            <caption className="sr-only">Jobs and hiring details</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky-name">
                  <div className="name-head">
                    <PageCheck pageIds={pageIds} selection={selection} />
                    {c.header("Job", "title")}
                  </div>
                </th>
                <th scope="col">{c.header("Company", "company")}</th>
                <th scope="col">{c.header("Status", "status")}</th>
                <th scope="col">Location</th>
                <th scope="col">Work mode</th>
                <th scope="col">Salary</th>
                <th scope="col">Candidates</th>
                <th scope="col">{c.header("Updated", "updatedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((j) => (
                <tr key={j.id}>
                  <td className="sticky-name" data-label="Job">
                    <div className="name-with-check">
                      <RowCheck
                        checked={selection.selected.has(j.id)}
                        label={`Select ${j.title}`}
                        onChange={() => selection.toggle(j.id)}
                      />
                      <RecordName
                        name={j.title}
                        subline={j.employmentType}
                        onOpen={() => onOpen(j.id)}
                      />
                    </div>
                  </td>
                  <td data-label="Company">
                    {companyNames.get(j.companyId) || (
                      <span className="muted">No company</span>
                    )}
                  </td>
                  <td data-label="Status">
                    <Badge value={j.status} />
                  </td>
                  <td data-label="Location">
                    <AutoField
                      compact
                      label={`Location for ${j.title}`}
                      value={j.location}
                      onSave={(v, e) =>
                        patchEntity(
                          "jobs",
                          j.id,
                          { location: v },
                          { location: e },
                        )
                      }
                    />
                  </td>
                  <td data-label="Work mode">{j.workMode}</td>
                  <td data-label="Salary">
                    <AutoField
                      compact
                      label={`Salary for ${j.title}`}
                      value={j.salary}
                      onSave={(v, e) =>
                        patchEntity("jobs", j.id, { salary: v }, { salary: e })
                      }
                    />
                  </td>
                  <td data-label="Candidates">
                    <button
                      className="job-count"
                      aria-label={`View candidates for ${j.title}`}
                      onClick={() => onOpen(j.id)}
                    >
                      {applicationCounts.get(j.id) ?? 0}
                    </button>
                  </td>
                  <td data-label="Updated">
                    <time dateTime={j.updatedAt}>
                      {displayDate(j.updatedAt)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResultTable>
      )}
    </>
  );
}

export function Companies({ data, onOpen, onCreate }: Props) {
  const c = useControls(data.settings.pageSize);
  const jobCounts = useMemo(
    () => countBy(data.jobs, (job) => job.companyId),
    [data.jobs],
  );
  const query = useDeferredValue(c.search);
  const rows = useMemo(() => {
    const terms = searchTerms(query);
    return data.companies
      .filter(
        (x) =>
          !terms.length ||
          matchesTerms(
            searchable([
              x.name,
              x.location,
              x.industry,
              x.contactName,
              x.email,
              x.notes,
            ]),
            terms,
          ),
      )
      .sort(
        (a, b) =>
          compare(
            String(a[c.sort.key as keyof typeof a] ?? ""),
            String(b[c.sort.key as keyof typeof b] ?? ""),
          ) * (c.sort.desc ? -1 : 1),
      );
  }, [data.companies, query, c.sort]);
  const visible = rows.slice((c.page - 1) * c.pageSize, c.page * c.pageSize);
  return (
    <>
      <PageHeading
        title="Companies"
        count={data.companies.length}
        actions={
          <Button onClick={onCreate}>
            <Plus size={16} />
            New company
          </Button>
        }
      />
      <div className="toolbar">
        {c.searchBox("Search company, industry, location, or contact…")}
      </div>
      {!data.companies.length ? (
        <EmptyState
          icon="jobs"
          title="No companies yet"
          description="Add a company to keep its contacts, notes, and roles together."
          action={
            <Button onClick={onCreate}>
              <Plus size={16} />
              Add your first company
            </Button>
          }
        />
      ) : !rows.length ? (
        <EmptyState
          icon="jobs"
          title="No matching companies"
          description="Try a company name, location, or contact."
          action={
            <Button
              variant="outline"
              onClick={() => {
                void c.change(() => c.setSearch(""));
              }}
            >
              Clear search
            </Button>
          }
        />
      ) : (
        <ResultTable data={data} count={rows.length} controls={c}>
          <table className="data-table">
            <caption className="sr-only">
              Companies and recruiting contacts
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sticky-name">
                  {c.header("Company", "name")}
                </th>
                <th scope="col">{c.header("Industry", "industry")}</th>
                <th scope="col">{c.header("Location", "location")}</th>
                <th scope="col">Contact</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">Jobs</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((x) => (
                <tr key={x.id}>
                  <td className="sticky-name" data-label="Company">
                    <RecordName
                      name={x.name}
                      subline={x.website}
                      onOpen={() => onOpen(x.id)}
                    />
                  </td>
                  <td data-label="Industry">
                    <AutoField
                      compact
                      label={`Industry for ${x.name}`}
                      value={x.industry}
                      onSave={(v, e) =>
                        patchEntity(
                          "companies",
                          x.id,
                          { industry: v },
                          { industry: e },
                        )
                      }
                    />
                  </td>
                  <td data-label="Location">
                    <AutoField
                      compact
                      label={`Location for ${x.name}`}
                      value={x.location}
                      onSave={(v, e) =>
                        patchEntity(
                          "companies",
                          x.id,
                          { location: v },
                          { location: e },
                        )
                      }
                    />
                  </td>
                  <td data-label="Contact">
                    <AutoField
                      compact
                      label={`Contact for ${x.name}`}
                      value={x.contactName}
                      onSave={(v, e) =>
                        patchEntity(
                          "companies",
                          x.id,
                          { contactName: v },
                          { contactName: e },
                        )
                      }
                    />
                  </td>
                  <td data-label="Email">
                    <AutoField
                      compact
                      label={`Email for ${x.name}`}
                      value={x.email}
                      onSave={(v, e) =>
                        patchEntity(
                          "companies",
                          x.id,
                          { email: v },
                          { email: e },
                        )
                      }
                    />
                  </td>
                  <td data-label="Phone">
                    <AutoField
                      compact
                      label={`Phone for ${x.name}`}
                      value={x.phone}
                      onSave={(v, e) =>
                        patchEntity(
                          "companies",
                          x.id,
                          { phone: v },
                          { phone: e },
                        )
                      }
                    />
                  </td>
                  <td data-label="Jobs">
                    <button
                      className="job-count"
                      onClick={() => onOpen(x.id)}
                      aria-label={`View jobs for ${x.name}`}
                    >
                      {jobCounts.get(x.id) ?? 0}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResultTable>
      )}
    </>
  );
}

const VIEW_KEY = "recruitdesk-applications-view";
function readView(): "list" | "board" {
  try {
    return localStorage.getItem(VIEW_KEY) === "board" ? "board" : "list";
  } catch {
    return "list";
  }
}
export function Applications({ data, onOpen, onCreate }: Props) {
  const c = useControls(data.settings.pageSize);
  const [stage, setStage] = useState("");
  const [job, setJob] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [view, setView] = useState<"list" | "board">(() => readView());
  const candidates = useMemo(
    () => new Map(data.candidates.map((x) => [x.id, x])),
    [data.candidates],
  );
  const jobs = useMemo(
    () => new Map(data.jobs.map((x) => [x.id, x])),
    [data.jobs],
  );
  const query = useDeferredValue(c.search);
  const companies = useMemo(
    () => new Map(data.companies.map((x) => [x.id, x.name])),
    [data.companies],
  );
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const overdue = (a: Dataset["applications"][number]) =>
    !!a.followUp &&
    a.followUp.slice(0, 10) < todayKey &&
    !["Hired", "Rejected", "Withdrawn"].includes(a.stage);
  const rows = useMemo(
    () =>
      data.applications
        .filter((a) => {
          const person = candidates.get(a.candidateId),
            role = jobs.get(a.jobId),
            terms = searchTerms(query);
          return (
            (view === "board" || !stage || a.stage === stage) &&
            (!job || a.jobId === job) &&
            (!followUp ||
              (followUp === "overdue"
                ? overdue(a)
                : followUp === "today"
                  ? a.followUp.slice(0, 10) === todayKey
                  : !a.followUp)) &&
            (!terms.length ||
              matchesTerms(
                searchable([
                  person?.name,
                  person?.cpmID,
                  role?.title,
                  companies.get(role?.companyId ?? ""),
                  a.nextAction,
                  a.notes,
                ]),
                terms,
              ))
          );
        })
        .sort((a, b) => {
          const direction = c.sort.desc ? -1 : 1;
          if (c.sort.key === "followUp") {
            // Applications without a follow-up always sort last.
            if (!a.followUp || !b.followUp)
              return a.followUp === b.followUp ? 0 : a.followUp ? -1 : 1;
            return compare(a.followUp, b.followUp) * direction;
          }
          const value = (x: typeof a) =>
            c.sort.key === "candidate"
              ? (candidates.get(x.candidateId)?.name ?? "")
              : c.sort.key === "job"
                ? (jobs.get(x.jobId)?.title ?? "")
                : c.sort.key === "stage"
                  ? rank(stages, x.stage)
                  : String(x[c.sort.key as keyof typeof x] ?? "");
          return compare(value(a), value(b)) * direction;
        }),
    [
      data.applications,
      query,
      c.sort,
      stage,
      view,
      job,
      followUp,
      todayKey,
      candidates,
      jobs,
      companies,
    ],
  );
  const reset = () => {
    void c.change(() => {
      c.setSearch("");
      setStage("");
      setJob("");
      setFollowUp("");
    });
  };
  const visible = rows.slice((c.page - 1) * c.pageSize, c.page * c.pageSize);
  const ids = useMemo(() => rows.map((a) => a.id), [rows]);
  const selection = useSelection(ids);
  const pageIds = visible.map((a) => a.id);
  return (
    <>
      <PageHeading
        title="Applications"
        count={data.applications.length}
        actions={
          <Button onClick={onCreate}>
            <Plus size={16} />
            New application
          </Button>
        }
      />
      <div className="toolbar">
        {c.searchBox("Search candidate, CPM ID, job, or company…")}
        <div
          className="view-toggle"
          role="group"
          aria-label="Applications view"
        >
          {(
            [
              ["list", "List", List],
              ["board", "Board", KanbanSquare],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              aria-pressed={view === key}
              onClick={() => {
                setView(key);
                try {
                  localStorage.setItem(VIEW_KEY, key);
                } catch {
                  /* The view choice is a convenience only. */
                }
              }}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="filters-row">
        {view === "list" && (
          <Select
            label="Application stage filter"
            value={stage}
            onChange={(v) => {
              void c.change(() => setStage(v));
            }}
            options={[{ value: "", label: "All stages" }, ...stages]}
          />
        )}
        <Select
          label="Application job filter"
          value={job}
          onChange={(v) => {
            void c.change(() => setJob(v));
          }}
          options={[
            { value: "", label: "All jobs" },
            ...data.jobs.map((j) => ({
              value: j.id,
              label: `${j.title}${companies.get(j.companyId) ? ` · ${companies.get(j.companyId)}` : ""}`,
            })),
          ]}
        />
        <Select
          label="Follow-up filter"
          value={followUp}
          onChange={(v) => {
            void c.change(() => setFollowUp(v));
          }}
          options={[
            { value: "", label: "All follow-ups" },
            { value: "overdue", label: "Overdue" },
            { value: "today", label: "Due today" },
            { value: "none", label: "No follow-up" },
          ]}
        />
        {(c.search || (view === "list" && stage) || job || followUp) && (
          <Button variant="ghost" onClick={reset}>
            <X size={14} />
            Reset
          </Button>
        )}
      </div>
      {!data.applications.length ? (
        <EmptyState
          icon="jobs"
          title="No applications yet"
          description="Link a candidate to a job to track stage and follow-up."
          action={
            <Button onClick={onCreate}>
              <Plus size={16} />
              Add an application
            </Button>
          }
        />
      ) : !rows.length ? (
        <EmptyState
          title="No matching applications"
          description="Try a different search or remove a filter."
          action={
            <Button variant="outline" onClick={reset}>
              Clear filters
            </Button>
          }
        />
      ) : view === "board" ? (
        <Board
          cards={rows.map((a) => ({
            application: a,
            person: candidates.get(a.candidateId)?.name ?? "Missing candidate",
            role: [
              jobs.get(a.jobId)?.title ?? "Missing job",
              companies.get(jobs.get(a.jobId)?.companyId ?? ""),
            ]
              .filter(Boolean)
              .join(" · "),
          }))}
          onOpen={onOpen}
          onMove={(a, next) =>
            void safeAction(async () => {
              if (await c.flush())
                await patchEntity(
                  "applications",
                  a.id,
                  { stage: next },
                  { stage: a.stage },
                );
            })
          }
        />
      ) : (
        <ResultTable
          data={data}
          count={rows.length}
          controls={c}
          bar={
            <BulkBar
              selection={selection}
              total={rows.length}
              noun="applications"
            >
              <BulkActions
                kind="applications"
                noun="applications"
                selection={selection}
                records={data.applications}
                field="stage"
                fieldLabel="stage"
                options={stages}
                csv={(a) => ({
                  Candidate: candidates.get(a.candidateId)?.name ?? "",
                  "CPM ID": candidates.get(a.candidateId)?.cpmID ?? "",
                  Job: jobs.get(a.jobId)?.title ?? "",
                  Company:
                    companies.get(jobs.get(a.jobId)?.companyId ?? "") ?? "",
                  Stage: a.stage,
                  "Next action": a.nextAction,
                  "Follow-up": a.followUp,
                })}
              />
            </BulkBar>
          }
        >
          <table className="data-table">
            <caption className="sr-only">
              Applications, stages, and follow-up actions
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sticky-name">
                  <div className="name-head">
                    <PageCheck pageIds={pageIds} selection={selection} />
                    {c.header("Candidate", "candidate")}
                  </div>
                </th>
                <th scope="col">{c.header("Job", "job")}</th>
                <th scope="col">{c.header("Stage", "stage")}</th>
                <th scope="col">Next action</th>
                <th scope="col">{c.header("Follow-up", "followUp")}</th>
                <th scope="col">{c.header("Updated", "updatedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => {
                const person = candidates.get(a.candidateId),
                  role = jobs.get(a.jobId),
                  label = `${person?.name ?? "Candidate"} for ${role?.title ?? "job"}`;
                return (
                  <tr key={a.id}>
                    <td className="sticky-name" data-label="Candidate">
                      <div className="name-with-check">
                        <RowCheck
                          checked={selection.selected.has(a.id)}
                          label={`Select ${label}`}
                          onChange={() => selection.toggle(a.id)}
                        />
                        <RecordName
                          name={person?.name ?? "Missing candidate"}
                          subline={person?.cpmID}
                          onOpen={() => onOpen(a.id)}
                        />
                      </div>
                    </td>
                    <td data-label="Job">
                      <RecordName
                        name={role?.title ?? "Missing job"}
                        subline={companies.get(role?.companyId ?? "")}
                        onOpen={() => onOpen(a.id)}
                      />
                    </td>
                    <td data-label="Stage">
                      <div className="stage-cell" data-tone={toneOf(a.stage)}>
                        <Select
                          label={`Stage for ${label}`}
                          value={a.stage}
                          options={[...stages]}
                          onChange={(value) => {
                            void safeAction(async () => {
                              if (await c.flush())
                                await patchEntity(
                                  "applications",
                                  a.id,
                                  { stage: value },
                                  { stage: a.stage },
                                );
                            });
                          }}
                        />
                      </div>
                    </td>
                    <td data-label="Next action">
                      <AutoField
                        compact
                        label={`Next action for ${label}`}
                        value={a.nextAction}
                        placeholder="Add next action"
                        onSave={(v, e) =>
                          patchEntity(
                            "applications",
                            a.id,
                            { nextAction: v },
                            { nextAction: e },
                          )
                        }
                      />
                    </td>
                    <td data-label="Follow-up">
                      <div className="followup-cell">
                        <AutoField
                          compact
                          type="date"
                          label={`Follow-up for ${label}`}
                          value={a.followUp.slice(0, 10)}
                          onSave={(v, e) =>
                            patchEntity(
                              "applications",
                              a.id,
                              { followUp: v },
                              {
                                followUp:
                                  a.followUp.slice(0, 10) === e
                                    ? a.followUp
                                    : e,
                              },
                            )
                          }
                        />
                        {overdue(a) && (
                          <span className="badge red">Overdue</span>
                        )}
                      </div>
                    </td>
                    <td data-label="Updated">
                      <time dateTime={a.updatedAt}>
                        {displayDate(a.updatedAt)}
                      </time>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ResultTable>
      )}
    </>
  );
}
