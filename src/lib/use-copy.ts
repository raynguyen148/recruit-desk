import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Copies text and reports success on the control itself: `copied` stays true
 * for a couple of seconds so the button can highlight, instead of a toast.
 */
export function useCopy(duration = 2500) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), duration);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  };
  return { copied, copy };
}
