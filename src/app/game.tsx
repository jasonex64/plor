"use client";

// Today's Offbeat run: one question at a time, answered by typing (no list, no suggestions: the server reads the
// text; human, 2026-10-21), a free retry for text that names no entry, 20 seconds per question, and a result screen.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { RunState } from "@/game/runs";
import type { PublicQuestion } from "@/game/payload";
import { ApiError, api } from "@/lib/api-client";
import { messageFor } from "./messages";

type RunResponse = { run: RunState };
type AnswerResponse = { run: RunState; notInList: boolean };

function errorText(err: unknown): string {
  return err instanceof ApiError ? messageFor(err.code) : `Something went wrong: ${String(err)}`;
}

export function Game() {
  const [run, setRun] = useState<RunState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Stable, so the countdown below doesn't restart when this component re-renders.
  const load = useCallback(() => {
    api<RunResponse>("/api/run", { method: "GET" }).then((r) => setRun(r.run), (err) => setError(errorText(err)));
  }, []);
  useEffect(load, [load]);

  async function send(path: string, body?: unknown): Promise<AnswerResponse | null> {
    setBusy(true);
    setError(null);
    try {
      const response = await api<AnswerResponse>(path, { method: "POST", body });
      setRun(response.run);
      return response;
    } catch (err) {
      setError(errorText(err));
      return null;
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
          {/* Keyed by each state the server sends, so a retry restarts the count from the server's own time left. */}
          <Countdown key={`${run.question.index}:${run.msLeft}`} msLeft={run.msLeft!} onTimeUp={load} />
          <Question
            key={run.question.index}
            question={run.question}
            total={run.total}
            busy={busy}
            onAnswer={async (text) => (await send("/api/run/answer", { index: run.question!.index, text }))?.notInList ?? false}
          />
        </>
      )}
      {(run.status === "died" || run.status === "survived" || run.status === "timed_out") && <Result run={run} />}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

// Seconds left on the current question, counted down from what the server measured. At zero it asks the server
// again, which decides whether time is up (rule 3); the count itself is only a display.
function Countdown({ msLeft, onTimeUp }: { msLeft: number; onTimeUp: () => void }) {
  const [left, setLeft] = useState(msLeft);
  useEffect(() => {
    const end = performance.now() + msLeft;
    let timer: ReturnType<typeof setTimeout>;
    // Wakes when the shown whole second changes, so the countdown needs no refresh rate of its own.
    function tick() {
      const remaining = Math.max(0, end - performance.now());
      setLeft(remaining);
      if (remaining === 0) onTimeUp();
      else timer = setTimeout(tick, remaining % 1000 || 1000);
    }
    tick();
    return () => clearTimeout(timer);
  }, [msLeft, onTimeUp]);
  const seconds = Math.ceil(left / 1000);
  return <p role="timer">{seconds === 1 ? "1 second left" : `${seconds} seconds left`}</p>;
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
  // Resolves true when the text named no entry (the player tries again).
  onAnswer: (text: string) => Promise<boolean>;
}) {
  const [typed, setTyped] = useState("");
  const [notInList, setNotInList] = useState<string | null>(null);

  // Enter sends the text; the server decides what it names. busy blocks a second Enter while one is in flight.
  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = typed.trim();
    if (text === "" || busy) return;
    if (await onAnswer(text)) {
      setNotInList(text);
      setTyped("");
    }
  }

  return (
    <div>
      <p>
        Question {question.index + 1} of {total}
      </p>
      <h2>{question.prompt}</h2>
      <form onSubmit={submit}>
        <label>
          Your answer
          <input
            value={typed}
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => {
              setTyped(e.target.value);
              setNotInList(null);
            }}
          />
        </label>
        <button type="submit" disabled={busy || typed.trim() === ""}>
          Answer
        </button>
        {notInList && <p role="status">&quot;{notInList}&quot; isn&apos;t in our list. Try another answer.</p>}
      </form>
    </div>
  );
}

function Result({ run }: { run: RunState }) {
  const survived = run.answered.filter((a) => !a.matched).length;
  return (
    <div>
      <h2>
        {run.status === "survived"
          ? `You survived all ${run.total}!`
          : run.status === "timed_out"
            ? `Time's up on question ${run.answered.length + 1}`
            : `Caught on question ${run.answered.length}`}
      </h2>
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
