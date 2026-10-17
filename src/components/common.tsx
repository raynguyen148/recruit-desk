import {
  Search,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Users,
  BriefcaseBusiness,
} from "lucide-react";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import type { ReactNode } from "react";
export function Badge({ value }: { value: string }) {
  const tone = ["Available", "Open", "Hired"].includes(value)
    ? "green"
    : ["Interview", "Offer", "Screening", "Submitted"].includes(value)
      ? "blue"
      : ["On hold", "Not looking", "Contacted"].includes(value)
        ? "amber"
        : ["Rejected", "Do not contact"].includes(value)
          ? "red"
          : "neutral";
  return (
    <span className={`badge ${tone}`}>
      <i />
      {value}
    </span>
  );
}
export function PageHeading({
  title,
  count,
  description,
  actions,
}: {
  title: string;
  count?: number;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>
          {title}
          {count !== undefined && (
            <span className="count">{count.toLocaleString()}</span>
          )}
        </h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">{actions}</div>
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="search-box">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange("")}>
          ×
        </button>
      )}
    </div>
  );
}
export function SortHeader({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: string;
  sort: { key: string; desc: boolean };
  onSort: (key: string) => void;
}) {
  return (
    <button
      className="sort-header"
      aria-label={`${label}${sort.key === field ? `, sorted ${sort.desc ? "descending" : "ascending"}` : ""}. Sort ${sort.key === field && !sort.desc ? "descending" : "ascending"}`}
      onClick={() => onSort(field)}
    >
      {label}
      {sort.key === field ? (
        sort.desc ? (
          <ArrowDown size={13} />
        ) : (
          <ArrowUp size={13} />
        )
      ) : (
        <ArrowUpDown size={12} className="sort-idle" />
      )}
    </button>
  );
}
export function Pagination({
  page,
  setPage,
  total,
  pageSize,
}: {
  page: number;
  setPage: (v: number) => void;
  total: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="table-footer">
      <span>
        {total
          ? `${((page - 1) * pageSize + 1).toLocaleString()}–${Math.min(page * pageSize, total).toLocaleString()} of ${total.toLocaleString()}`
          : "0 records"}
      </span>
      <div>
        <span>
          Page {page} of {pages}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
  icon = "people",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: "people" | "jobs";
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        {icon === "people" ? (
          <Users size={30} />
        ) : (
          <BriefcaseBusiness size={30} />
        )}
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="detail-section">
      <div className="section-heading">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
export function TextInput({
  label,
  value,
  onChange,
  required = false,
  placeholder = "",
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Field label={label}>
      <input
        className="input"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        type={type}
      />
    </Field>
  );
}
