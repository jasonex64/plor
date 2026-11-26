"use client";

// A day on a clock on the approval page (docs/milestones/M23-23e-drafting-and-approving.md, 23e-1; the human's answers 51 and 55 to 57
// in M23-offbeat-on-a-clock.md): three questions, each with its wording, its list's answers by tier and six rare examples. Each can be
// swapped for another list from a menu (longest unused first, with when each last appeared), given a wording of its own for this day,
// moved up or down, or have its six drawn again; Redraft replaces all three. Every change that needs the lists is asked of the server,
// which builds the day (src/admin/clock-days.ts); this page holds only the picks, and sends them back to Approve, where the server
// builds the day once more. Changes are kept only on Approve: leaving the page loses them, and the page says so.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { ClockDayView, ClockQuestionView } from "@/admin/clock-days";
import type { DayView } from "@/admin/puzzles";
import { ApiError, api } from "@/lib/api-client";
import { dayText } from "../../day-text";
import { errorText } from "../../messages";
import admin from "../admin.module.css";
import kit from "../../kit.module.css";
import styles from "./puzzles.module.css";

const COLUMNS = ["#", "Question", "Change"];
export const LEAVE_WARNING = "This day has changes that are not approved. If you leave, they are lost.";

// While there are changes, leaving the page asks first: a reload, a closed tab or another site by the browser's own question, and a
// link to another page of this site by ours (a link inside the app doesn't unload the page).
export function useLeaveWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.origin !== window.location.origin || link.pathname === window.location.pathname) return;
      if (!window.confirm(LEAVE_WARNING)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
}

const move = <T,>(items: T[], from: number, to: number): T[] => {
  const out = [...items];
  out.splice(to, 0, ...out.splice(from, 1));
  return out;
};

export function ClockDay({ day, onApproved, onDirty }: { day: DayView; onApproved: () => void; onDirty: (dirty: boolean) => void }) {
  const clock = day.clock!;
  const editable = clock.draft !== null && !day.started;
  const [view, setView] = useState<ClockDayView | null>(clock.draft);
  // What was last approved or loaded, to know whether there is anything to lose; and every list the page has shown, for Redraft.
  const [saved, setSaved] = useState(JSON.stringify(clock.draft?.picks));
  const [shown, setShown] = useState(clock.draft?.picks.map((p) => p.category) ?? []);
  const [editing, setEditing] = useState<number | null>(null);
  const [wording, setWording] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = editable && view !== null && JSON.stringify(view.picks) !== saved;
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  useLeaveWarning(dirty);

  async function run<T>(request: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    setProblems([]);
    setNote(null);
    try {
      return await request();
    } catch (err) {
      setNote(errorText(err));
      if (err instanceof ApiError) setProblems(err.problems);
      return null;
    } finally {
      setBusy(false);
    }
  }

  // A change the server builds: the questions as they would be, or a fresh three.
  async function change(body: { questions: ClockDayView["picks"] } | { skip: string[] }) {
    const next = await run(() => api<ClockDayView>("/api/admin/puzzles/clock", { method: "POST", body: { date: day.date, ...body } }));
    if (!next) return;
    setView(next);
    setShown([...new Set([...shown, ...next.picks.map((p) => p.category)])]);
    setEditing(null);
  }

  async function approve() {
    const done = await run(() => api("/api/admin/puzzles/clock/approve", { method: "POST", body: { date: day.date, questions: view!.picks } }));
    if (!done) return;
    setSaved(JSON.stringify(view!.picks));
    setNote(`${dayText(day.date)} is approved. Players get it at midnight Pacific. You can change it until then.`);
    onApproved();
  }

  // Up and Down change no list's answers, so the page moves the question itself: its six follow its list, not its place.
  function reorder(from: number, to: number) {
    setView({ ...view!, picks: move(view!.picks, from, to), questions: move(view!.questions, from, to) });
  }

  function saveWording(event: FormEvent, i: number) {
    event.preventDefault();
    void change({ questions: view!.picks.map((p, j) => (j === i ? { ...p, wording: wording.trim() } : p)) });
  }

  const questionOf = (problem: string) => Number(/\bq(\d+)\b/.exec(problem)?.[1] ?? 0) - 1;
  const general = problems.filter((p) => questionOf(p) < 0);
  const label = day.started ? "Live" : clock.live ? "Approved" : "Draft";
  const state = day.started ? "Live: players have started it." : clock.live ? "Approved." : "Draft, waiting for approval.";

  return (
    <section aria-label={dayText(day.date)} className={kit.card}>
      <div className={styles.dayHead}>
        <div>
          <h3 className={admin.cardTitle}>
            {dayText(day.date)} <span className="sr-only">({label})</span>
          </h3>
          <p className={admin.note}>{editable ? `${state} Three questions on a clock.` : state}</p>
          {editable && <p className={admin.note}>Changes are kept only when you press Approve. If you leave this page first, they are lost.</p>}
        </div>
        {editable && (
          <div className={styles.approve}>
            <button type="button" className={`${kit.primary} ${admin.button}`} disabled={busy} onClick={approve}>
              {clock.live ? "Approve again" : "Approve day"}
            </button>
            <button type="button" className={admin.button} disabled={busy} onClick={() => void change({ skip: shown })}>
              Redraft
            </button>
            {dirty && <span className={styles.fixFirst}>Not approved yet</span>}
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
      {editable && view ? (
        <Rows
          questions={view.questions}
          actions={(q, i) => (
            <div className={admin.actions}>
              <label className={kit.select}>
                <span className="sr-only">Swap question {i + 1} for another list</span>
                <select
                  value=""
                  disabled={busy}
                  onChange={(e) => void change({ questions: view.picks.map((p, j) => (j === i ? { category: e.target.value, reroll: 0 } : p)) })}
                >
                  <option value="">Swap</option>
                  {view.menu
                    .filter((m) => !view.picks.some((p) => p.category === m.category))
                    .map((m) => (
                      <option key={m.category} value={m.category}>
                        {m.prompt}, {m.when}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className={admin.button}
                disabled={busy}
                aria-label={`Edit wording of question ${i + 1}`}
                onClick={() => {
                  setWording(q.prompt);
                  setEditing(editing === i ? null : i);
                }}
              >
                Edit wording
              </button>
              <div className={styles.moves}>
                <button type="button" className={admin.button} disabled={busy || i === 0} aria-label={`Move question ${i + 1} up`} onClick={() => reorder(i, i - 1)}>
                  Up
                </button>
                <button type="button" className={admin.button} disabled={busy || i === view.questions.length - 1} aria-label={`Move question ${i + 1} down`} onClick={() => reorder(i, i + 1)}>
                  Down
                </button>
              </div>
              <button
                type="button"
                className={admin.button}
                disabled={busy}
                aria-label={`Re-roll the rare examples of question ${i + 1}`}
                onClick={() => void change({ questions: view.picks.map((p, j) => (j === i ? { ...p, reroll: p.reroll + 1 } : p)) })}
              >
                Re-roll
              </button>
            </div>
          )}
          below={(i) => (
            <>
              {editing === i && (
                <form className={styles.wording} onSubmit={(e) => saveWording(e, i)}>
                  <label className={admin.field}>
                    <span className="sr-only">Wording of question {i + 1}</span>
                    <input value={wording} onChange={(e) => setWording(e.target.value)} />
                  </label>
                  <p className={admin.note}>Only for this day. The list&apos;s own wording comes back the next time it is drafted.</p>
                  <div className={styles.moves}>
                    <button type="submit" className={`${kit.primary} ${admin.button}`} disabled={busy || wording.trim() === ""}>
                      Save wording
                    </button>
                    <button type="button" className={admin.button} onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              {problems
                .filter((p) => questionOf(p) === i)
                .map((p) => (
                  <p key={p} role="alert" className={admin.problem}>
                    {p}
                  </p>
                ))}
            </>
          )}
        />
      ) : (
        clock.live && <Rows questions={clock.live} />
      )}
      {editable && clock.live && (
        <>
          <h4 className={admin.cardTitle}>The approved day</h4>
          <Rows questions={clock.live} />
        </>
      )}
    </section>
  );
}

// The questions as a table, as the page's other days are: a question's wording and list, its answers by tier, its six rare
// examples, and what can be done to it when `actions` is given.
function Rows({
  questions,
  actions,
  below,
}: {
  questions: ClockQuestionView[];
  actions?: (q: ClockQuestionView, i: number) => ReactNode;
  below?: (i: number) => ReactNode;
}) {
  const columns = actions ? COLUMNS : COLUMNS.slice(0, -1);
  return (
    <table className={admin.table} role="table">
      <thead role="rowgroup" className="sr-only-on-phones">
        <tr role="row">
          {columns.map((c) => (
            <th key={c} role="columnheader">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {questions.map((q, i) => (
          <tr role="row" key={q.category} aria-label={`Question ${i + 1}: ${q.prompt}`}>
            <td role="cell" className={admin.muted} data-label="#">
              {i + 1}
            </td>
            <td role="cell" className={styles.clockQuestion} data-label="Question">
              <span className={admin.strong}>{q.prompt}</span>
              <br />
              <span className={admin.muted}>any {q.category.replaceAll("_", " ")}</span>
              <p className={styles.counts}>
                {q.common} common, {q.uncommon} uncommon, {q.rare} rare
              </p>
              <ul className={styles.examples} aria-label="Rare examples">
                {q.examples.map((name) => (
                  <li key={name} className={kit.chip}>
                    {name}
                  </li>
                ))}
              </ul>
              {below?.(i)}
            </td>
            {actions && (
              <td role="cell" data-label="Change">
                {actions(q, i)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
