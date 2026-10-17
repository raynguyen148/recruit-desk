import { useState, type DragEvent, type KeyboardEvent } from "react";
import { toneOf } from "../components/common";
import { followUpBucket } from "../lib/followups";
import { displayDate } from "../lib/utils";
import { stages, type Application } from "../lib/types";

export type BoardCard = {
  application: Application;
  person: string;
  role: string;
};

/** One column per stage; drag a card, or focus it and press Alt+←/→, to change its stage. */
export function Board({
  cards,
  onOpen,
  onMove,
}: {
  cards: BoardCard[];
  onOpen: (id: string) => void;
  onMove: (application: Application, stage: string) => void;
}) {
  const [over, setOver] = useState("");
  const byStage = new Map<string, BoardCard[]>(stages.map((s) => [s, []]));
  for (const card of cards) byStage.get(card.application.stage)?.push(card);
  // Earliest follow-up first; cards without one settle at the bottom.
  for (const list of byStage.values())
    list.sort((a, b) =>
      (a.application.followUp || "9999").localeCompare(
        b.application.followUp || "9999",
      ),
    );
  const drop = (event: DragEvent, stage: string) => {
    event.preventDefault();
    setOver("");
    const id = event.dataTransfer.getData("text/plain");
    const card = cards.find((c) => c.application.id === id);
    if (card && card.application.stage !== stage)
      onMove(card.application, stage);
  };
  const key = (event: KeyboardEvent, application: Application) => {
    if (!event.altKey || !["ArrowLeft", "ArrowRight"].includes(event.key))
      return;
    event.preventDefault();
    const at = stages.indexOf(application.stage as (typeof stages)[number]);
    const next = stages[at + (event.key === "ArrowRight" ? 1 : -1)];
    if (next) onMove(application, next);
  };
  return (
    <div className="board" role="group" aria-label="Applications by stage">
      {stages.map((stage) => {
        const list = byStage.get(stage) ?? [];
        return (
          <section
            key={stage}
            className="board-column"
            data-tone={toneOf(stage)}
            data-over={over === stage}
            aria-label={`${stage}, ${list.length}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (over !== stage) setOver(stage);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setOver("");
            }}
            onDrop={(e) => drop(e, stage)}
          >
            <h3>
              {stage}
              <span className="count">{list.length}</span>
            </h3>
            <ul>
              {list.map(({ application: a, person, role }) => {
                const bucket = followUpBucket(a);
                return (
                  <li
                    key={a.id}
                    className="board-card"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", a.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setOver("")}
                  >
                    <button
                      aria-label={`Open ${person} for ${role}`}
                      aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
                      onClick={() => onOpen(a.id)}
                      onKeyDown={(e) => key(e, a)}
                    >
                      <strong>{person}</strong>
                      <span>{role}</span>
                      {a.followUp && (
                        <time
                          dateTime={a.followUp.slice(0, 10)}
                          data-bucket={bucket ?? undefined}
                        >
                          {bucket === "overdue" ? "Overdue · " : ""}
                          {displayDate(a.followUp)}
                        </time>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
