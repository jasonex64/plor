"use client";

// The insights report for one day: per question, how many answered, how many the host caught, the most common answers
// and the misses (docs/milestones/M03-puzzle-insights.md). Laid out as round 10
// draws it (docs/milestones/M14-14b-2b-2-admin-build.md, criterion 5): the day with previous and next, a chart of each
// question's catch rate against the Gentle target (human, 2026-10-26: "Chart against the targets (Recommended)"), then
// the table.
import { useEffect, useState } from "react";
import { CATCH_TARGETS } from "@/config/tunables";
import type { DayInsights, QuestionInsights } from "@/insights/report";
import { api } from "@/lib/api-client";
import { errorText } from "../messages";
import admin from "./admin.module.css";
import { dayText } from "../day-text";
import styles from "./insights.module.css";

type InsightsResponse = { days: string[]; report: DayInsights };

const percent = (share: number | null) => (share === null ? "—" : `${Math.round(share * 100)}%`);
// The rate against the question's target, in percentage points: "+1", "−13".
function versus(q: QuestionInsights): string {
  if (q.catchRate === null) return "—";
  const points = Math.round((q.catchRate - CATCH_TARGETS[q.index]) * 100);
  return points > 0 ? `+${points}` : points < 0 ? `−${-points}` : "0";
}

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
      (err) => setError(errorText(err)),
    );
  }, [date]);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>Loading…</p>;
  const { report, days } = data;
  // The days come newest first: the previous day is the next one in the list.
  const at = days.indexOf(report.date);
  const players = Math.max(0, ...report.questions.map((q) => q.answered));
  return (
    <>
      <div className={styles.picker}>
        <button type="button" className={admin.button} aria-label="Previous day" disabled={at >= days.length - 1} onClick={() => setDate(days[at + 1])}>
          ‹
        </button>
        <label className={styles.day}>
          <span className="sr-only">Day</span>
          <select value={report.date} onChange={(e) => setDate(e.target.value)}>
            {days.map((d) => (
              <option key={d} value={d}>
                {dayText(d)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={admin.button} aria-label="Next day" disabled={at <= 0} onClick={() => setDate(days[at - 1])}>
          ›
        </button>
        <span className={`${admin.tag} ${admin.state}`}>{report.finished ? "Finished" : "Today, still being played"}</span>
        <span className={admin.muted}>{players === 1 ? "1 player" : `${players} players`}</span>
      </div>
      <section aria-label="Caught per question" className={admin.card}>
        <h3 className={admin.cardTitle}>Caught per question</h3>
        <p className={admin.note}>
          The Gentle target rises from {Math.round(CATCH_TARGETS[0] * 100)}% at Q1 to {Math.round(CATCH_TARGETS[CATCH_TARGETS.length - 1] * 100)}% at Q
          {CATCH_TARGETS.length}, so a day gets harder as it goes.
        </p>
        <Chart questions={report.questions} />
      </section>
      <section aria-label="Questions" className={admin.card}>
        <table className={admin.table} role="table">
          <thead role="rowgroup" className="sr-only-on-phones">
            <tr role="row">
              <th role="columnheader">Q</th>
              <th role="columnheader">Question</th>
              <th role="columnheader">Caught</th>
              <th role="columnheader">Rate</th>
              <th role="columnheader">vs target</th>
              <th role="columnheader">Most typed</th>
              <th role="columnheader">Not in list</th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {report.questions.map((q) => (
              <Row key={q.index} q={q} />
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

// Bars for the catch rates, a dashed line for each target; the scale reaches the highest of either, rounded up to the
// next 5% as round 10's axis steps. A question that breaks the day's shape is in the caught colour, and said in words
// in the table (WCAG 2.2 1.4.1); the chart is described in full for screen readers.
const STEP = 5;
function Chart({ questions }: { questions: QuestionInsights[] }) {
  const highest = Math.max(...questions.map((q) => Math.round((q.catchRate ?? 0) * 100)), ...CATCH_TARGETS.map((t) => Math.round(t * 100)));
  const top = Math.max(STEP, Math.ceil(highest / STEP) * STEP);
  const ticks = Array.from({ length: top / STEP + 1 }, (_, i) => top - i * STEP);
  const described = questions
    .map((q) => `Q${q.index + 1} ${percent(q.catchRate)} (target ${Math.round(CATCH_TARGETS[q.index] * 100)}%)${q.breaksShape ? ", clearly fewer than an earlier question" : ""}`)
    .join("; ");
  return (
    <>
      <div role="img" aria-label={`Share of players caught per question, against the Gentle target: ${described}.`} className={styles.chart} style={{ gridTemplateColumns: `40px repeat(${questions.length}, minmax(0, 1fr))` }}>
        <div className={styles.axis} aria-hidden="true">
          {ticks.map((t) => (
            <span key={t}>{t}%</span>
          ))}
        </div>
        {questions.map((q) => (
          <div key={q.index} className={styles.column} aria-hidden="true">
            <div className={styles.target} style={{ bottom: `${(CATCH_TARGETS[q.index] * 100 * 100) / top}%` }} />
            <div className={q.breaksShape ? `${styles.bar} ${styles.dip}` : styles.bar} style={{ height: `${((q.catchRate ?? 0) * 100 * 100) / top}%` }} />
          </div>
        ))}
        <span aria-hidden="true" />
        {questions.map((q) => (
          <span key={q.index} className={styles.label} aria-hidden="true">
            <span>Q{q.index + 1}</span>
            <b className={q.breaksShape ? styles.dipText : undefined}>{percent(q.catchRate)}</b>
          </span>
        ))}
      </div>
      <div className={styles.legend} aria-hidden="true">
        <span>
          <i className={styles.keyBar} />
          Caught
        </span>
        <span>
          <i className={styles.keyTarget} />
          Gentle target
        </span>
        <span>
          <i className={styles.keyDip} />
          Catches clearly fewer than an earlier question
        </span>
      </div>
    </>
  );
}

function Row({ q }: { q: QuestionInsights }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr role="row">
        <td role="cell" className={admin.strong} data-label="Q">Q{q.index + 1}</td>
        <td role="cell" data-label="Question">
          <span className={admin.strong}>{q.prompt}</span>
          <br />
          <span className={admin.muted}>Host: {q.hostAnswers.map((h) => h.name).join(", ")}</span>
          {q.tooFew && (
            <>
              <br />
              <span className={admin.muted}>Too few players to judge yet.</span>
            </>
          )}
          {q.breaksShape && (
            <>
              <br />
              <span className={styles.dipText}>Catches clearly fewer than an earlier question</span>
            </>
          )}
        </td>
        <td role="cell" className={admin.nowrap} data-label="Caught">
          {q.caught} of {q.answered}
        </td>
        <td role="cell" className={`${admin.nowrap} ${admin.strong}`} data-label="Rate">{percent(q.catchRate)}</td>
        <td role="cell" className={`${admin.nowrap} ${admin.strong}`} data-label="vs target">{versus(q)}</td>
        <td role="cell" data-label="Most typed">{q.topAnswers.length > 0 ? q.topAnswers.map((t) => `${t.answer.name} ${t.count}`).join(", ") : "—"}</td>
        <td role="cell" data-label="Not in list">
          {q.misses.length > 0 ? (
            <button type="button" className={admin.button} aria-expanded={open} onClick={() => setOpen(!open)}>
              {q.misses.length} <span className="sr-only">not in the list</span>
              <span aria-hidden="true">{open ? " ▴" : " ▾"}</span>
            </button>
          ) : (
            <span className={admin.muted}>—</span>
          )}
        </td>
      </tr>
      {open && (
        <tr role="row">
          <td role="cell" />
          <td role="cell" colSpan={6}>
            <ul className={styles.misses}>
              {q.misses.map((m) => (
                <li key={m.text}>
                  {m.text} ({m.count})
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
