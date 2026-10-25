"use client";

// Today's Offbeat run: one question at a time, answered by typing (no list, no suggestions: the server reads the
// text; human, 2026-10-21), a free retry for text that names no entry, 20 seconds per question, a reveal after each
// answer that waits for Next, points as you go, and a result screen. Above it, the player's streak, and on the result
// screen how many players gave each answer (docs/milestones/M11-home-screen.md, 11a). Offbeat's banner frames it on
// Today: Play before, the score and the time to the next puzzle after (docs/milestones/M14-14a-2a-today.md).
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { RunState } from "@/game/runs";
import type { PublicQuestion } from "@/game/payload";
import { shareText } from "@/game/share";
import { api } from "@/lib/api-client";
import { useCountdown } from "./countdown";
import { errorText } from "./messages";
import styles from "./game.module.css";
import { shareLink } from "./share";

// run is null on a day with no puzzle, with the streak and the time to the reset (M12 12f, F2).
type RunResponse = { run: RunState } | { run: null; msToReset: number; streak: number };
type NoPuzzle = { msToReset: number; streak: number };
type AnswerResponse = { run: RunState; notInList: boolean };

// onOver hears whether today's run is over, each time that changes, so the comments can open (M08 8a). onDayOver is
// called at the reset, midnight Pacific, so the page can move to the new day (docs/milestones/M11-home-screen.md, H6);
// inPlay says a question or a reveal is in play then, so this game is left alone: a run started before midnight is
// played to its end after it (M04 G13; DECISIONS.md, Game 1: Timer).
export function Game({ onOver, onDayOver }: { onOver: (over: boolean) => void; onDayOver: (inPlay: boolean) => void }) {
  const [run, setRun] = useState<RunState | null>(null);
  const [noPuzzle, setNoPuzzle] = useState<NoPuzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const over = run?.status === "died" || run?.status === "survived" || run?.status === "timed_out";
  useEffect(() => onOver(over), [onOver, over]);

  // Stable, so the countdown below doesn't restart when this component re-renders.
  const load = useCallback(() => {
    api<RunResponse>("/api/run", { method: "GET" }).then(
      (r) => (r.run ? setRun(r.run) : setNoPuzzle({ msToReset: r.msToReset, streak: r.streak })),
      (err) => setError(errorText(err)),
    );
  }, []);
  useEffect(load, [load]);
  // Each state carries the time to the reset as the server measured it, so the timer starts again from each one, with
  // whether that state is in play.
  useEffect(() => {
    const msToReset = run?.msToReset ?? noPuzzle?.msToReset;
    if (msToReset === undefined) return;
    const timer = setTimeout(() => onDayOver(run?.status === "in_progress"), msToReset);
    return () => clearTimeout(timer);
  }, [run, noPuzzle, onDayOver]);

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

  if (noPuzzle) {
    return (
      <section>
        <Streak days={noPuzzle.streak} />
        <Banner>
          <p className={styles.line}>There&apos;s no puzzle today.</p>
          <ResetCountdown label="A new day starts in" msToReset={noPuzzle.msToReset} />
        </Banner>
      </section>
    );
  }
  if (!run) return error ? <p role="alert">{error}</p> : <p>Loading today&apos;s puzzle…</p>;
  return (
    <section>
      <Streak days={run.streak} />
      {run.status === "not_started" && (
        <Banner>
          <p className={styles.line}>Don&apos;t match the Wind · {run.total} questions</p>
          {/* Play starts the run here until Offbeat's game screen, /offbeat, ships in 14a-2b. */}
          <button type="button" className={styles.play} disabled={busy} onClick={() => send("/api/run/start")}>
            Play
          </button>
        </Banner>
      )}
      {run.status === "in_progress" && <Banner />}
      {over && (
        <Banner>
          <p className={styles.line}>
            {pointsText(run.points)} + about {run.bonus} bonus · {endedText(run)}
          </p>
          <a href="#result" className={styles.result}>
            Result
          </a>
          <ResetCountdown label="Next puzzle in" msToReset={run.msToReset} />
        </Banner>
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
      {over && <Result run={run} />}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

// Offbeat's banner: the game's name, then what the day holds for the player.
function Banner({ children }: { children?: ReactNode }) {
  return (
    <div className={styles.banner}>
      <h2 className={styles.title}>Offbeat</h2>
      {children}
    </div>
  );
}

// How a finished run ended, as the banner says it.
function endedText(run: RunState): string {
  if (run.status === "survived") return `survived all ${run.total}`;
  if (run.status === "timed_out") return `time's up on question ${run.answered.length + 1}`;
  return `caught on question ${run.answered.length}`;
}

// Seconds left on the current question. At zero it asks the server again, which decides whether time is up
// (rule 3); the count itself is only a display.
function Countdown({ msLeft, onTimeUp }: { msLeft: number; onTimeUp: () => void }) {
  const seconds = Math.ceil(useCountdown(msLeft, onTimeUp) / 1000);
  return <p role="timer">{seconds === 1 ? "1 second left" : `${seconds} seconds left`}</p>;
}

// Nothing to do at zero: Game's own timer moves the page to the new day.
const NOTHING = () => {};

function Streak({ days }: { days: number }) {
  return <p>Streak: {days === 1 ? "1 day" : `${days} days`} played in a row</p>;
}

// Time to the next reset at midnight Pacific, from the server's next reset (ROADMAP item from the M00 review). label
// says what comes then: the next puzzle after a run, only a new day when today has none, since tomorrow may not either.
function ResetCountdown({ label, msToReset }: { label: string; msToReset: number }) {
  const total = Math.ceil(useCountdown(msToReset, NOTHING) / 1000);
  const two = (n: number) => String(n).padStart(2, "0");
  return (
    <p role="timer">
      {label} {Math.floor(total / 3600)}:{two(Math.floor(total / 60) % 60)}:{two(total % 60)}
    </p>
  );
}

const pointsText = (n: number) => (n === 1 ? "1 point" : `${n} points`);

// How many of the question's players gave this answer so far (M11 H5). Under 1% doesn't round to a misleading 0%.
function givenText(share: number | null): string {
  if (share === null) return "too few players yet";
  return share < 0.01 ? "under 1% gave this" : `${Math.round(share * 100)}% gave this`;
}

// After a safe answer (G5): your answer next to the host's, the points it earned with its estimated rarity bonus (M09:
// from the expected popularity alone; the final bonus is worked out once the day is over), and the letter the Wind
// steals at the next question. The next question and its 20 seconds start on Next.
function Reveal({ run, busy, onNext }: { run: RunState; busy: boolean; onNext: () => void }) {
  const last = run.answered[run.answered.length - 1];
  return (
    <div>
      <h2>Safe!</h2>
      <p>
        You said {last.answer.name}; the host said {last.hostAnswers.map((h) => h.name).join(", ")}.
      </p>
      <p>
        +{pointsText(last.points)}, rarity bonus +{last.bonus} (estimate) · {pointsText(run.points)} so far
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

// The result's details, below the banner, which carries the score and the time to the next puzzle.
function Result({ run }: { run: RunState }) {
  const survived = run.answered.filter((a) => !a.matched).length;
  return (
    <div id="result">
      <h2>
        {run.status === "survived"
          ? `You survived all ${run.total}!`
          : run.status === "timed_out"
            ? `Time's up on question ${run.answered.length + 1}`
            : `Caught on question ${run.answered.length}`}
      </h2>
      <p>
        You survived {survived} of {run.total} questions and scored {pointsText(run.points)}, plus a rarity bonus of about{" "}
        {run.bonus}. The final bonus is worked out once the day is over.
      </p>
      <Share run={run} />
      <ol>
        {run.answered.map((a) => (
          <li key={a.index}>
            {a.prompt}: you said {a.answer.name}, the host said {a.hostAnswers.map((h) => h.name).join(", ")}
            {a.matched ? " (caught)" : ` (safe, +${pointsText(a.points)}, bonus +${a.bonus})`} · {givenText(a.share)}
          </li>
        ))}
      </ol>
    </div>
  );
}

// Share (M05, S4), by the share sheet or the clipboard (src/app/share.ts). The link is today's game at the site's root
// (S3), from the page's own origin so it's right on any deployment.
function Share({ run }: { run: RunState }) {
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    try {
      if (await shareLink(shareText(run), `${window.location.origin}/`)) setNote("Copied");
    } catch (err) {
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
