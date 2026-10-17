import { useDeferredValue, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  Upload,
  ArrowUpRight,
  SlidersHorizontal,
  X,
  Download,
  FileSpreadsheet,
  Trash2,
  Link2,
  ExternalLink,
  Linkedin,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Confirm } from "../components/ui/confirm";
import { BulkBar, PageCheck, RowCheck } from "../components/bulk-bar";
import { LinkJobDialog } from "../components/link-job-dialog";
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
import { bulkPatch, bulkRemove } from "../lib/bulk";
import { downloadText, toCSV } from "../lib/csv";
import { useSelection } from "../lib/selection";
import {
  avatarStyle,
  cpmUrl,
  displayDate,
  initials,
  linkedinHref,
} from "../lib/utils";
import { ContactDot } from "../components/contact-dot";
import { CopyContact } from "../components/copy-contact";
import {
  candidateSearchText,
  countBy,
  fold,
  matchesTerms,
  searchTerms,
} from "../lib/search";
import type { Candidate, Dataset } from "../lib/types";
import { candidateStatuses } from "../lib/types";
import { compareSalary, matchesSalary, salaryCurrencies } from "../lib/salary";
import { SavedViews, encodeSort, decodeSort } from "../components/saved-views";
const candidateCollator = new Intl.Collator(undefined, { numeric: true });
type Choice = { value: string; label: string };
/** Unique values by folded key, keeping the first spelling as the label. */
function distinct(values: string[]): Choice[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const key = fold(value.trim());
    if (key && !seen.has(key)) seen.set(key, value.trim());
  }
  return [...seen]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => candidateCollator.compare(a.label, b.label));
}
const labelOf = (choices: Choice[], value: string) =>
  choices.find((c) => c.value === value)?.label ?? value;

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
  const [pay, setPay] = useState("");
  const [filters, setFilters] = useState(false);
  const [sort, setSort] = useState({ key: "name", desc: false });
  const [page, setPage] = useState(1);
  const { flush } = useAutosave();
  const tabsRef = useTabIndicator<HTMLDivElement>();
  const [linking, setLinking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const change = async (action: () => void) => {
    if (await flush()) action();
  };
  const reset = () =>
    void change(() => {
      setLocation("");
      setSkill("");
      setPay("");
      setSearch("");
    });
  // Filter values are folded so "react" and "React", or "Ha Noi" and "Hà Nội", merge.
  const locations = useMemo(
    () => distinct(data.candidates.map((c) => c.location)),
    [data.candidates],
  );
  const currencies = useMemo(
    () => salaryCurrencies(data.candidates.map((c) => c.salary)),
    [data.candidates],
  );
  const skills = useMemo(
    () => distinct(data.candidates.flatMap((c) => c.skills)),
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
          (!location || fold(c.location) === location) &&
          (!skill || c.skills.some((x) => fold(x) === skill)) &&
          matchesSalary(c.salary, pay) &&
          (!terms.length || matchesTerms(searchText.get(c.id) ?? "", terms)),
      )
      .sort((a, b) => {
        if (sort.key === "salary")
          return compareSalary(a.salary, b.salary, sort.desc);
        // Status sorts by pipeline order, not alphabetically.
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
  }, [data.candidates, query, status, location, skill, pay, sort, searchText]);
  useEffect(() => setPage(1), [query, status, location, skill, pay]);
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
      setSort({
        key,
        desc: sort.key === key ? !sort.desc : key === "updatedAt",
      });
  };
  const visible = rows.slice(
    (page - 1) * data.settings.pageSize,
    page * data.settings.pageSize,
  );
  const statusCounts = countBy(data.candidates, (c) => c.status);
  const ids = useMemo(() => rows.map((c) => c.id), [rows]);
  const selection = useSelection(ids);
  const pageIds = visible.map((c) => c.id);
  const chosen = () =>
    data.candidates.filter((c) => selection.selected.has(c.id));
  async function setStatusForSelected(next: string) {
    if (!next || bulkBusy || !(await flush())) return;
    setBulkBusy(true);
    try {
      const records = chosen();
      const undo = await bulkPatch("candidates", records, { status: next });
      toast.success(`${records.length} marked ${next}`, {
        action: {
          label: "Undo",
          onClick: () => void undo().catch((e) => toast.error(e.message)),
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBulkBusy(false);
    }
  }
  function exportSelected() {
    const records = chosen();
    downloadText(
      toCSV(
        records.map((c) => ({
          "CPM ID": c.cpmID,
          Name: c.name,
          Headline: c.headline,
          Status: c.status,
          Location: c.location,
          "Years of experience": c.yearsExperience,
          Skills: c.skills.join("; "),
          "Expected salary": c.salary,
          Email: c.email,
          Phone: c.phone,
          "LinkedIn URL": c.linkedinURL,
          Source: c.source,
        })),
      ),
      `recruitdesk-candidates-${new Date().toISOString().slice(0, 10)}.csv`,
      "text/csv;charset=utf-8",
    );
    toast.success(`Exported ${records.length} candidates`);
  }
  async function removeSelected() {
    setBulkBusy(true);
    const count = selection.count;
    const failed = await bulkRemove("candidates", [...selection.selected]);
    setBulkBusy(false);
    setDeleting(false);
    selection.clear();
    if (failed) toast.error(`${failed} could not be deleted`);
    else toast.success(`${count} candidates deleted`);
  }
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
        {candidateStatuses.map((name) => (
          <button
            key={name}
            className={status === name ? "active" : ""}
            aria-pressed={status === name}
            onClick={() => void change(() => setStatus(name))}
          >
            {name} <span>{statusCounts.get(name) ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={(v) => void change(() => setSearch(v))}
          placeholder="Search profiles, CPM ID, skills, or notes…"
        />
        <div className="toolbar-actions btn-group">
          <SavedViews
            page="candidates"
            views={data.settings.savedViews}
            current={() => ({
              search,
              status,
              location,
              skill,
              pay,
              sort: encodeSort(sort),
            })}
            onApply={(s) =>
              void change(() => {
                setSearch(s.search ?? "");
                setStatus(s.status ?? "");
                setLocation(s.location ?? "");
                setSkill(s.skill ?? "");
                setPay(s.pay ?? "");
                setSort(decodeSort(s.sort, { key: "name", desc: false }));
                setPage(1);
              })
            }
          />
          <Button
            variant="outline"
            onClick={() => setFilters(!filters)}
            aria-expanded={filters}
            aria-controls="candidate-filters"
            className={filters ? "filter-toggle active" : "filter-toggle"}
          >
            <SlidersHorizontal size={14} />
            Filters
            {[location, skill, pay].filter(Boolean).length > 0 && (
              <span className="filter-count">
                {[location, skill, pay].filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
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
          <Select
            label="Salary filter"
            value={pay}
            onChange={(v) => void change(() => setPay(v))}
            options={[
              { value: "", label: "Any salary" },
              ...currencies.map((x) => ({ value: x, label: `${x} listed` })),
              { value: "none", label: "No salary listed" },
            ]}
          />
          <Button variant="ghost" onClick={reset}>
            <X size={14} />
            Reset
          </Button>
        </div>
      )}
      {!filters && (location || skill || pay) && (
        <div className="active-filters" aria-label="Active candidate filters">
          {[
            {
              label: "Location",
              value: labelOf(locations, location),
              clear: () => setLocation(""),
            },
            {
              label: "Skill",
              value: labelOf(skills, skill),
              clear: () => setSkill(""),
            },
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
          <BulkBar selection={selection} total={rows.length} noun="candidates">
            <Select
              label="Set status for selected"
              value=""
              disabled={bulkBusy}
              options={[
                { value: "", label: "Set status…" },
                ...candidateStatuses,
              ]}
              onChange={(v) => void setStatusForSelected(v)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLinking(true)}
            >
              <Link2 size={14} />
              Add to job
            </Button>
            <Button variant="outline" size="sm" onClick={exportSelected}>
              <FileSpreadsheet size={14} />
              Export CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="danger-text"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={14} />
              Delete
            </Button>
          </BulkBar>
          <TableViewport label="Candidates, scroll for more columns">
            <table className="data-table candidate-table">
              <caption className="sr-only">
                Candidate profiles and availability
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky-name">
                    <div className="name-head">
                      <PageCheck pageIds={pageIds} selection={selection} />
                      <SortHeader
                        label="Candidate"
                        field="name"
                        sort={sort}
                        onSort={changeSort}
                      />
                    </div>
                  </th>
                  <th scope="col">CPM link</th>
                  <th scope="col">LinkedIn</th>
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
                      label="Exp. (yrs)"
                      field="yearsExperience"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                  <th scope="col">Skills</th>
                  <th scope="col" className="col-optional">
                    <SortHeader
                      label="Expected salary"
                      field="salary"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                  <th scope="col">Jobs</th>
                  <th scope="col">
                    <SortHeader
                      label="Updated"
                      field="updatedAt"
                      sort={sort}
                      onSort={changeSort}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id}>
                    <td className="sticky-name" data-label="Candidate">
                      <div className="person-cell">
                        <RowCheck
                          checked={selection.selected.has(c.id)}
                          label={`Select ${c.name}`}
                          onChange={() => selection.toggle(c.id)}
                        />
                        <span className="avatar-wrap">
                          <button
                            className="avatar"
                            onClick={() => onOpen(c.id)}
                            aria-label={`Open ${c.name}`}
                            style={avatarStyle(c.name)}
                          >
                            {initials(c.name)}
                          </button>
                          <ContactDot contacts={c.contacts} name={c.name} />
                        </span>
                        <div>
                          <button
                            className="record-link"
                            onClick={() => onOpen(c.id)}
                          >
                            <span>{c.name}</span>
                            <ArrowUpRight size={12} aria-hidden="true" />
                          </button>
                          <CopyContact
                            email={c.email}
                            phone={c.phone}
                            name={c.name}
                          />
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
                    <td data-label="CPM link">
                      {c.cpmID.trim() ? (
                        <a
                          className="cpm-link"
                          href={cpmUrl(c.cpmID)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Open ${c.cpmID} in CPM`}
                          aria-label={`Open ${c.cpmID} for ${c.name} in CPM (new tab)`}
                        >
                          <ExternalLink size={15} aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td data-label="LinkedIn">
                      {linkedinHref(c.linkedinURL) ? (
                        <a
                          className="cpm-link"
                          href={linkedinHref(c.linkedinURL)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open LinkedIn profile"
                          aria-label={`Open LinkedIn profile of ${c.name} (new tab)`}
                        >
                          <Linkedin size={15} aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td data-label="Status">
                      <div className="status-cell" data-status={c.status}>
                        <Select
                          label={`Status for ${c.name}`}
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
                    <td data-label="Jobs">
                      <button
                        className="job-count"
                        aria-label={`View jobs for ${c.name}`}
                        onClick={() => onOpen(c.id)}
                      >
                        {applicationCounts.get(c.id) ?? 0}
                      </button>
                    </td>
                    <td className="updated-cell" data-label="Updated">
                      <time
                        dateTime={c.updatedAt}
                        title={new Date(c.updatedAt).toLocaleString()}
                      >
                        {displayDate(c.updatedAt)}
                      </time>
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
      {linking && (
        <LinkJobDialog
          data={data}
          candidateIds={[...selection.selected]}
          onClose={() => setLinking(false)}
          onDone={() => {
            setLinking(false);
            selection.clear();
          }}
        />
      )}
      <Confirm
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${selection.count} candidates?`}
        description="Their profiles and applications are removed from this browser. This cannot be undone."
        onConfirm={() => void removeSelected()}
        busy={bulkBusy}
      />
    </>
  );
}
