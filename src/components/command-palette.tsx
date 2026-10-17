import { useMemo, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Briefcase,
  Building2,
  CalendarCheck,
  CornerDownLeft,
  GitPullRequestArrow,
  Moon,
  Plus,
  Search,
  Settings2,
  Upload,
  User,
  Users,
  ArrowDownToLine,
} from "lucide-react";
import { useReturnFocus } from "./ui/dialog";
import {
  candidateSearchText,
  matchesTerms,
  searchable,
  searchTerms,
} from "../lib/search";
import type { Dataset, EntityKind } from "../lib/types";

export type PaletteActions = {
  go: (page: EntityKind | "today" | "settings") => void;
  create: (kind: EntityKind) => void;
  open: (kind: EntityKind, id: string) => void;
  importCSV: () => void;
  backup: () => void;
  cycleTheme: () => void;
};
type Item = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: ReactNode;
  run: () => void;
};
const PER_KIND = 6;

export function CommandPalette({
  data,
  actions,
  onClose,
}: {
  data: Dataset;
  actions: PaletteActions;
  onClose: () => void;
}) {
  const returnFocus = useReturnFocus();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const commands = useMemo<Item[]>(() => {
    const c = (
      id: string,
      group: string,
      label: string,
      icon: ReactNode,
      run: () => void,
    ): Item => ({ id, group, label, icon, run });
    return [
      c("go-today", "Go to", "Today", <CalendarCheck size={15} />, () =>
        actions.go("today"),
      ),
      c("go-candidates", "Go to", "Candidates", <Users size={15} />, () =>
        actions.go("candidates"),
      ),
      c("go-jobs", "Go to", "Jobs", <Briefcase size={15} />, () =>
        actions.go("jobs"),
      ),
      c(
        "go-applications",
        "Go to",
        "Applications",
        <GitPullRequestArrow size={15} />,
        () => actions.go("applications"),
      ),
      c("go-companies", "Go to", "Companies", <Building2 size={15} />, () =>
        actions.go("companies"),
      ),
      c(
        "go-settings",
        "Go to",
        "Settings & data",
        <Settings2 size={15} />,
        () => actions.go("settings"),
      ),
      c("new-candidate", "Create", "New candidate", <Plus size={15} />, () =>
        actions.create("candidates"),
      ),
      c("new-job", "Create", "New job", <Plus size={15} />, () =>
        actions.create("jobs"),
      ),
      c("new-company", "Create", "New company", <Plus size={15} />, () =>
        actions.create("companies"),
      ),
      c(
        "new-application",
        "Create",
        "New application",
        <Plus size={15} />,
        () => actions.create("applications"),
      ),
      c(
        "import",
        "Data",
        "Import vendor CSV",
        <Upload size={15} />,
        actions.importCSV,
      ),
      c(
        "backup",
        "Data",
        "Back up workspace",
        <ArrowDownToLine size={15} />,
        actions.backup,
      ),
      c(
        "theme",
        "Data",
        "Switch theme",
        <Moon size={15} />,
        actions.cycleTheme,
      ),
    ];
  }, [actions]);
  const items = useMemo(() => {
    const terms = searchTerms(query);
    if (!terms.length) return commands;
    const companies = new Map(data.companies.map((x) => [x.id, x.name]));
    const found: Item[] = commands.filter((i) =>
      matchesTerms(searchable([i.group, i.label]), terms),
    );
    const record = (
      kind: EntityKind,
      group: string,
      icon: ReactNode,
      list: { id: string; label: string; hint?: string; text: string }[],
    ) => {
      list
        .filter((r) => matchesTerms(r.text, terms))
        .slice(0, PER_KIND)
        .forEach((r) =>
          found.push({
            id: `${kind}-${r.id}`,
            group,
            label: r.label,
            hint: r.hint,
            icon,
            run: () => actions.open(kind, r.id),
          }),
        );
    };
    record(
      "candidates",
      "Candidates",
      <User size={15} />,
      data.candidates.map((x) => ({
        id: x.id,
        label: x.name,
        hint: [x.cpmID, x.headline].filter(Boolean).join(" · "),
        text: candidateSearchText(x),
      })),
    );
    record(
      "jobs",
      "Jobs",
      <Briefcase size={15} />,
      data.jobs.map((x) => ({
        id: x.id,
        label: x.title,
        hint: companies.get(x.companyId),
        text: searchable([
          x.title,
          companies.get(x.companyId),
          x.location,
          ...x.skills,
        ]),
      })),
    );
    record(
      "companies",
      "Companies",
      <Building2 size={15} />,
      data.companies.map((x) => ({
        id: x.id,
        label: x.name,
        hint: x.industry,
        text: searchable([x.name, x.industry, x.location, x.contactName]),
      })),
    );
    return found;
  }, [query, commands, data, actions]);
  const run = (item?: Item) => {
    if (!item) return;
    onClose();
    // Let the palette finish closing so focus returns before the next dialog opens.
    setTimeout(item.run, 0);
  };
  const at = Math.min(active, Math.max(items.length - 1, 0));
  return (
    <DialogPrimitive.Root open onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className="palette"
          aria-describedby={undefined}
          {...returnFocus}
        >
          <DialogPrimitive.Title className="sr-only">
            Command palette
          </DialogPrimitive.Title>
          <div className="palette-input">
            <Search size={16} aria-hidden="true" />
            <input
              autoFocus
              role="combobox"
              aria-label="Search records and commands"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-activedescendant={
                items[at] ? `palette-${items[at].id}` : undefined
              }
              placeholder="Search records, or type a command…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const step = e.key === "ArrowDown" ? 1 : -1;
                  setActive(
                    (at + step + items.length) % Math.max(items.length, 1),
                  );
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  run(items[at]);
                }
              }}
            />
            <kbd>Esc</kbd>
          </div>
          <ul id="palette-list" role="listbox" aria-label="Results">
            {items.map((item, i) => (
              <li
                key={item.id}
                id={`palette-${item.id}`}
                role="option"
                aria-selected={i === at}
                data-active={i === at}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(item)}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.hint && <small>{item.hint}</small>}
                <em>{item.group}</em>
                {i === at && <CornerDownLeft size={13} aria-hidden="true" />}
              </li>
            ))}
            {!items.length && (
              <li className="palette-empty" role="presentation">
                Nothing matches “{query}”
              </li>
            )}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
