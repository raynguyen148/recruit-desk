import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Mail, Phone } from "lucide-react";
import { useCopy } from "../lib/use-copy";

/** Icon that reveals an email or phone on hover/focus; clicking copies it. */
function CopyIcon({
  kind,
  value,
  name,
}: {
  kind: "Email" | "Phone";
  value: string;
  name: string;
}) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const { copied, copy } = useCopy();
  const Icon = copied ? Check : kind === "Email" ? Mail : Phone;
  const show = () => {
    const rect = button.current?.getBoundingClientRect();
    if (rect)
      setPos({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left - 8, window.innerWidth - 268)),
      });
  };
  return (
    <>
      <button
        ref={button}
        type="button"
        className={copied ? "copy-contact copied" : "copy-contact"}
        aria-label={`Copy ${kind.toLowerCase()} of ${name}: ${value}`}
        aria-describedby={pos ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onFocus={show}
        onBlur={() => setPos(null)}
        onKeyDown={(e) => e.key === "Escape" && setPos(null)}
        onClick={() => void copy(value)}
      >
        <Icon size={13} aria-hidden="true" />
      </button>
      {pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            className="contact-popover copy-tip"
            style={{ top: pos.top, left: pos.left }}
          >
            <span>{value}</span>
            <small>{copied ? "Copied" : "Click to copy"}</small>
          </div>,
          document.body,
        )}
    </>
  );
}

export function CopyContact({
  email,
  phone,
  name,
}: {
  email: string;
  phone: string;
  name: string;
}) {
  if (!email.trim() && !phone.trim()) return null;
  return (
    <span className="copy-contacts">
      {email.trim() && (
        <CopyIcon kind="Email" value={email.trim()} name={name} />
      )}
      {phone.trim() && (
        <CopyIcon kind="Phone" value={phone.trim()} name={name} />
      )}
    </span>
  );
}
