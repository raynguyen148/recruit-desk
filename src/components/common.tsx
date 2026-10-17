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
  X,
  MoveHorizontal,
} from "lucide-react";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="search-box">
      <Search size={16} />
      <input
        ref={input}
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
        >
          <X size={14} aria-hidden="true" />
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
  id,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="detail-section" id={id}>
      <div className="section-heading">
        <h3>{title}</h3>
        {action}
      </div>
      <div className="section-content">{children}</div>
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

/** Keep wide records keyboard-scrollable, with a hint only when columns are offscreen. */
export function TableViewport({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => {
      const next = {
        left: element.scrollLeft > 2,
        right:
          element.scrollWidth - element.clientWidth - element.scrollLeft > 2,
      };
      setOverflow((old) =>
        old.left === next.left && old.right === next.right ? old : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    element.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, []);
  return (
    <>
      <div
        ref={viewport}
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label={label}
        data-overflow-left={overflow.left}
        data-overflow-right={overflow.right}
      >
        {children}
      </div>
      {(overflow.left || overflow.right) && (
        <div className="table-scroll-hint">
          <MoveHorizontal size={13} aria-hidden="true" /> Scroll horizontally
          for more details
        </div>
      )}
    </>
  );
}
