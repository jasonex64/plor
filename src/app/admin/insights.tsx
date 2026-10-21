"use client";

// The insights report for one day: per question, how many answered, how many the host caught, the share that was in
// the host bank, the most common answers and the misses (docs/milestones/M03-puzzle-insights.md). Plain on purpose;
// the look is M14's job.
import { useEffect, useState } from "react";
import type { DayInsights, QuestionInsights } from "@/insights/report";
import { ApiError, api } from "@/lib/api-client";
import { messageFor } from "../messages";

type InsightsResponse = { days: string[]; report: DayInsights };

const percent = (share: number | null) => (share === null ? "—" : `${Math.round(share * 100)}%`);

export function Insights() {
  const [date, setDate] = useState<string | null>(null);
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = date ? `?date=${date}` : "";
    api<InsightsResponse>(`/api/admin/insights${query}`, { method: "GET" }).then(
      (r) => {
        setData(r);
        setError(null);
      },
      (err) => setError(err instanceof ApiError ? messageFor(err.code) : `Something went wrong: ${String(err)}`),
    );
  }, [date]);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>Loading…</p>;
  const { report, days } = data;
  return (
    <section>
      <label>
        Day
        <select value={report.date} onChange={(e) => setDate(e.target.value)}>
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <p>{report.finished ? "Finished day." : "Today, still being played: numbers will change."}</p>
      {report.questions.map((q) => (
        <QuestionReport key={q.index} q={q} />
      ))}
    </section>
  );
}

function QuestionReport({ q }: { q: QuestionInsights }) {
  return (
    <article>
      <h2>
        Q{q.index + 1}. {q.prompt}
      </h2>
      <p>Host: {q.hostAnswers.map((h) => h.name).join(", ")}</p>
      <p>
        Caught {q.caught} of {q.answered} ({percent(q.catchRate)}). In the host bank: {percent(q.hostBankShare)}.
      </p>
      {q.tooFew && <p>Too few players to judge yet.</p>}
      {q.breaksShape && <p role="status">Catches clearly fewer players than an earlier question: the day doesn&apos;t rise gently here.</p>}
      {q.topAnswers.length > 0 && (
        <p>Most common: {q.topAnswers.map((t) => `${t.answer.name} (${t.count})`).join(", ")}</p>
      )}
      {q.misses.length > 0 && (
        <details>
          <summary>Not in the list ({q.misses.length})</summary>
          <ul>
            {q.misses.map((m) => (
              <li key={m.text}>
                {m.text} ({m.count})
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
