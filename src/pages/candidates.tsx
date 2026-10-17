import { useDeferredValue, useMemo, useState, useEffect } from "react";
import {
  Plus,
  Upload,
  ArrowUpRight,
  SlidersHorizontal,
  X,
  Download,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { AutoField, useAutosave, safeAction } from "../components/autosave";
import {
  Badge,
  EmptyState,
  PageHeading,
  Pagination,
  SearchBox,
  SortHeader,
} from "../components/common";
import { patchEntity } from "../lib/db";
import { initials } from "../lib/utils";
import { candidateSearchText, countBy } from "../lib/search";
import type { Candidate, Dataset } from "../lib/types";
import { candidateStatuses } from "../lib/types";
const candidateCollator = new Intl.Collator(undefined, { numeric: true });

export default function Candidates({
  data,
  onOpen,
  onCreate,
  onImport,
  onExport,
}: {
  data: Dataset;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onImport: () => void;
  onExport: () => void;
}) {
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search);
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [skill, setSkill] = useState("");
  const [filters, setFilters] = useState(false);
  const [sort, setSort] = useState({ key: "name", desc: false });
  const [page, setPage] = useState(1);
  const { flush } = useAutosave();
  const change = async (action: () => void) => {
    if (await flush()) action();
  };
  const reset = () =>
    void change(() => {
      setStatus("");
      setLocation("");
      setSkill("");
      setSearch("");
    });
  const locations = useMemo(
    () =>
      [
        ...new Set(data.candidates.map((c) => c.location).filter(Boolean)),
      ].sort(),
    [data.candidates],
  );
  const skills = useMemo(
    () => [...new Set(data.candidates.flatMap((c) => c.skills))].sort(),
    [data.candidates],
  );
  const searchText = useMemo(
    () =>
      new Map(
        data.candidates.map((candidate) => [
          candidate.id,
          candidateSearchText(candidate),
        ]),
      ),
    [data.candidates],
  );
  const applicationCounts = useMemo(
    () => countBy(data.applications, (application) => application.candidateId),
    [data.applications],
  );
  const rows = useMemo(() => {
    const q = query.toLowerCase().trim();
    return data.candidates
      .filter(
        (c) =>
          (!status || c.status === status) &&
          (!location || c.location === location) &&
          (!skill || c.skills.includes(skill)) &&
          (!q || searchText.get(c.id)?.includes(q)),
      )
      .sort(
        (a, b) =>
          candidateCollator.compare(
            String(a[sort.key as keyof Candidate] ?? ""),
            String(b[sort.key as keyof Candidate] ?? ""),
          ) * (sort.desc ? -1 : 1),
      );
  }, [data.candidates, query, status, location, skill, sort, searchText]);
  useEffect(() => setPage(1), [query, status, location, skill]);
  useEffect(
    () =>
      setPage((p) =>
        Math.min(
          p,
          Math.max(1, Math.ceil(rows.length / data.settings.pageSize)),
        ),
      ),
    [rows.length, data.settings.pageSize],
  );
  const changeSort = async (key: string) => {
    if (await flush())
      setSort({ key, desc: sort.key === key ? !sort.desc : false });
  };
  const visible = rows.slice(
    (page - 1) * data.settings.pageSize,
    page * data.settings.pageSize,
  );
  const counts = data.candidates.filter((c) => c.status === "Available").length;
  return (
    <>
      <PageHeading
        title="Candidates"
        count={data.candidates.length}
        description="Your talent network, thoughtfully organized."
        actions={
          <>
            <Button variant="outline" onClick={onImport}>
              <Upload size={15} />
              Import vendor CSV
            </Button>
            <Button onClick={onCreate}>
              <Plus size={16} />
              New candidate
            </Button>
          </>
        }
      />
      <div className="list-tabs">
        <button
          className={!status ? "active" : ""}
          aria-pressed={!status}
          onClick={() => void change(() => setStatus(""))}
        >
          All candidates <span>{data.candidates.length}</span>
        </button>
        <button
          className={status === "Available" ? "active" : ""}
          aria-pressed={status === "Available"}
          onClick={() => void change(() => setStatus("Available"))}
        >
          Available <span>{counts}</span>
        </button>
        <button
          className={status === "Open to opportunities" ? "active" : ""}
          aria-pressed={status === "Open to opportunities"}
          onClick={() => void change(() => setStatus("Open to opportunities"))}
        >
          Open to opportunities
        </button>
      </div>
      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={(v) => void change(() => setSearch(v))}
          placeholder="Search profiles, CPM ID, skills, or notes…"
        />
        <div className="toolbar-actions">
          <Button
            variant="outline"
            onClick={() => setFilters(!filters)}
            aria-expanded={filters}
          >
            <SlidersHorizontal size={14} />
            Filters
            {[status, location, skill].filter(Boolean).length > 0 && (
              <span className="filter-count">
                {[status, location, skill].filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={onExport}
            aria-label="Export candidates JSON"
          >
            <Download size={16} />
            <span className="hide-small">Export</span>
          </Button>
        </div>
      </div>
      {filters && (
        <div className="filters-row filter-reveal">
          <Select
            label="Candidate status filter"
            value={status}
            onChange={(v) => void change(() => setStatus(v))}
            options={[
              { value: "", label: "All statuses" },
              ...candidateStatuses,
            ]}
          />
          <Select
            label="Location filter"
            value={location}
            onChange={(v) => void change(() => setLocation(v))}
            options={[{ value: "", label: "All locations" }, ...locations]}
          />
          <Select
            label="Skill filter"
            value={skill}
            onChange={(v) => void change(() => setSkill(v))}
            options={[{ value: "", label: "All skills" }, ...skills]}
          />
          <Button variant="ghost" onClick={reset}>
            <X size={14} />
            Reset
          </Button>
        </div>
      )}
      {data.candidates.length === 0 ? (
        <EmptyState
          title="Build your talent network"
          description="Bring in candidates from your vendor CSV, or add your first profile. Everything stays in this browser."
          action={
            <div className="flex gap-2">
              <Button onClick={onImport}>
                <Upload size={16} />
                Import vendor CSV
              </Button>
              <Button variant="outline" onClick={onCreate}>
                <Plus size={16} />
                Add candidate
              </Button>
            </div>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No matching candidates"
          description="Try a different search or remove a filter."
          action={
            <Button variant="outline" onClick={reset}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className={`data-surface ${data.settings.density}`}>
          <div className="table-scroll">
            <table className="data-table candidate-table">
              <thead>
                <tr>
                  <th className="index-cell">#</th>
                  <th className="sticky-name">
                    <SortHeader
                      label="Candidate"
                      field="name"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                  <th>
                    <SortHeader
                      label="CPM ID"
                      field="cpmID"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                  <th>
                    <SortHeader
                      label="Status"
                      field="status"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                  <th>
                    <SortHeader
                      label="Location"
                      field="location"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                  <th>
                    <SortHeader
                      label="Experience"
                      field="yearsExperience"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                  <th>Skills</th>
                  <th>Expected salary</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Jobs</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c, i) => (
                  <tr key={c.id}>
                    <td className="index-cell">
                      {(page - 1) * data.settings.pageSize + i + 1}
                    </td>
                    <td className="sticky-name">
                      <div className="person-cell">
                        <button
                          className="avatar"
                          onClick={() => onOpen(c.id)}
                          aria-label={`Open ${c.name}`}
                        >
                          {initials(c.name)}
                        </button>
                        <div>
                          <button
                            className="record-link"
                            onClick={() => onOpen(c.id)}
                          >
                            {c.name}
                            <ArrowUpRight size={12} />
                          </button>
                          <AutoField
                            compact
                            label={`Headline for ${c.name}`}
                            value={c.headline}
                            placeholder="Add headline"
                            onSave={(v, e) =>
                              patchEntity(
                                "candidates",
                                c.id,
                                { headline: v },
                                { headline: e },
                              )
                            }
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <AutoField
                        compact
                        label={`CPM ID for ${c.name}`}
                        value={c.cpmID}
                        normalize={(value) => value.trim()}
                        onSave={(v, e) =>
                          patchEntity(
                            "candidates",
                            c.id,
                            { cpmID: v },
                            { cpmID: e },
                          )
                        }
                      />
                    </td>
                    <td>
                      <div className="status-cell" data-status={c.status}>
                        <Select
                          label={`Availability for ${c.name}`}
                          value={c.status}
                          options={[...candidateStatuses]}
                          onChange={(v) =>
                            void safeAction(async () => {
                              if (await flush())
                                await patchEntity(
                                  "candidates",
                                  c.id,
                                  { status: v },
                                  { status: c.status },
                                );
                            })
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <AutoField
                        compact
                        label={`Location for ${c.name}`}
                        value={c.location}
                        onSave={(v, e) =>
                          patchEntity(
                            "candidates",
                            c.id,
                            { location: v },
                            { location: e },
                          )
                        }
                      />
                    </td>
                    <td>
                      <AutoField
                        compact
                        label={`Experience for ${c.name}`}
                        value={c.yearsExperience}
                        placeholder="Years"
                        onSave={(v, e) =>
                          patchEntity(
                            "candidates",
                            c.id,
                            { yearsExperience: v },
                            { yearsExperience: e },
                          )
                        }
                      />
                    </td>
                    <td>
                      <div className="tags">
                        {c.skills.slice(0, 2).map((s) => (
                          <span className="tag" key={s}>
                            {s}
                          </span>
                        ))}
                        {c.skills.length > 2 && (
                          <span className="tag subtle">
                            +{c.skills.length - 2}
                          </span>
                        )}
                        {!c.skills.length && <span className="muted">—</span>}
                      </div>
                    </td>
                    <td>
                      <AutoField
                        compact
                        label={`Salary for ${c.name}`}
                        value={c.salary}
                        onSave={(v, e) =>
                          patchEntity(
                            "candidates",
                            c.id,
                            { salary: v },
                            { salary: e },
                          )
                        }
                      />
                    </td>
                    <td>
                      <AutoField
                        compact
                        label={`Email for ${c.name}`}
                        value={c.email}
                        onSave={(v, e) =>
                          patchEntity(
                            "candidates",
                            c.id,
                            { email: v },
                            { email: e },
                          )
                        }
                      />
                    </td>
                    <td>
                      <AutoField
                        compact
                        label={`Phone for ${c.name}`}
                        value={c.phone}
                        onSave={(v, e) =>
                          patchEntity(
                            "candidates",
                            c.id,
                            { phone: v },
                            { phone: e },
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="job-count"
                        aria-label={`View jobs for ${c.name}`}
                        onClick={() => onOpen(c.id)}
                      >
                        {applicationCounts.get(c.id) ?? 0}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            setPage={async (p) => {
              if (await flush()) setPage(p);
            }}
            total={rows.length}
            pageSize={data.settings.pageSize}
          />
        </div>
      )}
      <div className="table-tip">
        <span className="status-dot" />
        Click a cell to edit. Changes save automatically. Open a name for the
        full profile.
      </div>
    </>
  );
}
