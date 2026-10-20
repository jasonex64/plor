"use client";

// Today's Offbeat run: one question at a time, answers picked from the question's accepted bank by entry ID,
// a no-penalty "not in our list yet" for anything else, and a result screen (M02 ticket, UI criterion).
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { RunState } from "@/game/runs";
import type { PublicEntry, PublicQuestion } from "@/game/payload";
import { suggest } from "@/game/suggest";
import { ApiError, api } from "@/lib/api-client";
import { messageFor } from "./messages";

type RunResponse = { run: RunState };

function errorText(err: unknown): string {
  return err instanceof ApiError ? messageFor(err.code) : `Something went wrong: ${String(err)}`;
}

export function Game() {
  const [run, setRun] = useState<RunState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<RunResponse>("/api/run", { method: "GET" }).then((r) => setRun(r.run), (err) => setError(errorText(err)));
  }, []);

  async function send(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      setRun((await api<RunResponse>(path, { method: "POST", body })).run);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (!run) return error ? <p role="alert">{error}</p> : <p>Loading today&apos;s puzzle…</p>;
  const last = run.answered[run.answered.length - 1];
  return (
    <section>
      {run.status === "not_started" && (
        <>
          <p>
            Today&apos;s puzzle has {run.total} questions. Give an answer the host didn&apos;t: match the host and your run ends.
          </p>
          <button type="button" disabled={busy} onClick={() => send("/api/run/start")}>
            Start today&apos;s puzzle
          </button>
        </>
      )}
      {run.status === "in_progress" && run.question && (
        <>
          {last && <LastResult answered={last} />}
          <Question
            key={run.question.index}
            question={run.question}
            total={run.total}
            busy={busy}
            onAnswer={(entryId) => send("/api/run/answer", { index: run.question!.index, entryId })}
          />
        </>
      )}
      {(run.status === "died" || run.status === "survived") && <Result run={run} />}
      {run.status === "abandoned" && (
        <p role="alert">
          That run was from {run.date}, which has ended. <button type="button" onClick={() => window.location.reload()}>Load today&apos;s puzzle</button>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

function LastResult({ answered }: { answered: RunState["answered"][number] }) {
  return (
    <p>
      Safe! You said {answered.answer.name}; the host said {answered.hostAnswers.map((h) => h.name).join(", ")}.
    </p>
  );
}

function Question({
  question,
  total,
  busy,
  onAnswer,
}: {
  question: PublicQuestion;
  total: number;
  busy: boolean;
  onAnswer: (entryId: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<PublicEntry | null>(null);
  const [missNote, setMissNote] = useState<string | null>(null);
  const { matches, typos, exact } = useMemo(() => suggest(question.entries, typed), [question.entries, typed]);

  // Enter picks an entry the text names exactly (still confirmed with "Lock in"), and never sends a miss: during
  // the rehearsal, Enter on "passport" logged it as not in the list (human, 2026-10-19).
  function pickExact(event: FormEvent) {
    event.preventDefault();
    if (exact) setPicked(exact);
  }

  async function reportMiss() {
    setMissNote(null);
    try {
      await api("/api/run/miss", { method: "POST", body: { index: question.index, text: typed } });
      setMissNote(`"${typed.trim()}" is not in our list yet. Try another answer.`);
      setTyped("");
    } catch (err) {
      setMissNote(errorText(err));
    }
  }

  return (
    <div>
      <p>
        Question {question.index + 1} of {total}
      </p>
      <h2>{question.prompt}</h2>
      {picked ? (
        <>
          <p>Your answer: {picked.name}</p>
          <button type="button" disabled={busy} onClick={() => onAnswer(picked.id)}>
            Lock in {picked.name}
          </button>
          <button type="button" disabled={busy} onClick={() => setPicked(null)}>
            Change it
          </button>
        </>
      ) : (
        <form onSubmit={pickExact}>
          <label>
            Your answer
            <input
              value={typed}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => {
                setTyped(e.target.value);
                setMissNote(null);
              }}
            />
          </label>
          {typos.length > 0 && <p>Did you mean:</p>}
          {matches.length + typos.length > 0 && (
            <ul className="suggestions">
              {[...matches, ...typos].map((entry) => (
                <li key={entry.id}>
                  <button type="button" onClick={() => setPicked(entry)}>
                    {entry.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {typed.trim() !== "" && !exact && (
            <button type="button" disabled={busy} onClick={reportMiss}>
              Not in the list? Send &quot;{typed.trim()}&quot;
            </button>
          )}
          {missNote && <p role="status">{missNote}</p>}
        </form>
      )}
    </div>
  );
}

function Result({ run }: { run: RunState }) {
  const survived = run.answered.filter((a) => !a.matched).length;
  return (
    <div>
      <h2>{run.status === "survived" ? `You survived all ${run.total}!` : `Caught on question ${run.answered.length}`}</h2>
      <p>
        You survived {survived} of {run.total} questions. Come back tomorrow for a new puzzle.
      </p>
      <ol>
        {run.answered.map((a) => (
          <li key={a.index}>
            {a.prompt}: you said {a.answer.name}, the host said {a.hostAnswers.map((h) => h.name).join(", ")}
            {a.matched ? " (caught)" : " (safe)"}
          </li>
        ))}
      </ol>
    </div>
  );
}
