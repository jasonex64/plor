"use client";

// Offbeat's run (docs/milestones/M14-14a-2b-game-screen.md): on its game screen, /offbeat, the rules and Start, then
// one question at a time, answered by typing (no list, no suggestions: the server reads the text; human, 2026-10-21),
// a free retry for text that names no entry, 20 seconds per question, a reveal after each answer that waits for Next,
// points as you go, and a result with how many players gave each answer (docs/milestones/M11-home-screen.md, 11a). On
// Today, Offbeat's banner links in: Play before, the score and the time to the next puzzle after
// (docs/milestones/M14-14a-2a-today.md); with Skip the game screen on, Play starts the run itself
// (docs/milestones/M14-14a-3b-settings.md, L39).
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { RunState } from "@/game/runs";
import { FINISHED } from "@/game/status";
import type { PublicQuestion } from "@/game/payload";
import { shareText, survivedCount } from "@/game/share";
import { POINTS_PER_QUESTION } from "@/config/tunables";
import { api, ApiError } from "@/lib/api-client";
import { capitalized, caughtText, gotPastText, timedOutText } from "@/game/words";
import { normalize } from "@/content/puzzle";
import { bonusNote, earnsBonus } from "./bonus";
import { ButtonLink } from "./button-link";
import { useCountdown } from "./countdown";
import { FORWARD } from "./slide";
import { givenText } from "./given";
import { errorText } from "./messages";
import styles from "./game.module.css";
import kit from "./kit.module.css";
import { shareLink } from "./share";
import { GAME } from "@/platform/game";
import { Line, Skeleton } from "./skeleton";

// run is null on a day with no puzzle, with the time to the reset (M12 12f, F2).
type RunResponse = { run: RunState } | { run: null; msToReset: number };
type NoPuzzle = { msToReset: number };
type AnswerResponse = { run: RunState; notInList: boolean };

// What a page showing the day's run hears. onOver: whether today's run is over, once the run's state has loaded and
// each time that changes after, so the comments can open (M08 8a). Nothing is reported before the state loads, so a
// run already over reports true first, never false then true (docs/milestones/M14-14a-2c-review-fixes.md). So across
// the reset, or on a day with no puzzle, a page's last value stays the day before's until the new state loads: the
// pages read it only to open the comments, which load again on the new day (14b-2c-1, item 21). onDayOver: the reset,
// midnight Pacific, so the page can move to the new day
// (docs/milestones/M11-home-screen.md, H6); inPlay says a question or a reveal is in play then, so the game is left
// alone: a run started before midnight is played to its end after it (M04 G13; DECISIONS.md, Game 1: Timer).
type DayHooks = { onOver: (over: boolean) => void; onDayOver: (inPlay: boolean) => void };

// The day's run as the server last gave it, for Today's banner and the game screen alike.
function useRun({ onOver, onDayOver }: DayHooks) {
  const [run, setRun] = useState<RunState | null>(null);
  const [noPuzzle, setNoPuzzle] = useState<NoPuzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const over = run !== null && FINISHED.includes(run.status);
  const loaded = run !== null;
  useEffect(() => {
    if (loaded) onOver(over);
  }, [onOver, loaded, over]);

  // Stable, so the countdown below doesn't restart when the component re-renders.
  const load = useCallback(() => {
    api<RunResponse>("/api/run", { method: "GET" }).then(
      (r) => (r.run ? setRun(r.run) : setNoPuzzle({ msToReset: r.msToReset })),
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
  return { run, setRun, noPuzzle, error, setError, over, load };
}

// Starts today's run and opens the game screen with question 1 in play: Start climbing on How to play, and Play on
// Today with Skip the game screen on. direction: the slide, back up from How to play, forward from Today (14b-6e).
export function useStartRun(direction: string[]) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/run/start", { method: "POST" });
      router.push(GAME.path, { transitionTypes: direction });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }
  return { start, busy, error };
}

// Offbeat on Today: Play opens the game screen, or with skip starts the run there; a run in play is continued there;
// after it, the score, how it ended, the result and the time to the next puzzle.
export function TodayBanner({ skip, ...hooks }: DayHooks & { skip: boolean }) {
  const { run, noPuzzle, error, over } = useRun(hooks);
  const starting = useStartRun(FORWARD);
  if (noPuzzle) return <NoPuzzleBanner msToReset={noPuzzle.msToReset} />;
  if (!run) return error ? <p role="alert">{error}</p> : <BannerSkeleton />;
  return (
    <>
      <Banner date={run.date}>
        {run.status === "not_started" && !skip && (
          <>
            <Facts facts={[`${run.total} stops`, "Don't match the Wind"]} />
            <ButtonLink href={GAME.path} transitionTypes={FORWARD} className={`${kit.primary} ${styles.play}`}>
              Play
            </ButtonLink>
          </>
        )}
        {/* Skipping the game screen skips its rules line too, so the time limit is said here before it runs (WCAG 2.2
            2.2.1; human, 2026-10-25: "Add the 20 seconds (Recommended)"). The 20 seconds are judged in SQL
            (private.question_deadline), so they have no constant here. */}
        {run.status === "not_started" && skip && (
          <>
            <Facts facts={[`${run.total} stops`, "20 seconds each", "Don't match the Wind"]} />
            <button type="button" className={`${kit.primary} ${styles.play}`} disabled={starting.busy} onClick={() => void starting.start()}>
              Play
            </button>
            {starting.error && <p role="alert">{starting.error}</p>}
          </>
        )}
        {run.status === "in_progress" && (
          <>
            <Facts facts={["Your run is still going"]} />
            <ButtonLink href={GAME.path} transitionTypes={FORWARD} className={`${kit.primary} ${styles.play}`}>
              Continue
            </ButtonLink>
          </>
        )}
        {over && <Score run={run} />}
      </Banner>
    </>
  );
}

// What the game screen draws a run from, and what its controls do: play's routes (Game), or a test run that saves
// nothing (TestGame; docs/milestones/M14-14b-11-test-runs.md). answer: whether the text named no answer, the free
// retry.
type Runner = {
  run: RunState | null;
  noPuzzle: NoPuzzle | null;
  error: string | null;
  busy: boolean;
  over: boolean;
  start: () => void;
  next: () => void;
  answer: (text: string) => Promise<boolean>;
  timeUp: () => void;
};

// The run on the game screen. Before it starts, the stakes sit above Start (the critique's P1; the 20 seconds are
// stated before the timer runs, WCAG 2.2 2.2.1), with How to play. onStarted: Start began today's run, which counts in
// the streak at once (src/game/streak.ts), so the shell's rank can follow (docs/milestones/M14-14b-2a-streak-ranks.md).
// onPlaying: whether the run is in progress, when the screen shows only the question (docs/milestones/
// M14-14b-6-feel-and-polish.md, 14b-6c; answers 22 and 23).
export function Game({ onStarted, onPlaying, ...hooks }: DayHooks & { onStarted: () => void; onPlaying: (playing: boolean) => void }) {
  const { run, setRun, noPuzzle, error, setError, over, load } = useRun(hooks);
  const [busy, setBusy] = useState(false);

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

  const runner: Runner = {
    run,
    noPuzzle,
    error,
    busy,
    over,
    start: () => void send("/api/run/start").then((r) => r && onStarted()),
    next: () => void send("/api/run/next"),
    answer: async (text) => (await send("/api/run/answer", { index: run!.question!.index, text }))?.notInList ?? false,
    timeUp: load,
  };
  return <Run runner={runner} onPlaying={onPlaying} share />;
}

// A test run (docs/milestones/M14-14b-11-test-runs.md): an admin plays a day as often as they like and nothing is saved
// (human, 2026-10-29, answer 2). The browser holds the run, the texts that named answers and whether the next question
// is open, and sends all of it each time to POST /api/admin/test, which answers with play's state, so this is the same
// screen (answer 3). hostAnswers: a draft's, as its page shows them (answer 9); null for an approved day. Restart
// (answer 12) mounts it again. Its 20 seconds count down here alone: nothing is stored for the database to judge.
type Moves = { texts: string[]; open: boolean; timedOut: boolean };
const FRESH: Moves = { texts: [], open: false, timedOut: false };

export function TestGame({ date, hostAnswers, onPlaying }: { date: string; hostAnswers: string[][] | null; onPlaying: (playing: boolean) => void }) {
  const [run, setRun] = useState<RunState | null>(null);
  const [moves, setMoves] = useState<Moves>(FRESH);
  const [error, setError] = useState<string | null>(null);
  // What approval would refuse in a draft, listed as approval lists it (answer 11).
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const body = useCallback((next: Moves, text: string | null) => ({ date, ...(hostAnswers && { hostAnswers }), ...next, text }), [date, hostAnswers]);
  // The run before it starts, once each time this is mounted.
  useEffect(() => {
    api<AnswerResponse>("/api/admin/test", { method: "POST", body: body(FRESH, null) }).then(
      (r) => setRun(r.run),
      (err) => {
        setError(errorText(err));
        if (err instanceof ApiError) setProblems(err.problems);
      },
    );
  }, [body]);

  // Sends the run with these moves and, for an answer, its text. A free retry keeps the time left the browser was
  // counting, so the countdown goes on through it, as in play.
  async function send(next: Moves, text: string | null = null): Promise<AnswerResponse | null> {
    setBusy(true);
    setError(null);
    try {
      const response = await api<AnswerResponse>("/api/admin/test", { method: "POST", body: body(next, text) });
      setRun((before) => (response.notInList && before ? { ...response.run, msLeft: before.msLeft } : response.run));
      setMoves(text !== null && !response.notInList ? { texts: [...next.texts, text], open: false, timedOut: false } : next);
      return response;
    } catch (err) {
      setError(errorText(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  const runner: Runner = {
    run,
    noPuzzle: null,
    error,
    busy,
    over: run !== null && FINISHED.includes(run.status),
    start: () => void send({ ...moves, open: true }),
    next: () => void send({ ...moves, open: true }),
    answer: async (text) => (await send(moves, text))?.notInList ?? false,
    timeUp: () => void send({ ...moves, timedOut: true }),
  };
  if (problems.length)
    return (
      <div role="alert">
        <p>{error}</p>
        <ul>
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    );
  return <Run runner={runner} onPlaying={onPlaying} share={false} />;
}

// The game screen's run, whichever runner it comes from. share: the result's Share button, which a test run hasn't
// (14b-11, answer 6).
function Run({ runner, onPlaying, share }: { runner: Runner; onPlaying: (playing: boolean) => void; share: boolean }) {
  const { run, noPuzzle, error, busy, over } = runner;
  const playing = run?.status === "in_progress";
  useEffect(() => onPlaying(playing), [onPlaying, playing]);

  if (noPuzzle) return <NoPuzzleBanner msToReset={noPuzzle.msToReset} />;
  if (!run) return error ? <p role="alert">{error}</p> : <BannerSkeleton />;
  return (
    <div className={styles.game}>
      {!playing && <Banner date={run.date}>{over && <Score run={run} />}</Banner>}
      {run.status === "not_started" && (
        <>
          {/* The 20 seconds are judged in SQL (private.question_deadline; DECISIONS.md, Config and tunables), so they
              have no constant here; the points come from tunables.ts. */}
          <p className={styles.rules}>
            <strong>{run.total} stops · 20 seconds each.</strong> Give an answer the Wind didn&apos;t think of. Each
            stop you climb is worth more: {POINTS_PER_QUESTION[0]} points up to{" "}
            {POINTS_PER_QUESTION[POINTS_PER_QUESTION.length - 1]}.
          </p>
          <button type="button" className={`${kit.primary} ${styles.start}`} disabled={busy} onClick={runner.start}>
            Start
          </button>
          <ButtonLink href={`${GAME.path}/how-to-play`} transitionTypes={FORWARD}>
            How to play
          </ButtonLink>
        </>
      )}
      {run.status === "in_progress" && run.next && <Reveal run={run} busy={busy} onNext={runner.next} />}
      {run.status === "in_progress" && run.question && (
        <Question
          key={run.question.index}
          question={run.question}
          total={run.total}
          points={run.points}
          busy={busy}
          // Keyed by each state the server sends, so a retry restarts the count from the server's own time left.
          clock={<Countdown key={`${run.question.index}:${run.msLeft}`} msLeft={run.msLeft!} onTimeUp={runner.timeUp} />}
          onAnswer={runner.answer}
        />
      )}
      {over && <Result run={run} share={share} />}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

function NoPuzzleBanner({ msToReset }: { msToReset: number }) {
  return (
    <Banner>
      <Facts facts={["There's no puzzle today."]} />
      <ResetCountdown label="A new day starts in" msToReset={msToReset} />
    </Banner>
  );
}

// A finished run in the banner: the score, how it ended, the result's details and the time to the next puzzle. The
// details are on the game screen, under #result.
function Score({ run }: { run: RunState }) {
  return (
    <>
      <Facts facts={[earnsBonus(run) ? `${pointsText(run.points)} + about ${run.bonus} bonus` : pointsText(run.points), endedText(run)]} />
      <ButtonLink href={`${GAME.path}#result`} transitionTypes={FORWARD} className={`${kit.primary} ${styles.play}`}>
        Result
      </ButtonLink>
      <ResetCountdown label="Next puzzle in" msToReset={run.msToReset} />
    </>
  );
}

// "Saturday 24 October", as round 5's game screen dates the day. A calendar date, read in UTC so it can't shift by a
// day.
function longDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

// What the day holds, as the banner's chips (mockup 3, M14 14b-8b).
function Facts({ facts }: { facts: string[] }) {
  return (
    <p className={`${kit.chips} ${styles.facts}`}>
      {facts.map((f) => (
        <span key={f} className={`${kit.chip} ${styles.chip}`}>
          {f}
        </span>
      ))}
    </p>
  );
}

// Offbeat's banner: the day as a chip, the game's name, then what the day holds for the player (mockup 3).
// The banner before today's run loads: the real banner, its title, a line where the day goes.
function BannerSkeleton() {
  return (
    <Skeleton label="Loading today's puzzle">
      <Banner>
        <Line />
      </Banner>
    </Skeleton>
  );
}

function Banner({ date, children }: { date?: string; children?: ReactNode }) {
  return (
    <div className={styles.banner}>
      {date && <p className={`${kit.chip} ${styles.chip}`}>{longDate(date)}</p>}
      <h2 className={styles.title}>{GAME.name}</h2>
      {children}
    </div>
  );
}

// How a finished run ended, as the banner and the result say it, in Updraft's words by the stop's tier
// (docs/milestones/M14-14c-1-name-and-words.md, "The words").
function endedText(run: RunState): string {
  if (run.status === "survived") return "reached the top";
  if (run.status === "timed_out") return timedOutText(run.answered.length + 1);
  return caughtText(run.answered.length);
}

// Seconds left on the current question, as a number beside the prompt (14b-6c, answer 20), at mockup 3's size with
// "seconds left" under it (14b-8, answer 11), named so it's read with its meaning. At zero it asks the server again, which decides whether time is up (rule 3); the count itself is
// only a display.
function Countdown({ msLeft, onTimeUp }: { msLeft: number; onTimeUp: () => void }) {
  const seconds = Math.ceil(useCountdown(msLeft, onTimeUp) / 1000);
  return (
    <div className={styles.clockBox}>
      <p role="timer" aria-label="Seconds left" className={styles.clock}>
        {seconds}
      </p>
      {/* The timer's own name says this to screen readers. */}
      <span aria-hidden="true">seconds left</span>
    </div>
  );
}

// Nothing to do at zero: Game's own timer moves the page to the new day.
const NOTHING = () => {};

// Time to the next reset at midnight Pacific, from the server's next reset (ROADMAP item from the M00 review). label
// says what comes then: the next puzzle after a run, only a new day when today has none, since tomorrow may not either.
function ResetCountdown({ label, msToReset }: { label: string; msToReset: number }) {
  const total = Math.ceil(useCountdown(msToReset, NOTHING) / 1000);
  const two = (n: number) => String(n).padStart(2, "0");
  return (
    <p role="timer" className={`${kit.chip} ${styles.chip}`}>
      {label} {Math.floor(total / 3600)}:{two(Math.floor(total / 60) % 60)}:{two(total % 60)}
    </p>
  );
}

const pointsText = (n: number) => (n === 1 ? "1 point" : `${n} points`);

// After a stop climbed (G5): its tier's line, your answer next to the Wind's, the points it earned with its estimated rarity bonus (M09:
// from the expected popularity alone; the final bonus is worked out once the day is over), and the letter the Wind
// steals at the next question. The next question and its 20 seconds start on Next.
function Reveal({ run, busy, onNext }: { run: RunState; busy: boolean; onNext: () => void }) {
  const last = run.answered[run.answered.length - 1];
  return (
    <div className={kit.card}>
      <h2>{gotPastText(last.index + 1)}</h2>
      <p>
        You said {last.answer.name}; the Wind whispered {last.hostAnswers.map((h) => h.name).join(", ")}.
      </p>
      <p>
        +{pointsText(last.points)}, rarity bonus +{last.bonus} (estimate) · {pointsText(run.points)} so far
      </p>
      {run.next!.steals && <p>Next, the Wind steals {run.next!.steals.toUpperCase()}.</p>}
      <button type="button" className={kit.primary} autoFocus disabled={busy} onClick={onNext}>
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
  clock,
  onAnswer,
}: {
  question: PublicQuestion;
  total: number;
  points: number;
  busy: boolean;
  // The seconds left, beside the prompt.
  clock: ReactNode;
  // Resolves true when the text named no entry (the player tries again).
  onAnswer: (text: string) => Promise<boolean>;
}) {
  const [typed, setTyped] = useState("");
  const [notInList, setNotInList] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  // A stolen letter's key does nothing (G11, human, 2026-10-21). Filtering the value, not the key press, also
  // covers paste and phone keyboards; each character is normalized as the server normalizes text, so an accented or
  // folded letter counts as the plain letters it becomes ("é" as e, "ß" as ss: 13f-1).
  function change(value: string) {
    const kept = [...value].filter((ch) => !question.stolen.some((letter) => normalize(ch).includes(letter)));
    setBlocked(kept.length < [...value].length ? [...value].find((ch) => !kept.includes(ch))!.toUpperCase() : null);
    setTyped(kept.join(""));
    setNotInList(null);
  }

  // Enter sends the text; the server decides what it names. busy blocks a second Enter while one is in flight. Text
  // that names no entry stays in the box, selected, so a typo is fixed or typed over rather than retyped (human,
  // 2026-10-26: "Keep the text (Recommended)"; docs/milestones/M14-14b-2c-review-items.md, answer 6).
  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = typed.trim();
    if (text === "" || busy) return;
    if (await onAnswer(text)) {
      setNotInList(text);
      input.current?.select();
    }
  }

  return (
    // Mockup 3's question card: the stop and the points as chips, the prompt with the seconds beside it, the stolen
    // letters as struck tiles, the answer box and Answer (M14 14b-8b; answer 11).
    <div className={`${kit.card} ${kit.soft}`}>
      <p className={kit.head}>
        <span className={`${kit.chip} ${kit.dark}`}>
          Stop {question.index + 1} of {total}
        </span>
        <span className={kit.chip}>{pointsText(points)} so far</span>
      </p>
      <div className={styles.ask}>
        <h2 className={styles.prompt}>{question.prompt}</h2>
        {clock}
      </div>
      {question.stolen.length > 0 && (
        <div>
          <p className={styles.taken}>The Wind has taken</p>
          <p className={styles.letters}>
            {question.stolen.map((l) => (
              <span key={l}>{l.toUpperCase()}</span>
            ))}
          </p>
        </div>
      )}
      <form onSubmit={submit}>
        <label>
          Your answer
          <input
            ref={input}
            value={typed}
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => change(e.target.value)}
          />
        </label>
        <button type="submit" className={kit.primary} disabled={busy || typed.trim() === ""}>
          Answer
        </button>
        {blocked && (
          <p role="status" className={styles.note}>
            The Wind took {blocked}. Try a word without it.
          </p>
        )}
        {notInList && (
          <p role="status" className={styles.note}>
            &quot;{notInList}&quot; isn&apos;t in our list. Try another answer.
          </p>
        )}
      </form>
    </div>
  );
}

// The result's details, below the banner, which carries the score and the time to the next puzzle. A link to
// #result (the banner's Result, the clock bar's) lands before the run has loaded, when there's nothing to jump to yet,
// so the result brings itself into view once it's drawn (docs/milestones/M14-14b-2c-review-items.md, item 14).
function Result({ run, share }: { run: RunState; share: boolean }) {
  const survived = survivedCount(run);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.location.hash === "#result") box.current?.scrollIntoView();
  }, []);
  return (
    <div id="result" ref={box} className={kit.card}>
      <h2>{run.status === "survived" ? "You reached the top!" : capitalized(endedText(run))}</h2>
      <p>
        You climbed {survived} of {run.total} stops and scored {pointsText(run.points)}
        {earnsBonus(run) ? `, plus a rarity bonus of about ${run.bonus}.` : "."} {bonusNote(run)}
      </p>
      {share && <Share run={run} />}
      <ol className={kit.rows}>
        {run.answered.map((a) => (
          <li key={a.index} className={kit.row}>
            {a.prompt}: you said {a.answer.name}, the Wind whispered {a.hostAnswers.map((h) => h.name).join(", ")}
            {a.matched ? ` (${caughtText(a.index + 1)})` : ` (climbed, +${pointsText(a.points)}, bonus +${a.bonus})`} · {givenText(a.share)}
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
      <button type="button" className={kit.primary} onClick={share}>
        Share
      </button>{" "}
      {note && <span role="status">{note}</span>}
    </p>
  );
}
