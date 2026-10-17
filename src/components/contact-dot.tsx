import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Contact } from "../lib/types";
import { displayDate } from "../lib/utils";

const PREVIEW = 3;
const byNewest = (a: Contact, b: Contact) => b.date.localeCompare(a.date);

/**
 * Presence-style dot on the avatar: filled once a contact record exists,
 * hollow while the candidate has never been contacted. Hover, focus or tap
 * opens a short contact history.
 */
export function ContactDot({
  contacts,
  name,
}: {
  contacts: Contact[];
  name: string;
}) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const contacted = contacts.length > 0;
  const recent = [...contacts].sort(byNewest);

  const show = () => {
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 248;
    setPos({
      top: rect.bottom + 8,
      left: Math.max(
        8,
        Math.min(rect.left - 12, window.innerWidth - width - 8),
      ),
    });
    setOpen(true);
  };
  const hide = () => {
    setOpen(false);
    setPinned(false);
  };
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      hide();
    };
    window.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);
  useEffect(() => {
    if (!pinned) return;
    const away = (e: PointerEvent) => {
      if (!button.current?.contains(e.target as Node)) hide();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [pinned]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`contact-dot ${contacted ? "contacted" : "untouched"}`}
        aria-label={
          contacted
            ? `${name}: contacted ${contacts.length} ${contacts.length === 1 ? "time" : "times"}, last on ${displayDate(recent[0].date)}`
            : `${name}: not contacted yet`
        }
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={() => !pinned && hide()}
        onFocus={show}
        onBlur={hide}
        onClick={() => {
          if (pinned) hide();
          else {
            show();
            setPinned(true);
          }
        }}
      >
        <span aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            className="contact-popover"
            style={{ top: pos.top, left: pos.left }}
          >
            {contacted ? (
              <>
                <div className="contact-popover-head">
                  Contact history <span>{contacts.length}</span>
                </div>
                <ul>
                  {recent.slice(0, PREVIEW).map((c) => (
                    <li key={c.id}>
                      <div>
                        <strong>{c.channel || "Contact"}</strong>
                        <time>{displayDate(c.date)}</time>
                      </div>
                      {c.note && <p>{c.note}</p>}
                    </li>
                  ))}
                </ul>
                {recent.length > PREVIEW && (
                  <div className="contact-popover-more">
                    +{recent.length - PREVIEW} earlier
                  </div>
                )}
              </>
            ) : (
              <div className="contact-popover-empty">Not contacted yet</div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
