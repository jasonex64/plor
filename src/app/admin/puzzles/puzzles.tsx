"use client";

// Puzzle entry (docs/milestones/M06-puzzle-entry.md): an admin reviews each day a Claude session drafted from the
// question bank (M13 13d), changes the drawn host answers if they like, and approves it. Plain on purpose; the look is
// M14's job.
import { useCallback, useEffect, useState } from "react";
import type { DayView, QuestionView } from "@/admin/puzzles";
import { ApiError, api } from "@/lib/api-client";
import { errorText } from "../../messages";

type DaysResponse = { today: string; days: DayView[] };

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
      <h2>Days</h2>
      {data.days.length === 0 && <p>No days yet: a Claude session drafts them from the question bank.</p>}
      {data.days.map((day) => (
        <Day key={day.date} day={day} onApproved={load} />
      ))}
    </section>
  );
}

function stateOf(day: DayView): string {
  if (day.started) return "live, started";
  if (day.live) return "approved";
  return "drafted, waiting for approval";
}

function Day({ day, onApproved }: { day: DayView; onApproved: () => void }) {
  // A listed day has a draft or an approved puzzle (listDays).
  const shown = (day.live ?? day.draft)!;
  return (
    <article>
      <h3>
        {day.date}: {stateOf(day)}
      </h3>
      {day.draft && !day.started ? (
        <Review date={day.date} draft={day.draft} live={day.live} onApproved={onApproved} />
      ) : (
        shown.map((q, i) => <QuestionSummary key={i} index={i} q={q} />)
      )}
    </article>
  );
}

function QuestionSummary({ index, q }: { index: number; q: QuestionView }) {
  const names = new Map(q.hostBank.map((a) => [a.id, a.name]));
  return (
    <p>
      Q{index + 1}. {q.prompt} (any {q.category.replaceAll("_", " ")}). Host: {q.hostAnswers.map((id) => names.get(id) ?? id).join(", ")}
      {q.steals && `. The Wind steals ${q.steals.toUpperCase()}`}.
    </p>
  );
}

// Reviewing a drafted day: each question's category, its suggested host answers (changeable, from its host bank),
// then Approve.
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
            Q{i + 1}. {q.prompt} (any {q.category.replaceAll("_", " ")})
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
              {[...q.hostBank].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <ProblemList problems={problems.filter((p) => questionOf(p) === i)} />
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
