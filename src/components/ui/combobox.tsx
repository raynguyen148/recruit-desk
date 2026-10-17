import { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { fold, matchesTerms, searchTerms } from "../../lib/search";

const MAX_SHOWN = 100;
type Option = { value: string; label: string; hint?: string };

/** Searchable single-select. Diacritics are ignored, so "nguyen" finds "Nguyễn". */
export function Combobox({
  value,
  onChange,
  options,
  label,
  placeholder = "Search…",
  emptyLabel = "No matches",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  label: string;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const selected = options.find((o) => o.value === value);
  // Folding every option on each keystroke is slow with thousands of records.
  const folded = useMemo(
    () => options.map((o) => fold(`${o.label} ${o.hint ?? ""}`)),
    [options],
  );
  const matches = useMemo(() => {
    const terms = searchTerms(query);
    return terms.length
      ? options.filter((_, i) => matchesTerms(folded[i], terms))
      : options;
  }, [options, folded, query]);
  // Rendering thousands of rows freezes the list; narrow by typing instead.
  const shown = useMemo(() => {
    const head = matches.slice(0, MAX_SHOWN);
    const current = options.find((o) => o.value === value);
    return current && !head.includes(current) && !query
      ? [current, ...head.slice(0, MAX_SHOWN - 1)]
      : head;
  }, [matches, options, value, query]);
  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const pick = (option: Option | undefined) => {
    if (!option) return;
    onChange(option.value);
    close();
  };
  const optionId = (i: number) => `${id}-option-${i}`;
  return (
    <div
      className="combobox"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) close();
      }}
    >
      <input
        ref={input}
        className="input combobox-input"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={
          open && shown[active] ? optionId(active) : undefined
        }
        autoComplete="off"
        placeholder={selected ? undefined : placeholder}
        value={open ? query : (selected?.label ?? "")}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive(
              (a) => (a + step + shown.length) % Math.max(shown.length, 1),
            );
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            pick(shown[active]);
          } else if (e.key === "Escape" && open) {
            e.stopPropagation();
            close();
          }
        }}
      />
      <ChevronDown size={14} aria-hidden="true" className="combobox-icon" />
      {open && (
        <ul
          className="combobox-list"
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
        >
          {shown.length ? (
            shown.map((o, i) => (
              <li
                key={o.value || "__empty"}
                id={optionId(i)}
                role="option"
                aria-label={o.hint ? `${o.label} · ${o.hint}` : o.label}
                aria-selected={o.value === value}
                data-active={i === active}
                // Keep focus in the input so blur does not close the list first.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={(e) => {
                  // Inside a <label>, the click would otherwise re-focus the input and reopen the list.
                  e.preventDefault();
                  pick(o);
                }}
              >
                <span>{o.label}</span>
                {o.hint && <small>{o.hint}</small>}
                {o.value === value && <Check size={14} aria-hidden="true" />}
              </li>
            ))
          ) : (
            <li className="combobox-empty" role="presentation">
              {emptyLabel}
            </li>
          )}
          {matches.length > MAX_SHOWN && (
            <li className="combobox-empty" role="presentation">
              Showing {MAX_SHOWN} of {matches.length.toLocaleString()} — keep
              typing to narrow
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
