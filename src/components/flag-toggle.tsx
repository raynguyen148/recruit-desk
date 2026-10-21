import { Check, Star } from "lucide-react";

const icons = { check: Check, star: Star };

/** Compact Yes/No pill for boolean flags; reads differently from row checkboxes. */
export function FlagToggle({
  value,
  label,
  icon,
  onChange,
}: {
  value: boolean;
  label: string;
  icon: keyof typeof icons;
  onChange: (next: boolean) => void;
}) {
  const Icon = icons[icon];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      className="flag-toggle"
      data-icon={icon}
      onClick={() => onChange(!value)}
    >
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      <span>{value ? "Yes" : "No"}</span>
    </button>
  );
}
