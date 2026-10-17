import type { Application } from "./types";

export const closedStages: readonly string[] = [
  "Hired",
  "Rejected",
  "Withdrawn",
];

const pad = (n: number) => String(n).padStart(2, "0");
/** Local calendar day as YYYY-MM-DD, the same shape follow-up dates are stored in. */
export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Shift a YYYY-MM-DD key by whole days without time-zone surprises. */
export function addDays(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + days));
}

export type FollowUpBucket = "overdue" | "today" | "week";

/** Open applications with a follow-up due within the next seven days, or already late. */
export function followUpBucket(
  application: Pick<Application, "followUp" | "stage">,
  today = dayKey(),
): FollowUpBucket | null {
  if (!application.followUp || closedStages.includes(application.stage))
    return null;
  const due = application.followUp.slice(0, 10);
  if (due < today) return "overdue";
  if (due === today) return "today";
  return due <= addDays(today, 7) ? "week" : null;
}
