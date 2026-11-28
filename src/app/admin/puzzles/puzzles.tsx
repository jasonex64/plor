"use client";

// Puzzle entry (docs/milestones/M06-puzzle-entry.md): an admin reviews each day a Claude session drafted
// (DECISIONS.md: Puzzle drafting) and approves it, as the approval page for a day on a clock lays it out
// (src/app/admin/puzzles/clock-day.tsx). Laid out as round 10 draws it (docs/milestones/M14-14b-2b-2-admin-build.md, criterion 4):
// the days as a row, the chosen day below.
import { useCallback, useEffect, useState } from "react";
import type { DayView } from "@/admin/puzzles";
import type { SubstringDayView } from "@/admin/substring-sets";
import { api } from "@/lib/api-client";
import { GAME } from "@/platform/game";
import { errorText } from "../../messages";
import { dayText } from "../../day-text";
import admin from "../admin.module.css";
import kit from "../../kit.module.css";
import styles from "./puzzles.module.css";
import { Line, Skeleton } from "../../skeleton";
import { tomorrowOf } from "../tomorrow";
import { hasDraft, isApproved, slotDates } from "../puzzle-dates";
import { ClockDay, LEAVE_WARNING } from "./clock-day";
import { SubstringDay } from "./substring-days";

type DaysResponse = { today: string; days: DayView[]; substringDays: SubstringDayView[] };

function stateOf(day: DayView): { label: string; tone: string } {
  if (day.started) return { label: "Live", tone: kit.chip };
  if (isApproved(day)) return { label: "Approved", tone: kit.chip };
  return { label: "Draft", tone: `${kit.chip} ${admin.decide}` };
}

export function Puzzles({ onChanged }: { onChanged: () => void }) {
  const [data, setData] = useState<DaysResponse | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A day on a clock with changes not approved yet: leaving it for another day asks first (src/app/admin/puzzles/clock-day.tsx).
  const [unsaved, setUnsaved] = useState(false);

  const load = useCallback(() => {
    api<DaysResponse>("/api/admin/puzzles", { method: "GET" }).then(
      (r) => {
        setData(r);
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, []);
  useEffect(load, [load]);

  if (error) return <p role="alert">{error}</p>;
  if (!data)
    return (
      <Skeleton label="Loading puzzles">
        <Line />
      </Skeleton>
    );
  // Offbeat's days and Fragments' share one Days row: the chosen date shows each game's day for it, or says it has none
  // (docs/milestones/M15-15f-fragments-test-run.md, 15f-1).
  const offbeat = [...data.days].sort((a, b) => a.date.localeCompare(b.date));
  // Tomorrow with nothing drafted is an empty slot among the days, so the gap shows where it falls (design 7, 14b-6f).
  const tomorrow = tomorrowOf(data.today, data.days);
  const empty = tomorrow.state === "missing" ? tomorrow.date : null;
  const dates = slotDates(
    offbeat.map((d) => d.date),
    data.substringDays.map((d) => d.date),
    empty,
  );
  if (offbeat.length === 0 && data.substringDays.length === 0) return <p>No {GAME.name} days yet: a Claude session drafts them from the question bank.</p>;
  // At first, the first day waiting for approval, else today, else the first Offbeat day, else the first date listed.
  const first = offbeat.find((d) => hasDraft(d) && !isApproved(d))?.date ?? offbeat.find((d) => d.date === data.today)?.date ?? offbeat[0]?.date ?? dates[0];
  const date = chosen !== null && dates.includes(chosen) ? chosen : first;
  const day = offbeat.find((d) => d.date === date);
  const substringDay = data.substringDays.find((d) => d.date === date);
  // Stay on the day just approved, so its message stays in view (14b-2b-2a review).
  const stay = () => {
    setChosen(date);
    load();
    onChanged();
  };
  return (
    <>
      <nav aria-label="Days" className={styles.days}>
        {dates.map((d) => {
          const picked = d === date;
          const offbeatDay = offbeat.find((o) => o.date === d);
          const { label, tone } = offbeatDay ? stateOf(offbeatDay) : { label: "Not drafted", tone: `${kit.chip} ${kit.danger}` };
          return (
            <button
              key={d}
              type="button"
              className={picked ? `${styles.day} ${styles.chosen}` : styles.day}
              aria-pressed={picked}
              onClick={() => {
                if (!picked && unsaved && !window.confirm(LEAVE_WARNING)) return;
                setChosen(d);
              }}
            >
              <span>{dayText(d)}</span>
              <span className={tone}>{label}</span>
            </button>
          );
        })}
      </nav>
      {day ? (
        <ClockDay key={day.date} day={day} onDirty={setUnsaved} onApproved={stay} />
      ) : (
        // Answer 29: how days get drafted, as the page says when it has none.
        <p>Nothing drafted for {dayText(date)}. A Claude session drafts days from the question bank.</p>
      )}
      <SubstringDay
        key={`game-2-${date}`}
        date={date}
        day={substringDay ?? null}
        onApproved={() => {
          setChosen(date);
          load();
          onChanged();
        }}
      />
    </>
  );
}

