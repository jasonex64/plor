"use client";

// A played question's answers, searched (docs/milestones/M14-14b-12-answer-lists.md): under a question on your result
// card and on yesterday's card, Search answers opens a small box. Each answer the question accepted that bears the text
// (the most given while it's empty) shows by its main name, with the name that matched when it's another, its tier and,
// once enough players answered, how many gave it (human, 2026-10-30: "Search, with how common each was"; "10"; "Keep
// the 5-player minimum (Recommended)"). The server decides whether the question is open (src/game/answers.ts).
import { useEffect, useRef, useState } from "react";
import type { FoundAnswer } from "@/game/answers";
import { api } from "@/lib/api-client";
import { errorText } from "./messages";
import kit from "./kit.module.css";
import styles from "./answer-search.module.css";

const playersText = (n: number) => (n === 1 ? "1 player" : `${n} players`);

export function AnswerSearch({ date, index, prompt }: { date: string; index: number; prompt: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [found, setFound] = useState<FoundAnswer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Each keystroke asks again; only the latest answer is shown, so a slow earlier one can't overwrite it.
  const latest = useRef(0);
  useEffect(() => {
    if (!open) return;
    const asked = ++latest.current;
    api<{ answers: FoundAnswer[] }>(`/api/answers?${new URLSearchParams({ date, index: String(index), q: text })}`, { method: "GET" }).then(
      (r) => {
        if (asked !== latest.current) return;
        setFound(r.answers);
        setError(null);
      },
      (err) => {
        if (asked === latest.current) setError(errorText(err));
      },
    );
  }, [open, text, date, index]);

  if (!open)
    return (
      <button type="button" className={kit.link} onClick={() => setOpen(true)}>
        Search answers
      </button>
    );
  return (
    <div className={styles.search}>
      <label className={styles.box}>
        <span className="sr-only">Search the answers to {prompt}</span>
        <input type="search" placeholder="Search the answers" value={text} autoFocus onChange={(e) => setText(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      {found && !error && (
        <>
          {text.trim() === "" && found.length > 0 && <p className={styles.note}>The most given</p>}
          {found.length === 0 ? (
            <p className={styles.note}>No answer to this question matches.</p>
          ) : (
            <ul aria-label={`Answers to ${prompt}`} className={styles.found}>
              {found.map((a) => (
                <li key={a.name + (a.matched ?? "")}>
                  {a.name}
                  {a.matched && <span className={styles.note}> ({a.matched})</span>} <span className={kit.chip}>{a.tier}</span>
                  {a.players !== null && <span className={styles.note}> · {playersText(a.players)}</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
