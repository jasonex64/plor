"use client";

// Puzzle entry (docs/milestones/M06-puzzle-entry.md): an admin reviews each day a Claude session drafted from the
// question bank (M13 13d), changes the drawn host answers if they like, and approves it. Laid out as round 10 draws it
// (docs/milestones/M14-14b-2b-2-admin-build.md, criterion 4): the days as a row, the chosen day as a table whose host
// answers are checkboxes drawn as chips, Approve at the top. A bank answer with a letter the Wind has stolen is dashed
// with that letter struck, and can't be ticked; a host answer ticked before is in the danger colour with its problem,
// and Approve waits until it's unticked (14b-2b-2b).
import { useCallback, useEffect, useState } from "react";
import type { DayView, HostChoice, QuestionView } from "@/admin/puzzles";
import { normalize } from "@/content/puzzle";
import { ApiError, api } from "@/lib/api-client";
import { errorText } from "../../messages";
import { dayText } from "../day-text";
import admin from "../admin.module.css";
import styles from "./puzzles.module.css";

type DaysResponse = { today: string; days: DayView[] };

// Host answers shown before "+N more": round 10's five, the checked ones always among them.
const SHOWN = 5;

function stateOf(day: DayView): { label: string; tone: string } {
  if (day.started) return { label: "Live", tone: admin.state };
  if (day.live) return { label: "Approved", tone: admin.state };
  return { label: "Draft", tone: admin.decide };
}

export function Puzzles({ onChanged }: { onChanged: () => void }) {
  const [data, setData] = useState<DaysResponse | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  if (!data) return <p>Loading…</p>;
  if (data.days.length === 0) return <p>No days yet: a Claude session drafts them from the question bank.</p>;
  const days = [...data.days].sort((a, b) => a.date.localeCompare(b.date));
  // At first, the first day waiting for approval, else today, else the first day listed.
  const first = days.find((d) => d.draft && !d.live) ?? days.find((d) => d.date === data.today) ?? days[0];
  const day = days.find((d) => d.date === chosen) ?? first;
  return (
    <>
      <nav aria-label="Days" className={styles.days}>
        {days.map((d) => {
          const { label, tone } = stateOf(d);
          return (
            <button key={d.date} type="button" className={d === day ? `${styles.day} ${styles.chosen}` : styles.day} aria-pressed={d === day} onClick={() => setChosen(d.date)}>
              <span>{dayText(d.date)}</span>
              <span className={`${admin.tag} ${tone}`}>{label}</span>
            </button>
          );
        })}
      </nav>
      <Day
        key={day.date}
        day={day}
        onApproved={() => {
          // Stay on the day just approved, so its message stays in view (14b-2b-2a review).
          setChosen(day.date);
          load();
          onChanged();
        }}
      />
    </>
  );
}

function Day({ day, onApproved }: { day: DayView; onApproved: () => void }) {
  const { label } = stateOf(day);
  const editable = day.draft !== null && !day.started;
  // An editable day shows its draft, which Approve saves; the approved day's host answers, if any, are the starting
  // choice (14b-2b-2a review). A day already started shows what players got.
  const shown = editable ? day.draft! : (day.live ?? day.draft)!;
  const [hosts, setHosts] = useState<string[][]>((day.live ?? day.draft)!.map((q) => q.hostAnswers));
  const [problems, setProblems] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Per question, its ticked host answers that players can't type.
  const blocked = shown.map((q, i) => q.hostBank.filter((a) => a.stolen && hosts[i].includes(a.id)));
  const toFix = blocked.filter((b) => b.length > 0).length;

  async function approve() {
    setBusy(true);
    setProblems([]);
    setNote(null);
    try {
      await api("/api/admin/puzzles/approve", { method: "POST", body: { date: day.date, hostAnswers: hosts } });
      setNote(`${dayText(day.date)} is approved. Players get it at midnight Pacific. You can change its host answers until then.`);
      onApproved();
    } catch (err) {
      setNote(errorText(err));
      if (err instanceof ApiError) setProblems(err.problems);
    } finally {
      setBusy(false);
    }
  }

  // Each content problem names its question as "q1" to "q7" (src/content/puzzle.ts), so it's shown under that question;
  // anything else is shown under the heading.
  const questionOf = (problem: string) => Number(/\bq(\d+)\b/.exec(problem)?.[1] ?? 0) - 1;
  const general = problems.filter((p) => questionOf(p) < 0);
  const state = day.started ? "Live: players have started it." : day.live ? "Approved." : "Draft, waiting for approval.";

  return (
    <section aria-label={dayText(day.date)} className={admin.card}>
      <div className={styles.dayHead}>
        <div>
          <h3 className={admin.cardTitle}>
            {dayText(day.date)} <span className={admin.sr}>({label})</span>
          </h3>
          <p className={admin.note}>
            {editable ? `${state} Tick the host answers (the Wind's) you want. Dashed ones have a letter the Wind has stolen, so players can't type them.` : state}
          </p>
        </div>
        {editable && (
          <div className={styles.approve}>
            <button type="button" className={admin.primary} disabled={busy || toFix > 0} aria-describedby={toFix > 0 ? "fix-first" : undefined} onClick={approve}>
              {day.live ? "Approve again" : "Approve day"}
            </button>
            {toFix > 0 && (
              <span id="fix-first" className={styles.fixFirst}>
                Fix {toFix} {toFix === 1 ? "question" : "questions"} first
              </span>
            )}
          </div>
        )}
      </div>
      {note && <p role="status" className={styles.note}>{note}</p>}
      {general.length > 0 && (
        <ul role="alert" className={styles.problems}>
          {general.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <table className={admin.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Question</th>
            <th>Steals</th>
            <th>Host answers</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((q, i) => (
            <tr key={i}>
              <td className={admin.muted}>{i + 1}</td>
              <td className={styles.question}>
                <span className={admin.strong}>{q.prompt}</span>
                <br />
                <span className={admin.muted}>any {q.category.replaceAll("_", " ")}</span>
              </td>
              <td>{q.steals ? <span className={`${admin.tag} ${admin.state}`}>−{q.steals.toUpperCase()}</span> : <span className={admin.muted}>—</span>}</td>
              <td>
                {editable ? (
                  <HostChips q={q} chosen={hosts[i]} onChange={(next) => setHosts(hosts.map((h, j) => (j === i ? next : h)))} />
                ) : (
                  <ReadOnlyHosts q={q} />
                )}
                {editable &&
                  blocked[i].map((a) => (
                    <p key={a.id} className={admin.problem}>
                      &ldquo;{a.name}&rdquo; has the {a.stolen!.toUpperCase()} the Wind steals: pick another host answer.
                    </p>
                  ))}
                {problems
                  .filter((p) => questionOf(p) === i)
                  .map((p) => (
                    <p key={p} role="alert" className={admin.problem}>
                      {p}
                    </p>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// The question's host bank as checkboxes drawn as chips: the checked ones first, then the rest by name, five at first.
function HostChips({ q, chosen, onChange }: { q: QuestionView; chosen: string[]; onChange: (next: string[]) => void }) {
  const [all, setAll] = useState(false);
  const byName = [...q.hostBank].sort((a, b) => a.name.localeCompare(b.name));
  const ordered = [...byName.filter((a) => chosen.includes(a.id)), ...byName.filter((a) => !chosen.includes(a.id))];
  const visible = all ? ordered : ordered.slice(0, Math.max(SHOWN, chosen.length));
  const more = ordered.length - visible.length;
  return (
    <fieldset className={styles.chips}>
      <legend className={admin.sr}>Host answers for {q.prompt}</legend>
      {visible.map((a) => {
        const on = chosen.includes(a.id);
        // Players can't type it, so it can't be ticked; one ticked before stays a checkbox, to untick.
        if (a.stolen && !on) {
          return (
            <span key={a.id} className={`${styles.chip} ${styles.blocked}`}>
              <Struck choice={a} />
              <span className={admin.sr}>, has {a.stolen.toUpperCase()}: players can&apos;t type it</span>
            </span>
          );
        }
        if (a.stolen) {
          return (
            <label key={a.id} className={`${styles.chip} ${styles.bad}`}>
              <input
                type="checkbox"
                className={admin.sr}
                aria-label={`${a.name}, has ${a.stolen.toUpperCase()}: players can't type it`}
                checked
                onChange={() => onChange(chosen.filter((id) => id !== a.id))}
              />
              <Struck choice={a} />
            </label>
          );
        }
        return (
          <label key={a.id} className={on ? `${styles.chip} ${styles.checked}` : styles.chip}>
            <input type="checkbox" className={admin.sr} checked={on} onChange={() => onChange(on ? chosen.filter((id) => id !== a.id) : [...chosen, a.id])} />
            {on && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            )}
            {a.name}
          </label>
        );
      })}
      {(more > 0 || all) && (
        <button type="button" className={`${styles.chip} ${styles.more}`} onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `+${more} more`}
        </button>
      )}
    </fieldset>
  );
}

// The name with each letter that is the stolen one, once normalized (as players' typing is), struck through.
function Struck({ choice: a }: { choice: HostChoice }) {
  return (
    <span>
      {[...a.name].map((ch, i) => (normalize(ch) === a.stolen ? <s key={i}>{ch}</s> : ch))}
    </span>
  );
}

function ReadOnlyHosts({ q }: { q: QuestionView }) {
  const names = new Map(q.hostBank.map((a) => [a.id, a.name]));
  return <span>{q.hostAnswers.map((id) => names.get(id) ?? id).join(", ")}</span>;
}
