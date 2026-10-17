import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, Download, Plus, Upload, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { AutoField, safeAction, useAutosave } from "../components/autosave";
import {
  Badge,
  EmptyState,
  PageHeading,
  Pagination,
  SearchBox,
  SortHeader,
  TableViewport,
} from "../components/common";
import { patchEntity } from "../lib/db";
import { countBy } from "../lib/search";
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
  children,
}: {
  data: Dataset;
  count: number;
  controls: ReturnType<typeof useControls>;
  children: ReactNode;
}) {
  const { page, setPage, pageSize, flush } = controls;
  useEffect(
    () => setPage((p) => Math.min(p, Math.max(1, Math.ceil(count / pageSize)))),
    [count, pageSize, setPage],
  );
  return (
    <div className={`data-surface ${data.settings.density}`}>
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
const tip = (
  <div className="table-tip">
    <span className="status-dot" />
    Click a cell to edit. Changes save automatically.
  </div>
);

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
  const companyNames = useMemo(
    () => new Map(data.companies.map((x) => [x.id, x.name])),
    [data.companies],
  );
  const applicationCounts = useMemo(
    () => countBy(data.applications, (application) => application.jobId),
    [data.applications],
  );
  const rows = useMemo(() => {
    const query = c.search.trim().toLowerCase();
    return data.jobs
      .filter(
        (j) =>
          (!status || j.status === status) &&
          (!company || j.companyId === company) &&
          (!workMode || j.workMode === workMode) &&
          (!query ||
            [
              j.title,
              companyNames.get(j.companyId),
              j.location,
              j.description,
              ...j.skills,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query)),
      )
      .sort((a, b) => {
        const value = (job: typeof a) =>
          c.sort.key === "company"
            ? (companyNames.get(job.companyId) ?? "")
            : String(job[c.sort.key as keyof typeof job] ?? "");
        return compare(value(a), value(b)) * (c.sort.desc ? -1 : 1);
      });
  }, [data.jobs, c.search, c.sort, status, company, workMode, companyNames]);
  const reset = () => {
    void c.change(() => {
      c.setSearch("");
      setStatus("");
      setCompany("");
      setWorkMode("");
    });
  };
  const visible = rows.slice((c.page - 1) * c.pageSize, c.page * c.pageSize);
  return (
    <>
      <PageHeading
        title="Jobs"
        count={data.jobs.length}
        description="Keep every opportunity and hiring conversation in view."
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
          title="Make room for your next placement"
          description="Add an open role, then connect the right candidates to it."
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
        <ResultTable data={data} count={rows.length} controls={c}>
          <table className="data-table">
            <caption className="sr-only">Jobs and hiring details</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky-name">
                  {c.header("Job", "title")}
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
                  <td className="sticky-name">
                    <RecordName
                      name={j.title}
                      subline={j.employmentType}
                      onOpen={() => onOpen(j.id)}
                    />
                  </td>
                  <td>
                    {companyNames.get(j.companyId) || (
                      <span className="muted">No company</span>
                    )}
                  </td>
                  <td>
                    <Badge value={j.status} />
                  </td>
                  <td>
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
                  <td>{j.workMode}</td>
                  <td>
                    <AutoField
                      compact
                      label={`Salary for ${j.title}`}
                      value={j.salary}
                      onSave={(v, e) =>
                        patchEntity("jobs", j.id, { salary: v }, { salary: e })
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="job-count"
                      aria-label={`View candidates for ${j.title}`}
                      onClick={() => onOpen(j.id)}
                    >
                      {applicationCounts.get(j.id) ?? 0}
                    </button>
                  </td>
                  <td>
                    <time dateTime={j.updatedAt}>
                      {new Date(j.updatedAt).toLocaleDateString()}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResultTable>
      )}
      {data.jobs.length > 0 && tip}
    </>
  );
}

export function Companies({ data, onOpen, onCreate }: Props) {
  const c = useControls(data.settings.pageSize);
  const jobCounts = useMemo(
    () => countBy(data.jobs, (job) => job.companyId),
    [data.jobs],
  );
  const rows = useMemo(() => {
    const query = c.search.trim().toLowerCase();
    return data.companies
      .filter(
        (x) =>
          !query ||
          [x.name, x.location, x.industry, x.contactName, x.email, x.notes]
            .join(" ")
            .toLowerCase()
            .includes(query),
      )
      .sort(
        (a, b) =>
          compare(
            String(a[c.sort.key as keyof typeof a] ?? ""),
            String(b[c.sort.key as keyof typeof b] ?? ""),
          ) * (c.sort.desc ? -1 : 1),
      );
  }, [data.companies, c.search, c.sort]);
  const visible = rows.slice((c.page - 1) * c.pageSize, c.page * c.pageSize);
  return (
    <>
      <PageHeading
        title="Companies"
        count={data.companies.length}
        description="The teams you hire for, and the people behind them."
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
          title="Start with a company"
          description="Keep client contacts, company notes, and their open roles together."
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
                  <td className="sticky-name">
                    <RecordName
                      name={x.name}
                      subline={x.website}
                      onOpen={() => onOpen(x.id)}
                    />
                  </td>
                  <td>
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
                  <td>
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
                  <td>
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
                  <td>
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
                  <td>
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
                  <td>
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
      {data.companies.length > 0 && tip}
    </>
  );
}

export function Applications({ data, onOpen, onCreate }: Props) {
  const c = useControls(data.settings.pageSize);
  const [stage, setStage] = useState("");
  const [job, setJob] = useState("");
  const [followUp, setFollowUp] = useState("");
  const candidates = useMemo(
    () => new Map(data.candidates.map((x) => [x.id, x])),
    [data.candidates],
  );
  const jobs = useMemo(
    () => new Map(data.jobs.map((x) => [x.id, x])),
    [data.jobs],
  );
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
            query = c.search.trim().toLowerCase();
          return (
            (!stage || a.stage === stage) &&
            (!job || a.jobId === job) &&
            (!followUp ||
              (followUp === "overdue"
                ? overdue(a)
                : followUp === "today"
                  ? a.followUp.slice(0, 10) === todayKey
                  : !a.followUp)) &&
            (!query ||
              [
                person?.name,
                person?.cpmID,
                role?.title,
                companies.get(role?.companyId ?? ""),
                a.nextAction,
                a.notes,
              ]
                .join(" ")
                .toLowerCase()
                .includes(query))
          );
        })
        .sort((a, b) => {
          const value = (x: typeof a) =>
            c.sort.key === "candidate"
              ? (candidates.get(x.candidateId)?.name ?? "")
              : c.sort.key === "job"
                ? (jobs.get(x.jobId)?.title ?? "")
                : String(x[c.sort.key as keyof typeof x] ?? "");
          return compare(value(a), value(b)) * (c.sort.desc ? -1 : 1);
        }),
    [
      data.applications,
      c.search,
      c.sort,
      stage,
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
  return (
    <>
      <PageHeading
        title="Applications"
        count={data.applications.length}
        description="Turn good introductions into your next placement."
        actions={
          <Button onClick={onCreate}>
            <Plus size={16} />
            New application
          </Button>
        }
      />
      <div className="toolbar">
        {c.searchBox("Search candidate, CPM ID, job, or company…")}
      </div>
      <div className="filters-row">
        <Select
          label="Application stage filter"
          value={stage}
          onChange={(v) => {
            void c.change(() => setStage(v));
          }}
          options={[{ value: "", label: "All stages" }, ...stages]}
        />
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
        {(c.search || stage || job || followUp) && (
          <Button variant="ghost" onClick={reset}>
            <X size={14} />
            Reset
          </Button>
        )}
      </div>
      {!data.applications.length ? (
        <EmptyState
          icon="jobs"
          title="Make the first connection"
          description="Link a candidate to a job to track their progress, next action, and follow-up."
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
      ) : (
        <ResultTable data={data} count={rows.length} controls={c}>
          <table className="data-table">
            <caption className="sr-only">
              Applications, stages, and follow-up actions
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sticky-name">
                  {c.header("Candidate", "candidate")}
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
                    <td className="sticky-name">
                      <RecordName
                        name={person?.name ?? "Missing candidate"}
                        subline={person?.cpmID}
                        onOpen={() => onOpen(a.id)}
                      />
                    </td>
                    <td>
                      <RecordName
                        name={role?.title ?? "Missing job"}
                        subline={companies.get(role?.companyId ?? "")}
                        onOpen={() => onOpen(a.id)}
                      />
                    </td>
                    <td>
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
                    </td>
                    <td>
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
                    <td>
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
                                a.followUp.slice(0, 10) === e ? a.followUp : e,
                            },
                          )
                        }
                      />
                      {overdue(a) && <span className="badge red">Overdue</span>}
                    </td>
                    <td>
                      <time dateTime={a.updatedAt}>
                        {new Date(a.updatedAt).toLocaleDateString()}
                      </time>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ResultTable>
      )}
      {data.applications.length > 0 && tip}
    </>
  );
}
