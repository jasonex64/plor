"use client";

// Puzzle entry (docs/milestones/M06-puzzle-entry.md): an admin types a day's 7 questions and saves them, copies them
// for a Claude session to draft, then reviews the drafted day, changes the suggested host answers if they like, and
// approves it. Plain on purpose; the look is M14's job.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { QUESTIONS_PER_DAY } from "@/config/tunables";
import { copyForClaude } from "@/admin/puzzle-entry";
import type { DayView, QuestionView } from "@/admin/puzzles";
import { ApiError, api } from "@/lib/api-client";
import { messageFor } from "../../messages";

type DaysResponse = { today: string; days: DayView[] };

function errorText(err: unknown): string {
  return err instanceof ApiError ? messageFor(err.code) : `Something went wrong: ${String(err)}`;
}

export function Puzzles() {
  const [data, setData] = useState<DaysResponse | null>(null);
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
  return (
    <section>
      <WriteQuestions today={data.today} days={data.days} onSaved={load} />
      <h2>Days</h2>
      {data.days.length === 0 && <p>No days yet: write a day&apos;s questions above.</p>}
      {data.days.map((day) => (
        <Day key={day.date} day={day} onApproved={load} />
      ))}
    </section>
  );
}

// Typing a day's questions. Picking a date that already has saved questions fills them in, so they can be edited.
function WriteQuestions({ today, days, onSaved }: { today: string; days: DayView[]; onSaved: () => void }) {
  const [date, setDate] = useState(today);
  const [questions, setQuestions] = useState<string[]>(Array(QUESTIONS_PER_DAY).fill(""));
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pick(next: string) {
    setDate(next);
    setQuestions(days.find((d) => d.date === next)?.questions ?? Array(QUESTIONS_PER_DAY).fill(""));
    setNote(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/puzzles/questions", { method: "POST", body: { date, questions } });
      setNote("Saved.");
      onSaved();
    } catch (err) {
      setNote(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyForClaude(date, questions.map((q) => q.trim())));
      setNote("Copied. Paste it into a Claude session.");
    } catch (err) {
      setNote(`Couldn't copy: ${String(err)}`);
    }
  }

  return (
    <form onSubmit={save}>
      <h2>Write a day&apos;s questions</h2>
      <label>
        Day <input type="date" required min={today} value={date} onChange={(e) => pick(e.target.value)} />
      </label>
      <ol>
        {questions.map((q, i) => (
          <li key={i}>
            <input
              aria-label={`Question ${i + 1}`}
              required
              value={q}
              onChange={(e) => setQuestions(questions.map((old, j) => (j === i ? e.target.value : old)))}
            />
          </li>
        ))}
      </ol>
      <button type="submit" disabled={busy}>
        Save questions
      </button>{" "}
      <button type="button" onClick={copy}>
        Copy for Claude
      </button>
      {note && <p role="status">{note}</p>}
    </form>
  );
}

function stateOf(day: DayView): string {
  if (day.started) return "live, started";
  if (day.live) return "approved";
  if (day.draft) return "drafted, waiting for approval";
  return "questions saved, waiting for a draft";
}

function Day({ day, onApproved }: { day: DayView; onApproved: () => void }) {
  const shown = day.live ?? day.draft;
  const questionsDiffer =
    day.draft !== null && day.questions !== null && day.draft.some((q, i) => q.prompt !== day.questions![i]);
  return (
    <article>
      <h3>
        {day.date}: {stateOf(day)}
      </h3>
      {questionsDiffer && <p role="status">The draft&apos;s questions differ from the saved ones.</p>}
      {day.draft && !day.started ? (
        <Review date={day.date} draft={day.draft} live={day.live} onApproved={onApproved} />
      ) : shown ? (
        shown.map((q, i) => <QuestionSummary key={i} index={i} q={q} />)
      ) : (
        <ol>{day.questions!.map((q, i) => <li key={i}>{q}</li>)}</ol>
      )}
    </article>
  );
}

function QuestionSummary({ index, q }: { index: number; q: QuestionView }) {
  const names = new Map(q.answers.map((a) => [a.id, a.name]));
  return (
    <p>
      Q{index + 1}. {q.prompt}. Host: {q.hostAnswers.map((id) => names.get(id)).join(", ")}
      {q.steals && `. The Wind steals ${q.steals.toUpperCase()}`}. {q.answers.length} answers.
    </p>
  );
}

// Reviewing a drafted day: each question's answers, its suggested host answers (changeable), then Approve.
function Review({ date, draft, live, onApproved }: { date: string; draft: QuestionView[]; live: QuestionView[] | null; onApproved: () => void }) {
  const [hosts, setHosts] = useState<string[][]>((live ?? draft).map((q) => q.hostAnswers));
  const [problems, setProblems] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    setProblems([]);
    try {
      await api("/api/admin/puzzles/approve", { method: "POST", body: { date, hostAnswers: hosts } });
      setNote("Approved.");
      onApproved();
    } catch (err) {
      setNote(errorText(err));
      if (err instanceof ApiError) setProblems(err.problems);
    } finally {
      setBusy(false);
    }
  }

  // Each content problem names its question as "q1" to "q7" (src/content/puzzle.ts), so it's shown under that question;
  // anything else is shown under the button.
  const questionOf = (problem: string) => Number(/\bq(\d+)\b/.exec(problem)?.[1] ?? 0) - 1;
  const general = problems.filter((p) => questionOf(p) < 0);

  return (
    <div>
      {draft.map((q, i) => (
        <section key={i}>
          <h4>
            Q{i + 1}. {q.prompt}
            {q.steals && ` (the Wind steals ${q.steals.toUpperCase()})`}
          </h4>
          <label>
            Host answers{" "}
            <select
              multiple
              size={4}
              value={hosts[i]}
              onChange={(e) => setHosts(hosts.map((h, j) => (j === i ? [...e.target.selectedOptions].map((o) => o.value) : h)))}
            >
              {[...q.answers].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <ProblemList problems={problems.filter((p) => questionOf(p) === i)} />
          <details>
            <summary>All {q.answers.length} answers</summary>
            <p>{q.answers.map((a) => (a.aliases.length ? `${a.name} (${a.aliases.join(", ")})` : a.name)).join("; ")}</p>
          </details>
        </section>
      ))}
      <button type="button" disabled={busy} onClick={approve}>
        {live ? "Approve again with these host answers" : "Approve"}
      </button>
      {note && <p role="status">{note}</p>}
      <ProblemList problems={general} />
    </div>
  );
}

function ProblemList({ problems }: { problems: string[] }) {
  if (problems.length === 0) return null;
  return (
    <ul role="alert">
      {problems.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}
