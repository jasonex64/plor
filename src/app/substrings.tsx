"use client";

// Game 2's plain screen (docs/milestones/M14-14c-9-plain-game-2.md, Plan 1): the round as 16d-2 built it
// (docs/milestones/M16-16d-playing-it.md), inside 14c-8's play frame. Each round: its letters, the clock and a box that stays usable through the lockout, as the
// server enforces it and a player can still type (M16 16b, answer 6). Between rounds the next letters stay hidden until Next
// starts the clock (16d, answer 5). The top row's running score, each word's points and the end's score come from the server
// (16e); the end shows each round's word, and examples for one missed.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { PlayedRound, SubstringRun, TryOutcome } from "@/game/substring-state";
import { ApiError, api } from "@/lib/api-client";
import { SUBSTRINGS } from "@/platform/game";
import { Countdown } from "./countdown-bar";
import { GAME_2_STEPS, HowToPlay } from "./how-to-play";
import kit from "./kit.module.css";
import { errorText } from "./messages";
import { ordinal } from "./ordinal";
import { startBody, substringRoutes, type RunFamily } from "./run-routes";
import { PlayFrame, StatusMessage } from "./play-frame";
import { BACK } from "./slide";
import { LoadingStatus } from "./skeleton";
import styles from "./substrings.module.css";

type RunResponse = { run: SubstringRun | null };

// A refusal that means this screen is behind the server: a tab left between rounds overnight has no clock to bring it
// back, and its run isn't today's. Anything else is a failure, and is shown.
const BEHIND = ["no_run", "no_puzzle_today", "run_over", "round_running"];

// family: which routes it plays (src/app/run-routes.ts); a guest's Start runs botCheck first and sends its token (as game.tsx).
// onPlaying: whether the play frame is up, when the screen shows only the game (src/app/guest-game.tsx).
export function SubstringsScreen({ family = "account", botCheck, onPlaying }: { family?: RunFamily; botCheck?: () => Promise<string>; onPlaying?: (playing: boolean) => void }) {
  const routes = substringRoutes(family);
  const router = useRouter();
  const [run, setRun] = useState<SubstringRun | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<RunResponse>(routes.state, { method: "GET" }).then(
      (r) => {
        setRun(r.run);
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, [routes.state]);
  useEffect(load, [load]);

  const send = async (path: string, body?: unknown) => {
    try {
      setRun((await api<RunResponse>(path, { method: "POST", body })).run);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && BEHIND.includes(err.code)) load();
      else setError(errorText(err));
    }
  };

  // A guest's start is checked first, and the check's token goes with it; the button waits meanwhile, as one check runs at a time.
  const [starting, setStarting] = useState(false);
  const startRun = async () => {
    setStarting(true);
    try {
      let body;
      if (family === "guest") {
        try {
          body = startBody(family, await botCheck!());
        } catch (err) {
          setError(errorText(err));
          return;
        }
      }
      await send(routes.start, body);
    } finally {
      setStarting(false);
    }
  };

  // A run in play, and round 7's sentence, fill the frame, with the × back to Today as game 1's; before it and after it the page shows its card.
  const playing = run?.status === "in_progress";
  // Round 7 ends the server's run, so its word or time-up would land on the cards with its sentence never shown; the
  // frame stays up after a run played here is over, until See results or the ×, as game 1's does (answer 9). A page
  // opened on a finished run, or reloaded on it, never saw the run in play and goes straight to the cards.
  const [seen, setSeen] = useState(false);
  const [done, setDone] = useState(false);
  if (playing && !seen) setSeen(true);
  const inFrame = playing || (seen && run?.status === "finished" && !done);
  useEffect(() => onPlaying?.(inFrame), [onPlaying, inFrame]);
  const card = (
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
          <button type="button" className={kit.primary} disabled={starting} onClick={() => void startRun()}>
            Start
          </button>
          <HowToPlay steps={GAME_2_STEPS} />
        </>
      ) : run.status === "finished" ? (
        inFrame ? <Between run={run} onNext={() => setDone(true)} /> : <Results run={run} focus={seen && done} />
      ) : run.open ? (
        <Round key={run.open.index} run={run} tryPath={routes.try} onChange={setRun} onTimeUp={load} />
      ) : (
        <Between run={run} onNext={() => send(routes.next)} />
      )}
    </section>
  );
  return inFrame ? (
    <PlayFrame steps={GAME_2_STEPS} out="Back to Today" onLeave={() => router.push("/", { transitionTypes: BACK })}>
      {card}
    </PlayFrame>
  ) : (
    card
  );
}

const WHY: Partial<Record<TryOutcome, (letters: string) => string>> = {
  locked: () => "Too quick. Try again in a moment.",
  not_a_word: () => "Not in the dictionary.",
  needs_letters: (letters) => `Needs the letters ${letters}.`,
  already_used: () => "Already used.",
};

function Round({ run, tryPath, onChange, onTimeUp }: { run: SubstringRun; tryPath: string; onChange: (run: SubstringRun) => void; onTimeUp: () => void }) {
  const open = run.open!;
  const [text, setText] = useState("");
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A ref, not state: two Enters in one tick must see it. One try at a time, or the second comes back "locked" and hides
  // why the first failed (16d, answer 3).
  const trying = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (trying.current) return;
    if (text.trim() === "") {
      setText("");
      return;
    }
    trying.current = true;
    const sent = text;
    try {
      const result = await api<RunResponse & { outcome: TryOutcome }>(tryPath, { method: "POST", body: { text: sent } });
      setError(null);
      const why = WHY[result.outcome];
      if (why) {
        setReason(why(open.letters));
      } else if (result.outcome !== "empty") {
        onChange(result.run!);
        return;
      }
      // A try that didn't count leaves the box empty for the next word, unless they've typed on since (DECISIONS.md, Game 2).
      setText((now) => (now === sent ? "" : now));
    } catch (err) {
      setError(errorText(err));
    } finally {
      trying.current = false;
    }
  }

  return (
    <>
      <Top round={open.index + 1} total={run.total} score={run.score!.total} />
      <p className={styles.letters}>{open.letters}</p>
      <Countdown key={open.msLeft} msLeft={open.msLeft} onTimeUp={onTimeUp} />
      <p className={styles.progress}>Bonus letter {run.bonusLetter}</p>
      <Tracker used={run.score!.used} />
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

// The round and the running score, above every state of a run in play (docs/milestones/M14-14c-9-plain-game-2.md,
// answers 6 and 7). The score is the server's total so far.
function Top({ round, total, score }: { round: number; total: number; score: number }) {
  return (
    <div className={styles.top}>
      <p className={styles.progress}>
        Round {round} of {total}
      </p>
      <p className={styles.topScore}>
        <small>Score</small>
        <b>{score}</b>
      </p>
    </div>
  );
}

function Between({ run, onNext }: { run: SubstringRun; onNext: () => void }) {
  const last = run.rounds[run.rounds.length - 1];
  const sentence = last.word === null ? "Time's up." : `You played ${last.word}: ${scored(last)}.`;
  return (
    <>
      <Top round={run.rounds.length} total={run.total} score={run.score!.total} />
      {/* The sentence is a status message for screen readers (WCAG 2.2 4.1.3), as game 1's result is. */}
      <p>{sentence}</p>
      <StatusMessage text={sentence} />
      <Tracker used={run.score!.used} />
      {/* Focus moves here as the box goes, so Enter goes on (WCAG 2.2 2.4.3). */}
      <button type="button" className={kit.primary} autoFocus onClick={onNext}>
        {run.status === "finished" ? "See results" : "Next"}
      </button>
    </>
  );
}

// A word's points, with the bonus letter's when it holds it (M16 16e, answer 20).
const scored = (round: PlayedRound) => `${round.points} points${round.bonus > 0 ? `, and ${round.bonus} for the bonus letter` : ""}`;

// The letters the run has used, cashed in at its end (answer 6). The row of letters is for the eye; the count says it.
function Tracker({ used }: { used: string }) {
  return (
    <div className={styles.tracker}>
      <p className={styles.progress}>
        Letters used: {used.length} of {ALPHABET.length}
      </p>
      <p aria-hidden="true" className={styles.alphabet}>
        {[...ALPHABET].map((letter) => (
          <span key={letter} className={used.includes(letter) ? styles.used : undefined}>
            {letter}
          </span>
        ))}
      </p>
    </div>
  );
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

// Where the run stands so far today (M16 16e-2, answers 3 and 19): among the day's finished players once there are
// enough, and among the player's friends who've finished.
function Standing({ standing }: { standing: NonNullable<SubstringRun["standing"]> }) {
  return (
    <>
      {standing.percent !== null && <p>Better than {standing.percent}% of players so far today.</p>}
      {standing.friends && (
        <p>
          {ordinal(standing.friends.rank)} of {standing.friends.of} with your friends so far today.
        </p>
      )}
    </>
  );
}

// focus: coming from round 7's sentence, whose See results had focus and is gone with the frame (WCAG 2.2 2.4.3), as game 1's
// results heading takes it.
function Results({ run, focus }: { run: SubstringRun; focus: boolean }) {
  const score = run.score!;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) heading.current!.focus();
  }, [focus]);
  const bonusWords = run.rounds.filter((round) => round.bonus > 0).length;
  return (
    <>
      <h3 ref={heading} tabIndex={-1} className={styles.heading}>
        Your score
      </h3>
      <dl className={styles.score}>
        <dt>Words</dt>
        <dd>{score.words}</dd>
        <dt>Bonus letter {run.bonusLetter}, in {bonusWords === 1 ? "1 word" : `${bonusWords} words`}</dt>
        <dd>{score.bonus}</dd>
        <dt>Different letters, {score.used.length} of {ALPHABET.length}</dt>
        <dd>{score.letters}</dd>
        <dt>Total</dt>
        <dd className={styles.total}>{score.total}</dd>
      </dl>
      {run.standing && <Standing standing={run.standing} />}
      <h3 className={styles.heading}>Your rounds</h3>
      <ol aria-label="Your rounds" className={styles.results}>
        {run.rounds.map((round) => (
          <li key={round.letters}>
            <span className={kit.chip}>{round.letters}</span> {round.word === null ? "Missed" : `${round.word}, ${scored(round)}`}
            {round.examples.length > 0 && <p className={styles.progress}>You could have played {round.examples.join(", ")}</p>}
          </li>
        ))}
      </ol>
    </>
  );
}
