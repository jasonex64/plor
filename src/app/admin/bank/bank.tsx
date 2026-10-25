"use client";

// The question bank (docs/milestones/M13-13d-the-question-bank.md): each question with its category, themes, the days
// it ran and the share of answers the host caught on each, then the themes set for dates. Read-only: the bank is
// content/bank.json, changed in pull requests. Plain on purpose; the look is M14's job.
import { useEffect, useState } from "react";
import type { BankView } from "@/admin/bank";
import { api } from "@/lib/api-client";
import { errorText } from "../../messages";

export function Bank() {
  const [bank, setBank] = useState<BankView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<BankView>("/api/admin/bank", { method: "GET" }).then(setBank, (err) => setError(errorText(err)));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!bank) return <p>Loading…</p>;
  return (
    <>
      <section aria-label="Questions">
        {bank.questions.length === 0 && <p>The bank holds no questions.</p>}
        {bank.questions.map((q) => (
          <article key={q.id} aria-label={q.prompt}>
            <h2>{q.prompt}</h2>
            <p>
              Category {q.category}; themes: {q.themes.length ? q.themes.join(", ") : "none"}; added by {q.addedBy}.
            </p>
            {q.uses.length === 0 ? (
              <p>Not used yet.</p>
            ) : (
              <ul>
                {q.uses.map((u) => (
                  <li key={u.date}>
                    {u.date}: {u.catchRate === null ? "not played yet" : `${Math.round(u.catchRate * 100)}% caught of ${u.answered} answers`}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>
      <section aria-label="Themes">
        <h2>Themes by date</h2>
        {bank.themes.length === 0 ? (
          <p>No themes set.</p>
        ) : (
          <ul>
            {bank.themes.map((t) => (
              <li key={t.date}>
                {t.date}: {t.theme}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
