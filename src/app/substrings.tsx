"use client";

// Game 2's plain screen (docs/milestones/M16-16d-playing-it.md, 16d-2): the kit and nothing of its own look, which comes
// with Moonbrew (16g). Each round: its letters, the clock and a box that stays usable through the lockout, as the server
// enforces it and a player can still type (M16 16b, answer 6). Between rounds the next letters stay hidden until Next
// starts the clock (16d, answer 5). The end shows each round's word, and examples for one missed. There are no points
// until 16e.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SubstringRun, TryOutcome } from "@/game/substring-state";
import { api } from "@/lib/api-client";
import { SUBSTRINGS } from "@/platform/game";
import { useCountdown } from "./countdown";
import kit from "./kit.module.css";
import { errorText } from "./messages";
import { LoadingStatus } from "./skeleton";
import styles from "./substrings.module.css";

type RunResponse = { run: SubstringRun | null };

export function SubstringsScreen() {
  const [run, setRun] = useState<SubstringRun | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<RunResponse>("/api/substrings", { method: "GET" }).then(
      (r) => {
        setRun(r.run);
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, []);
  useEffect(load, [load]);

  const send = async (path: string) => {
    try {
      setRun((await api<RunResponse>(path, { method: "POST" })).run);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <section aria-label={SUBSTRINGS.name} className={kit.card}>
      <h2 className={styles.title}>{SUBSTRINGS.name}</h2>
      {error && <p role="alert">{error}</p>}
      {run === undefined ? (
        !error && <LoadingStatus>Loading the game</LoadingStatus>
      ) : run === null ? (
        <p>There&apos;s no puzzle today.</p>
      ) : run.status === "not_started" ? (
        <>
          <p>{run.total} rounds. Each gives you a few letters and 20 seconds to type a word that holds them.</p>
          <button type="button" className={kit.primary} onClick={() => send("/api/substrings/start")}>
            Start
          </button>
        </>
      ) : run.status === "finished" ? (
        <Results run={run} />
      ) : run.open ? (
        <Round key={run.open.index} run={run} onChange={setRun} onTimeUp={load} />
      ) : (
        <Between run={run} onNext={() => send("/api/substrings/next")} />
      )}
    </section>
  );
}

const WHY: Partial<Record<TryOutcome, (letters: string) => string>> = {
  locked: () => "Too quick. Try again in a moment.",
  not_a_word: () => "Not in the dictionary.",
  needs_letters: (letters) => `Needs the letters ${letters}.`,
  already_used: () => "Already used.",
};

function Round({ run, onChange, onTimeUp }: { run: SubstringRun; onChange: (run: SubstringRun) => void; onTimeUp: () => void }) {
  const open = run.open!;
  const [text, setText] = useState("");
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const sent = text;
    try {
      const result = await api<RunResponse & { outcome: TryOutcome }>("/api/substrings/try", { method: "POST", body: { text: sent } });
      setError(null);
      if (result.outcome === "empty") return;
      const why = WHY[result.outcome];
      if (why) {
        setReason(why(open.letters));
        // The box clears for the next word, unless they've typed on since.
        setText((now) => (now === sent ? "" : now));
      } else {
        onChange(result.run!);
      }
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <>
      <p className={styles.progress}>
        Round {open.index + 1} of {run.total}
      </p>
      <p className={styles.letters}>{open.letters}</p>
      <Clock key={open.msLeft} msLeft={open.msLeft} onTimeUp={onTimeUp} />
      <p className={styles.progress}>Bonus letter {run.bonusLetter}</p>
      <form onSubmit={submit} className={styles.form}>
        <label>
          Your word
          {/* Phones shouldn't change what's typed: a corrected word isn't the player's. */}
          <input value={text} onChange={(e) => setText(e.target.value)} autoFocus autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="go" />
        </label>
        <button type="submit" className={kit.primary}>
          Try
        </button>
      </form>
      <p role="status" className={styles.reason}>
        {reason}
      </p>
      {error && <p role="alert">{error}</p>}
    </>
  );
}

function Clock({ msLeft, onTimeUp }: { msLeft: number; onTimeUp: () => void }) {
  const seconds = Math.ceil(useCountdown(msLeft, onTimeUp) / 1000);
  return (
    <p role="timer" className={styles.clock}>
      {seconds}
      <span className="sr-only"> seconds left</span>
    </p>
  );
}

function Between({ run, onNext }: { run: SubstringRun; onNext: () => void }) {
  const last = run.rounds[run.rounds.length - 1];
  return (
    <>
      <p className={styles.progress}>
        Round {run.rounds.length} of {run.total}
      </p>
      <p>{last.word === null ? "Time's up." : `You played ${last.word}`}</p>
      <button type="button" className={kit.primary} onClick={onNext}>
        Next
      </button>
    </>
  );
}

function Results({ run }: { run: SubstringRun }) {
  return (
    <>
      <h3 className={styles.heading}>Your rounds</h3>
      <ol aria-label="Your rounds" className={styles.results}>
        {run.rounds.map((round) => (
          <li key={round.letters}>
            <span className={kit.chip}>{round.letters}</span> {round.word ?? "Missed"}
            {round.examples.length > 0 && <p className={styles.progress}>You could have played {round.examples.join(", ")}</p>}
          </li>
        ))}
      </ol>
    </>
  );
}
