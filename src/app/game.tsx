"use client";

// Today's Offbeat run: one question at a time, answered by typing (no list, no suggestions: the server reads the
// text; human, 2026-10-21), a free retry for text that names no entry, 20 seconds per question, a reveal after each
// answer that waits for Next, points as you go, and a result screen with the time to the next puzzle.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { RunState } from "@/game/runs";
import type { PublicQuestion } from "@/game/payload";
import { shareText } from "@/game/share";
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
      {run.status === "in_progress" && run.next && (
        <Reveal run={run} busy={busy} onNext={() => send("/api/run/next")} />
      )}
      {run.status === "in_progress" && run.question && (
        <>
          {/* Keyed by each state the server sends, so a retry restarts the count from the server's own time left. */}
          <Countdown key={`${run.question.index}:${run.msLeft}`} msLeft={run.msLeft!} onTimeUp={load} />
          <Question
            key={run.question.index}
            question={run.question}
            total={run.total}
            points={run.points}
            busy={busy}
            onAnswer={async (text) => (await send("/api/run/answer", { index: run.question!.index, text }))?.notInList ?? false}
          />
        </>
      )}
      {(run.status === "died" || run.status === "survived" || run.status === "timed_out") && <Result run={run} onReset={load} />}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

// Milliseconds left, counted down from what the server measured, waking only when the shown whole second changes,
// so it needs no refresh rate of its own. At zero it calls onZero once.
function useCountdown(ms: number, onZero: () => void): number {
  const [left, setLeft] = useState(ms);
  useEffect(() => {
    const end = performance.now() + ms;
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      const remaining = Math.max(0, end - performance.now());
      setLeft(remaining);
      if (remaining === 0) onZero();
      else timer = setTimeout(tick, remaining % 1000 || 1000);
    }
    tick();
    return () => clearTimeout(timer);
  }, [ms, onZero]);
  return left;
}

// Seconds left on the current question. At zero it asks the server again, which decides whether time is up
// (rule 3); the count itself is only a display.
function Countdown({ msLeft, onTimeUp }: { msLeft: number; onTimeUp: () => void }) {
  const seconds = Math.ceil(useCountdown(msLeft, onTimeUp) / 1000);
  return <p role="timer">{seconds === 1 ? "1 second left" : `${seconds} seconds left`}</p>;
}

// Time to the next puzzle at midnight Pacific, from the server's next reset (ROADMAP item from the M00 review).
function ResetCountdown({ msToReset, onReset }: { msToReset: number; onReset: () => void }) {
  const total = Math.ceil(useCountdown(msToReset, onReset) / 1000);
  const two = (n: number) => String(n).padStart(2, "0");
  return (
    <p role="timer">
      Next puzzle in {Math.floor(total / 3600)}:{two(Math.floor(total / 60) % 60)}:{two(total % 60)}
    </p>
  );
}

const pointsText = (n: number) => (n === 1 ? "1 point" : `${n} points`);

// After a safe answer (G5): your answer next to the host's, the points it earned, and the letter the Wind steals at
// the next question. The next question and its 20 seconds start on Next.
function Reveal({ run, busy, onNext }: { run: RunState; busy: boolean; onNext: () => void }) {
  const last = run.answered[run.answered.length - 1];
  return (
    <div>
      <h2>Safe!</h2>
      <p>
        You said {last.answer.name}; the host said {last.hostAnswers.map((h) => h.name).join(", ")}.
      </p>
      <p>
        +{pointsText(last.points)} · {pointsText(run.points)} so far
      </p>
      {run.next!.steals && <p>Next, the Wind steals {run.next!.steals.toUpperCase()}.</p>}
      <button type="button" autoFocus disabled={busy} onClick={onNext}>
        Next
      </button>
    </div>
  );
}

function Question({
  question,
  total,
  points,
  busy,
  onAnswer,
}: {
  question: PublicQuestion;
  total: number;
  points: number;
  busy: boolean;
  // Resolves true when the text named no entry (the player tries again).
  onAnswer: (text: string) => Promise<boolean>;
}) {
  const [typed, setTyped] = useState("");
  const [notInList, setNotInList] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  // A stolen letter's key does nothing (G11, human, 2026-10-21). Filtering the value, not the key press, also
  // covers paste and phone keyboards; accented letters count as their plain letter, as the server compares them.
  function change(value: string) {
    const kept = [...value].filter((ch) => !question.stolen.includes(ch.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "")));
    setBlocked(kept.length < [...value].length ? [...value].find((ch) => !kept.includes(ch))!.toUpperCase() : null);
    setTyped(kept.join(""));
    setNotInList(null);
  }

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
        Question {question.index + 1} of {total} · {pointsText(points)} so far
      </p>
      <h2>{question.prompt}</h2>
      {question.stolen.length > 0 && (
        <p>
          The Wind has taken: <strong>{question.stolen.map((l) => l.toUpperCase()).join(" ")}</strong>
        </p>
      )}
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
            onChange={(e) => change(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy || typed.trim() === ""}>
          Answer
        </button>
        {blocked && <p role="status">The Wind took {blocked}. Try a word without it.</p>}
        {notInList && <p role="status">&quot;{notInList}&quot; isn&apos;t in our list. Try another answer.</p>}
      </form>
    </div>
  );
}

function Result({ run, onReset }: { run: RunState; onReset: () => void }) {
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
        You survived {survived} of {run.total} questions and scored {pointsText(run.points)}.
      </p>
      <Share run={run} />
      <ol>
        {run.answered.map((a) => (
          <li key={a.index}>
            {a.prompt}: you said {a.answer.name}, the host said {a.hostAnswers.map((h) => h.name).join(", ")}
            {a.matched ? " (caught)" : ` (safe, +${pointsText(a.points)})`}
          </li>
        ))}
      </ol>
      <ResetCountdown msToReset={run.msToReset} onReset={onReset} />
    </div>
  );
}

// Share (M05, S4): the phone's share sheet where the browser has one (MDN, Navigator.share), otherwise the clipboard
// (MDN, Clipboard.writeText). The link is today's game at the site's root (S3), from the page's own origin so it's right
// on any deployment. A cancelled sheet rejects with AbortError, which isn't a failure (MDN); anything else is shown.
function Share({ run }: { run: RunState }) {
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    const text = shareText(run);
    const url = `${window.location.origin}/`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setNote("Copied");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setNote(`Couldn't share: ${String(err)}`);
    }
  }

  return (
    <p>
      <button type="button" onClick={share}>
        Share
      </button>{" "}
      {note && <span role="status">{note}</span>}
    </p>
  );
}
