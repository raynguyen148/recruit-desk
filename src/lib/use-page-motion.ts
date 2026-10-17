import { useLayoutEffect, useRef } from "react";

/** One bounded transition on deliberate navigation, never on live data writes. */
export function usePageMotion(page: string, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!enabled || !ref.current) return;
    if (previous.current === null) {
      previous.current = page;
      return;
    }
    if (previous.current === page) return;
    previous.current = page;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !ref.current.animate) return;
    const animation = ref.current.animate([{ opacity: 0.88 }, { opacity: 1 }], {
      duration: 160,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    });
    animation.id = "recruitdesk-page-change";
    const reduce = () => {
      if (preference.matches) animation.cancel();
    };
    preference.addEventListener("change", reduce);
    return () => {
      preference.removeEventListener("change", reduce);
      animation.cancel();
    };
  }, [page, enabled]);
  return ref;
}
