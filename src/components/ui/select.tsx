import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = "Select…",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  label: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <SelectPrimitive.Root
      value={value || "__empty"}
      onValueChange={(v) => onChange(v === "__empty" ? "" : v)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger aria-label={label} className="select-trigger">
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown size={14} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="select-content"
          position="popper"
          sideOffset={5}
        >
          <SelectPrimitive.Viewport>
            {options
              .map((o) => (typeof o === "string" ? { value: o, label: o } : o))
              .map((o) => (
                <SelectPrimitive.Item
                  className="select-item"
                  key={o.value || "__empty"}
                  value={o.value || "__empty"}
                >
                  <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check size={14} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
