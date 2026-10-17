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
