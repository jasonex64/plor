"use client";

// Game 2's days on the puzzles page (docs/milestones/M16-16c-a-day-of-game-2.md, 16c-2): each day's seven sets of
// letters and its bonus letter, approved one day at a time (human, 2026-11-07: "Each day on its own (Recommended)").
// The word counts are in the batch's PR ("Counts in the PR, approve on page (Recommended)").
import { useState } from "react";
import type { SubstringDayView } from "@/admin/substrings";
import { ApiError, api } from "@/lib/api-client";
import { dayText } from "../../day-text";
import { errorText } from "../../messages";
import kit from "../../kit.module.css";
import admin from "../admin.module.css";
import styles from "./puzzles.module.css";

export function SubstringDays({ days, onApproved }: { days: SubstringDayView[]; onApproved: () => void }) {
  if (days.length === 0) return null;
  return (
    <section aria-label="Game 2 days" className={styles.gameDays}>
      <h2 className={admin.cardTitle}>Game 2</h2>
      {days.map((day) => (
        <Day key={day.date} day={day} onApproved={onApproved} />
      ))}
    </section>
  );
}

function Day({ day, onApproved }: { day: SubstringDayView; onApproved: () => void }) {
  const editable = day.draft !== null && !day.started;
  const shown = editable ? day.draft! : (day.live ?? day.draft)!;
  const [problems, setProblems] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const state = day.started ? "Live: players have started it." : day.live ? "Approved." : "Draft, waiting for approval.";

  async function approve() {
    setBusy(true);
    setNote(null);
    setProblems([]);
    try {
      await api("/api/admin/puzzles/substrings", { method: "POST", body: { date: day.date } });
      setNote("Approved.");
      onApproved();
    } catch (err) {
      setNote(errorText(err));
      if (err instanceof ApiError) setProblems(err.problems);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="group" aria-label={dayText(day.date)} className={kit.card}>
      <div className={styles.dayHead}>
        <div>
          <h3 className={admin.cardTitle}>{dayText(day.date)}</h3>
          <p className={admin.note}>{state}</p>
        </div>
        {editable && (
          <div className={styles.approve}>
            <button type="button" className={`${kit.primary} ${kit.small} ${admin.button}`} disabled={busy} onClick={approve}>
              {day.live ? "Approve again" : "Approve day"}
            </button>
          </div>
        )}
      </div>
      {note && <p role="status" className={styles.note}>{note}</p>}
      {problems.length > 0 && (
        <ul role="alert" className={styles.problems}>
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <ol className={styles.rounds}>
        {shown.rounds.map((set) => (
          <li key={set} className={kit.chip}>{set}</li>
        ))}
      </ol>
      <p className={admin.note}>Bonus letter {shown.bonusLetter}</p>
    </div>
  );
}
