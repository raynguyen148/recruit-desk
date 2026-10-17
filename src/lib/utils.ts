import type { CSSProperties } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const displayDate = (s: string) =>
  s
    ? new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString(
        "en-GB",
        { day: "2-digit", month: "2-digit", year: "numeric" },
      )
    : "—";
/** First and last word, so "Nguyễn Văn An" reads "NA", not "NV". */
export const initials = (s: string) => {
  const words = s.split(/\s+/).filter(Boolean);
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return (
    picked
      .map((v) => v[0])
      .join("")
      .toUpperCase() || "?"
  );
};

/** A stable hue per name so people are easier to tell apart at a glance. */
export const avatarStyle = (name: string): CSSProperties => {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { ["--avatar-hue" as string]: hash % 360 };
};

/** A safe http(s) link for a LinkedIn profile, or "" when the value is not a web address. */
export function linkedinHref(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  try {
    const url = new URL(
      /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`,
    );
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}
export const CPM_BASE_URL = "https://cbtwapac.atlassian.net/browse/";
export const cpmUrl = (cpmID: string) =>
  CPM_BASE_URL + encodeURIComponent(cpmID.trim());
