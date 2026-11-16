"use client";

// A question's answer pool (docs/milestones/M15-15g-the-answer-pool.md): how many answers its category holds, a
// search by any part of any name, and the answers a page at a time. Read-only (answer 5). `taken` is the letters
// taken by the question's turn on a drafted day, none on the bank: an answer whose shown name holds one is muted
// with that letter struck, as the host chips draw it, and still found by search (answer 9).
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { PoolView } from "@/admin/pool";
import { normalize } from "@/content/puzzle";
import { api } from "@/lib/api-client";
import { errorText } from "../messages";
import admin from "./admin.module.css";
import kit from "../kit.module.css";
import styles from "./pool.module.css";
import { Line, Skeleton } from "../skeleton";

const count = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

export function AnswerPool({ category, taken }: { category: string; taken: string[] }) {
  const [typed, setTyped] = useState("");
  // The search the rows answer, which the box may have moved on from.
  const [searched, setSearched] = useState("");
  const [pool, setPool] = useState<PoolView | null>(null);
  // Counted with the pool's first page only (src/admin/pool.ts), so kept while searching and paging.
  const [clean, setClean] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const letters = taken.join("");

  const fetchPage = useCallback(
    (q: string, offset: number) => api<PoolView>(`/api/admin/pool?${new URLSearchParams({ category, taken: letters, q, offset: String(offset) })}`, { method: "GET" }),
    [category, letters],
  );
  // A page the rows now answer: the first of a search replaces them, a later one follows them.
  const show = useCallback((page: PoolView, q: string, offset: number) => {
    setPool((before) => (offset > 0 && before ? { ...page, rows: [...before.rows, ...page.rows] } : page));
    if (page.clean !== null) setClean(page.clean);
    setSearched(q);
    setBusy(false);
  }, []);
  const fail = useCallback((err: unknown) => {
    setError(errorText(err));
    setBusy(false);
  }, []);
  // The whole pool's first page, when the panel opens.
  useEffect(() => {
    fetchPage("", 0).then((page) => show(page, "", 0), fail);
  }, [fetchPage, show, fail]);

  function load(q: string, offset: number) {
    setBusy(true);
    setError(null);
    fetchPage(q, offset).then((page) => show(page, q, offset), fail);
  }

  function search(event: FormEvent) {
    event.preventDefault();
    load(typed, 0);
  }

  const name = category.replaceAll("_", " ");
  return (
    <section aria-label={`Answer pool: ${name}`} className={styles.pool}>
      {error && <p role="alert">{error}</p>}
      {!pool && !error && (
        <Skeleton label="Loading the answer pool">
          <Line />
        </Skeleton>
      )}
      {pool && (
        <>
          <p className={admin.note}>
            <b>{count(pool.members, "answer", "answers")}</b> for any {name}
            {clean !== null && `; ${count(clean, "has", "have")} no taken letter (${taken.join(", ").toUpperCase()}) in the name`}.
          </p>
          <form onSubmit={search} className={admin.search}>
            <label className={admin.field}>
              <span className="sr-only">Part of an answer&rsquo;s name</span>
              <input value={typed} placeholder="Part of any name" onChange={(e) => setTyped(e.target.value)} />
            </label>
            <button type="submit" className={`${kit.primary} ${kit.small} ${admin.button}`} disabled={busy}>
              Search
            </button>
          </form>
          {normalize(searched) !== "" && (
            <p role="status" className={admin.note}>
              {pool.matching === 0 ? "No answer has" : count(pool.matching, "answer has", "answers have")} &ldquo;{normalize(searched)}&rdquo; in a name.
            </p>
          )}
          <ul className={`${admin.plain} ${styles.rows}`}>
            {pool.rows.map((row) => (
              <li key={row.id} className={row.taken ? styles.taken : undefined}>
                <span>{[...row.name].map((ch, i) => (row.taken !== null && normalize(ch).includes(row.taken) ? <s key={i}>{ch}</s> : ch))}</span>
                {row.alias && <span className={admin.muted}> also &ldquo;{row.alias}&rdquo;</span>}
                {row.taken && <span> ({row.taken.toUpperCase()} is taken)</span>}
              </li>
            ))}
          </ul>
          {pool.rows.length < pool.matching && (
            <button type="button" className={`${kit.link} ${styles.more}`} disabled={busy} onClick={() => load(searched, pool.rows.length)}>
              Show more ({pool.rows.length.toLocaleString("en-US")} of {pool.matching.toLocaleString("en-US")})
            </button>
          )}
        </>
      )}
    </section>
  );
}
