import { useMemo } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Check, CalendarCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge, EmptyState, PageHeading } from "../components/common";
import { safeAction } from "../components/autosave";
import { patchEntity } from "../lib/db";
import {
  addDays,
  dayKey,
  followUpBucket,
  type FollowUpBucket,
} from "../lib/followups";
import { displayDate } from "../lib/utils";
import type { Application, Dataset } from "../lib/types";

const sections: { key: FollowUpBucket; title: string }[] = [
  { key: "overdue", title: "Overdue" },
  { key: "today", title: "Due today" },
  { key: "week", title: "Next 7 days" },
];
const snoozes = [
  { days: 1, label: "+1d", name: "1 day" },
  { days: 3, label: "+3d", name: "3 days" },
  { days: 7, label: "+1w", name: "1 week" },
];

/** Change follow-up fields and offer a one-click way back. */
async function reschedule(
  application: Application,
  patch: Pick<Application, "followUp"> &
    Partial<Pick<Application, "nextAction">>,
  message: string,
) {
  const before = {
    followUp: application.followUp,
    nextAction: application.nextAction,
  };
  await safeAction(async () => {
    await patchEntity("applications", application.id, patch, before);
    toast(message, {
      action: {
        label: "Undo",
        onClick: () =>
          void safeAction(async () => {
            const after = { ...before, ...patch };
            await patchEntity("applications", application.id, before, after);
          }),
      },
    });
  });
}

export default function Today({
  data,
  onOpen,
}: {
  data: Dataset;
  onOpen: (id: string) => void;
}) {
  const today = dayKey();
  const groups = useMemo(() => {
    const candidates = new Map(data.candidates.map((x) => [x.id, x]));
    const jobs = new Map(data.jobs.map((x) => [x.id, x]));
    const companies = new Map(data.companies.map((x) => [x.id, x.name]));
    const result: Record<FollowUpBucket, Application[]> = {
      overdue: [],
      today: [],
      week: [],
    };
    for (const a of data.applications) {
      const bucket = followUpBucket(a, today);
      if (bucket) result[bucket].push(a);
    }
    for (const list of Object.values(result))
      list.sort((a, b) => a.followUp.localeCompare(b.followUp));
    return {
      result,
      label: (a: Application) => {
        const job = jobs.get(a.jobId);
        return {
          person: candidates.get(a.candidateId)?.name ?? "Missing candidate",
          role: [
            job?.title ?? "Missing job",
            companies.get(job?.companyId ?? ""),
          ]
            .filter(Boolean)
            .join(" · "),
        };
      },
    };
  }, [data, today]);
  const total = groups.result.overdue.length + groups.result.today.length;
  const empty = sections.every((s) => !groups.result[s.key].length);
  const summary = sections
    .filter((s) => groups.result[s.key].length)
    .map((s) => `${groups.result[s.key].length} ${s.title.toLowerCase()}`)
    .join(" · ");
  return (
    <>
      <PageHeading title="Today" description={summary || undefined} />
      {empty ? (
        <EmptyState
          icon="jobs"
          title="Nothing due"
          description="Set a follow-up date on an application and it will show up here."
        />
      ) : (
        sections.map(({ key, title }) =>
          groups.result[key].length ? (
            <section className="today-section" key={key} data-bucket={key}>
              <h2>
                {title}
                <span className="count">{groups.result[key].length}</span>
              </h2>
              <ul className="today-list">
                {groups.result[key].map((a) => {
                  const { person, role } = groups.label(a);
                  return (
                    <li className="today-row" key={a.id}>
                      <div className="today-main">
                        <button
                          className="record-link"
                          onClick={() => onOpen(a.id)}
                        >
                          <span>{person}</span>
                          <ArrowUpRight size={12} aria-hidden="true" />
                        </button>
                        <div className="record-subtitle">{role}</div>
                      </div>
                      <div className="today-action">
                        {a.nextAction || (
                          <span className="muted">No next action</span>
                        )}
                      </div>
                      <div className="today-meta">
                        <Badge value={a.stage} />
                        <time dateTime={a.followUp.slice(0, 10)}>
                          {displayDate(a.followUp)}
                        </time>
                      </div>
                      <div className="today-buttons">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Mark follow-up done for ${person}`}
                          onClick={() =>
                            void reschedule(
                              a,
                              { followUp: "", nextAction: "" },
                              `Follow-up done for ${person}`,
                            )
                          }
                        >
                          <Check size={14} />
                          Done
                        </Button>
                        {snoozes.map((s) => (
                          <Button
                            key={s.days}
                            size="sm"
                            variant="ghost"
                            aria-label={`Snooze ${person} by ${s.name}`}
                            onClick={() =>
                              void reschedule(
                                a,
                                { followUp: addDays(today, s.days) },
                                `Snoozed ${person} by ${s.name}`,
                              )
                            }
                          >
                            {s.label}
                          </Button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null,
        )
      )}
      {!empty && !total && (
        <p className="today-note">
          <CalendarCheck size={14} aria-hidden="true" /> You are caught up for
          today.
        </p>
      )}
    </>
  );
}
