import { useEffect, useRef, useState } from "react";
import { Bookmark, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { deleteView, saveView } from "../lib/db";
import type { SavedView } from "../lib/types";

type Page = SavedView["page"];

/** Saves and re-applies a list page's tab, filters, search and sort. */
export function SavedViews({
  page,
  views,
  current,
  onApply,
}: {
  page: Page;
  views: SavedView[] | undefined;
  current: () => Record<string, string>;
  onApply: (state: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const mine = (views ?? []).filter((v) => v.page === page);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof MouseEvent && box.current?.contains(e.target as Node))
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const save = () => {
    const state = Object.fromEntries(
      Object.entries(current()).filter(([, value]) => value !== ""),
    );
    saveView({ page, name, state })
      .then(() => {
        toast.success(`Saved view “${name.trim()}”`);
        setName("");
      })
      .catch((e: Error) => toast.error(e.message));
  };
  return (
    <div className="saved-views" ref={box}>
      <Button
        variant="outline"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        <Bookmark size={14} />
        <span className="hide-small">Views</span>
        {mine.length > 0 && <span className="filter-count">{mine.length}</span>}
      </Button>
      {open && (
        <div className="saved-views-menu" role="group" aria-label="Saved views">
          {mine.length === 0 ? (
            <p className="saved-views-empty">
              Save the current tab, filters and sort to reuse them later.
            </p>
          ) : (
            <ul>
              {mine.map((view) => (
                <li key={view.id}>
                  <button
                    onClick={() => {
                      onApply(view.state);
                      setOpen(false);
                    }}
                  >
                    {view.name}
                  </button>
                  <button
                    className="saved-view-remove"
                    aria-label={`Delete view ${view.name}`}
                    onClick={() =>
                      void deleteView(view.id).catch((e: Error) =>
                        toast.error(e.message),
                      )
                    }
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) save();
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this view"
              aria-label="View name"
              maxLength={60}
            />
            <Button type="submit" disabled={!name.trim()}>
              Save
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

type Sort = { key: string; desc: boolean };
export const encodeSort = (sort: Sort) =>
  `${sort.key}:${sort.desc ? "desc" : "asc"}`;
export function decodeSort(value: string | undefined, fallback: Sort): Sort {
  const [key, dir] = (value ?? "").split(":");
  return key && (dir === "asc" || dir === "desc")
    ? { key, desc: dir === "desc" }
    : fallback;
}
