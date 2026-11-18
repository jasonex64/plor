"use client";

// The question bank (docs/milestones/M13-13d-the-question-bank.md): each question with its category, themes, the days
// it ran and the share of answers the host caught on each, then the themes set for dates. Read-only: the bank is
// content/bank.json, changed in pull requests. Laid out as round 10 draws it (docs/milestones/M14-14b-2b-2-admin-build.md,
// criterion 6): one table with a filter, then the themes.
import { Fragment, useEffect, useState } from "react";
import type { BankView } from "@/admin/bank";
import { api } from "@/lib/api-client";
import { errorText } from "../../messages";
import admin from "../admin.module.css";
import kit from "../../kit.module.css";
import { dayText } from "../../day-text";
import { Line, Skeleton } from "../../skeleton";
import pool from "../pool.module.css";
import { AnswerPool } from "../pool";

// The table's columns, so a row spanning them stays right when one is added (docs/milestones/PROCESS-lint-rules.md, answer 21).
const COLUMNS = ["Question", "Category", "Themes", "Added by", "Runs (caught)"];

export function Bank() {
  const [bank, setBank] = useState<BankView | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  // The questions whose answer pool is open, by ID (M15 15g).
  const [pools, setPools] = useState<string[]>([]);
  useEffect(() => {
    api<BankView>("/api/admin/bank", { method: "GET" }).then(setBank, (err) => setError(errorText(err)));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!bank)
    return (
      <Skeleton label="Loading the question bank">
        <Line />
      </Skeleton>
    );
  const needle = filter.trim().toLowerCase();
  const questions = bank.questions.filter((q) => !needle || q.prompt.toLowerCase().includes(needle) || q.category.toLowerCase().includes(needle));
  return (
    <>
      <p className={admin.note}>
        Read-only: the bank is <code>content/bank.json</code>, changed in pull requests. {bank.questions.length}{" "}
        {bank.questions.length === 1 ? "question" : "questions"}.
      </p>
      <section aria-label="Questions" className={kit.card}>
        <label className={admin.field}>
          <span className="sr-only">Filter questions or categories</span>
          <input value={filter} placeholder="Filter questions or categories" onChange={(e) => setFilter(e.target.value)} />
        </label>
        {bank.questions.length === 0 ? (
          <p>The bank holds no questions.</p>
        ) : (
          <table className={admin.table} role="table">
            <thead role="rowgroup" className="sr-only-on-phones">
              <tr role="row">
                {COLUMNS.map((c) => (
                  <th key={c} role="columnheader">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {questions.map((q) => (
                <Fragment key={q.id}>
                <tr role="row" aria-label={q.prompt}>
                  <td role="cell" className={admin.strong} data-label="Question">
                    {/* Clicking the question opens its answer pool under the row (the human, 2026-11-15). */}
                    <button
                      type="button"
                      className={`${kit.link} ${admin.strong} ${pool.open}`}
                      aria-expanded={pools.includes(q.id)}
                      onClick={() => setPools(pools.includes(q.id) ? pools.filter((id) => id !== q.id) : [...pools, q.id])}
                    >
                      {q.prompt}
                    </button>
                  </td>
                  <td role="cell" data-label="Category">{q.category}</td>
                  <td role="cell" data-label="Themes">
                    {q.themes.length ? (
                      <span className={kit.chips}>
                        {q.themes.map((t) => (
                          <span key={t} className={kit.chip}>
                            {t}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className={admin.muted}>—</span>
                    )}
                  </td>
                  <td role="cell" data-label="Added by">{q.addedBy.charAt(0).toUpperCase() + q.addedBy.slice(1)}</td>
                  <td role="cell" data-label="Runs (caught)">
                    {q.uses.length === 0 ? (
                      <span className={admin.muted}>Not used yet</span>
                    ) : (
                      <ul className={admin.plain}>
                        {q.uses.map((u) => (
                          <li key={u.date} className={admin.nowrap}>
                            {u.day === "future" ? (
                              <span className={admin.muted}>Scheduled {dayText(u.date)}</span>
                            ) : u.catchRate === null ? (
                              // A started day with no answers to rate yet (human, 2026-10-26: "'Today, no answers yet'
                              // (Recommended)"); a closed one with none says so too.
                              <span className={admin.muted}>{u.day === "today" ? "Today, no answers yet" : `${dayText(u.date)}, no answers`}</span>
                            ) : (
                              <>
                                {dayText(u.date)} <b>{Math.round(u.catchRate * 100)}%</b> <span className={admin.muted}>of {u.answered}</span>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
                {pools.includes(q.id) && (
                  <tr role="row">
                    <td role="cell" colSpan={COLUMNS.length}>
                      <AnswerPool category={q.category} taken={[]} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
        {bank.questions.length > 0 && questions.length === 0 && <p>No question or category matches.</p>}
      </section>
      <section aria-label="Themes" className={kit.card}>
        <h3 className={admin.cardTitle}>Themes by date</h3>
        {bank.themes.length === 0 ? (
          <p>No themes set.</p>
        ) : (
          <table className={admin.table} role="table">
            <tbody role="rowgroup">
              {bank.themes.map((t) => (
                <tr role="row" key={t.date}>
                  <td role="cell" className={admin.nowrap}>{dayText(t.date)}</td>
                  <td role="cell">
                    <span className={kit.chip}>{t.theme}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
