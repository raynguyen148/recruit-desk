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
  TableViewport,
  useTabIndicator,
} from "../components/common";
import { patchEntity } from "../lib/db";
import { avatarStyle, initials } from "../lib/utils";
import {
  candidateSearchText,
  countBy,
  matchesTerms,
  searchTerms,
} from "../lib/search";
import type { Candidate, Dataset } from "../lib/types";
import { candidateStatuses } from "../lib/types";
const candidateCollator = new Intl.Collator(undefined, { numeric: true });

export default function Candidates({
  data,
  onOpen,
  onCreate,
  onImport,
  onExport,
  onSample,
}: {
  data: Dataset;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onImport: () => void;
  onExport: () => void;
  onSample: () => void;
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
  const tabsRef = useTabIndicator<HTMLDivElement>();
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
    const terms = searchTerms(query);
    return data.candidates
      .filter(
        (c) =>
          (!status || c.status === status) &&
          (!location || c.location === location) &&
          (!skill || c.skills.includes(skill)) &&
          (!terms.length || matchesTerms(searchText.get(c.id) ?? "", terms)),
      )
      .sort((a, b) => {
        // Status sorts by availability, most reachable first, not alphabetically.
        const value = (x: Candidate) =>
          sort.key === "status"
            ? String(
                (candidateStatuses as readonly string[]).indexOf(x.status),
              ).padStart(2, "0")
            : String(x[sort.key as keyof Candidate] ?? "");
        return (
          candidateCollator.compare(value(a), value(b)) * (sort.desc ? -1 : 1)
        );
      });
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
  const statusCounts = countBy(data.candidates, (c) => c.status);
  return (
    <>
      <PageHeading
        title="Candidates"
        count={data.candidates.length}
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
      <div className="list-tabs" ref={tabsRef}>
        <button
          className={!status ? "active" : ""}
          aria-pressed={!status}
          onClick={() => void change(() => setStatus(""))}
        >
          All
        </button>
        <button
          className={status === "Available" ? "active" : ""}
          aria-pressed={status === "Available"}
          onClick={() => void change(() => setStatus("Available"))}
        >
          Available <span>{statusCounts.get("Available") ?? 0}</span>
        </button>
        <button
          className={status === "Open to opportunities" ? "active" : ""}
          aria-pressed={status === "Open to opportunities"}
          onClick={() => void change(() => setStatus("Open to opportunities"))}
        >
          Open to opportunities{" "}
          <span>{statusCounts.get("Open to opportunities") ?? 0}</span>
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
            aria-controls="candidate-filters"
            className={filters ? "filter-toggle active" : "filter-toggle"}
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
        <div id="candidate-filters" className="filters-row filter-reveal">
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
      {!filters &&
        (location ||
          skill ||
          (status &&
            !["Available", "Open to opportunities"].includes(status))) && (
          <div className="active-filters" aria-label="Active candidate filters">
            {[
              { label: "Status", value: status, clear: () => setStatus("") },
              {
                label: "Location",
                value: location,
                clear: () => setLocation(""),
              },
              { label: "Skill", value: skill, clear: () => setSkill("") },
            ]
              .filter((item) => item.value)
              .map((item) => (
                <button
                  key={item.label}
                  className="filter-chip"
                  aria-label={`Remove ${item.label.toLowerCase()} filter: ${item.value}`}
                  onClick={() => void change(item.clear)}
                >
                  <span>
                    {item.label}: {item.value}
                  </span>
                  <X size={12} aria-hidden="true" />
                </button>
              ))}
          </div>
        )}
      {data.candidates.length === 0 ? (
        <EmptyState
          title="No candidates yet"
          description="Import a vendor CSV or add your first profile."
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
              <Button variant="ghost" onClick={onSample}>
                Try sample data
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
          <TableViewport label="Candidates, scroll for more columns">
            <table className="data-table candidate-table">
              <caption className="sr-only">
                Candidate profiles and availability
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky-name">
                    <SortHeader
                      label="Candidate"
                      field="name"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                  <th scope="col">
                    <SortHeader
                      label="CPM ID"
                      field="cpmID"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                  <th scope="col">
                    <SortHeader
                      label="Status"
                      field="status"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                  <th scope="col">
                    <SortHeader
                      label="Location"
                      field="location"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                  <th scope="col" className="col-optional">
                    <SortHeader
                      label="Experience"
                      field="yearsExperience"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                  <th scope="col">Skills</th>
                  <th scope="col" className="col-optional">
                    Expected salary
                  </th>
                  <th scope="col">Contact</th>
                  <th scope="col">Jobs</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id}>
                    <td className="sticky-name" data-label="Candidate">
                      <div className="person-cell">
                        <button
                          className="avatar"
                          onClick={() => onOpen(c.id)}
                          aria-label={`Open ${c.name}`}
                          style={avatarStyle(c.name)}
                        >
                          {initials(c.name)}
                        </button>
                        <div>
                          <button
                            className="record-link"
                            onClick={() => onOpen(c.id)}
                          >
                            <span>{c.name}</span>
                            <ArrowUpRight size={12} aria-hidden="true" />
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
                    <td data-label="CPM ID">
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
                    <td data-label="Status">
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
                    <td data-label="Location">
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
                    <td className="col-optional" data-label="Experience">
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
                    <td data-label="Skills">
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
                    <td className="col-optional" data-label="Expected salary">
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
                    <td data-label="Contact">
                      <div className="stacked-cells">
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
                      </div>
                    </td>
                    <td data-label="Jobs">
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
          </TableViewport>
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
    </>
  );
}
