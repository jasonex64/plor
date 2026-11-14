"use client";

// The game's run (docs/milestones/M14-14a-2b-game-screen.md): on its game screen, GAME.path, the rules and Start, then
// one question at a time, answered by typing (no list, no suggestions: the server reads the text; human, 2026-10-21),
// a free retry for text that names no entry, 20 seconds per question, a reveal after each answer that waits for Next,
// points as you go, and a result with how many players gave each answer (docs/milestones/M11-home-screen.md, 11a). On
// Today, Offbeat's banner links in: Play before, the score and the time to the next puzzle after
// (docs/milestones/M14-14a-2a-today.md); with Skip the game screen on, Play starts the run itself
// (docs/milestones/M14-14a-3b-settings.md, L39).
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { RunState } from "@/game/runs";
import type { PublicQuestion } from "@/game/payload";
import type { Tier } from "@/content/puzzle";
import { FINISHED } from "@/game/status";
import { shareText, survivedCount } from "@/game/share";
import { POINTS_PER_QUESTION } from "@/config/tunables";
import { api, ApiError } from "@/lib/api-client";
import { normalize } from "@/content/puzzle";
import { bonusNote, earnsBonus, PAST_MIDNIGHT, pastMidnight } from "./bonus";
import { ButtonLink } from "./button-link";
import { useCountdown } from "./countdown";
import { Countdown } from "./countdown-bar";
import { BACK, FORWARD } from "./slide";
import { givenText } from "./given";
import { AnswerSearch } from "./answer-search";
import { errorText } from "./messages";
import styles from "./game.module.css";
import kit from "./kit.module.css";
import { CopyField, shareLink } from "./share";
import { GAME, SUBSTRINGS } from "@/platform/game";
import { GAME_1_STEPS, HowToPlay } from "./how-to-play";
import { PlayFrame, StatusMessage } from "./play-frame";
import { Recap } from "./recap";
import { Line, Skeleton } from "./skeleton";
import { expectingPlay, markToPlay, spendToPlay } from "./to-play";
import { runRoutes, startBody, type RunFamily } from "./run-routes";
import { GuestPeek } from "./guest-peek";
import { resultExtras, type RunKind } from "./result-extras";

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
function useRun({ onOver, onDayOver }: DayHooks, family: RunFamily = "account") {
  const [run, setRun] = useState<RunState | null>(null);
  const [noPuzzle, setNoPuzzle] = useState<NoPuzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const over = run !== null && FINISHED.includes(run.status);
  const loaded = run !== null;
  useEffect(() => {
    if (loaded) onOver(over);
  }, [onOver, loaded, over]);

  // Stable, so the run loads once each time the page shows, not on every render.
  const load = useCallback(() => {
    api<RunResponse>(runRoutes(family).state, { method: "GET" }).then(
      (r) => (r.run ? setRun(r.run) : setNoPuzzle({ msToReset: r.msToReset })),
      (err) => setError(errorText(err)),
    );
  }, [family]);
  useEffect(load, [load]);
  // Each state carries the time to the reset as the server measured it, so the timer starts again from each one, with
  // whether that state is in play.
  useEffect(() => {
    const msToReset = run?.msToReset ?? noPuzzle?.msToReset;
    if (msToReset === undefined) return;
    const timer = setTimeout(() => onDayOver(run?.status === "in_progress"), msToReset);
    return () => clearTimeout(timer);
  }, [run, noPuzzle, onDayOver]);
  return { run, setRun, noPuzzle, error, setError, over };
}

// Starts today's run and opens the game screen with question 1 in play, sliding forward from Today (14b-6e): Play on
// Today with Skip the game screen on.
function useStartRun() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/run/start", { method: "POST" });
      markToPlay();
      router.push(GAME.path, { transitionTypes: FORWARD });
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
  const starting = useStartRun();
  if (noPuzzle) return <NoPuzzleBanner msToReset={noPuzzle.msToReset} />;
  if (!run) return error ? <p role="alert">{error}</p> : <BannerSkeleton />;
  return (
    <>
      <Banner date={run.date}>
        {run.status === "not_started" && !skip && (
          <>
            <Facts facts={[`${run.total} questions`, "Don't match the host"]} />
            <ButtonLink href={GAME.path} transitionTypes={FORWARD} className={`${kit.primary} ${styles.play}`}>
              Play
            </ButtonLink>
            <HowToPlay steps={GAME_1_STEPS} className={kit.small} />
          </>
        )}
        {/* Skipping the game screen skips its rules line too, so the time limit is said here before it runs (WCAG 2.2
            2.2.1; human, 2026-10-25: "Add the 20 seconds (Recommended)"). The 20 seconds are judged in SQL
            (private.question_deadline), so they have no constant here. */}
        {run.status === "not_started" && skip && (
          <>
            <Facts facts={[`${run.total} questions`, "20 seconds each", "Don't match the host"]} />
            <button type="button" className={`${kit.primary} ${styles.play}`} disabled={starting.busy} onClick={() => void starting.start()}>
              Play
            </button>
            {/* Under Play, smaller, before the run, with or without Skip the game screen (14c-6 answers 30 and 40). */}
            <HowToPlay steps={GAME_1_STEPS} className={kit.small} />
            {starting.error && <p role="alert">{starting.error}</p>}
          </>
        )}
        {run.status === "in_progress" && (
          <>
            <Facts facts={["Your run is still going"]} />
            <ButtonLink href={GAME.path} transitionTypes={FORWARD} className={`${kit.primary} ${styles.play}`} onClick={markToPlay}>
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
// nothing (TestGame; docs/milestones/M14-14b-11-test-runs.md). answer and next: the server's reply, or null when it
// failed (error says why). timeUp: the run as the server has it once a question's time has run out here.
type Runner = {
  run: RunState | null;
  noPuzzle: NoPuzzle | null;
  error: string | null;
  busy: boolean;
  over: boolean;
  start: () => void;
  next: () => Promise<AnswerResponse | null>;
  answer: (text: string) => Promise<AnswerResponse | null>;
  timeUp: () => Promise<RunState | null>;
};

// The run on the game screen. Before it starts, the stakes sit above Start (the critique's P1; the 20 seconds are
// stated before the timer runs, WCAG 2.2 2.2.1), with How to play. onStarted: Start began today's run, which counts in
// the streak at once (src/game/streak.ts), so the shell's rank can follow (docs/milestones/M14-14b-2a-streak-ranks.md).
// family: which routes it plays (src/app/run-routes.ts); a guest has no streak, so no onStarted, and their result has
// Share and the peek and no answer searches (src/app/result-extras.ts). botCheck:
// runs the bot check when a guest presses Start and gives the token the start sends.
// onPlaying: whether the play frame is up, when the screen shows only the game (docs/milestones/
// M14-14b-6-feel-and-polish.md, 14b-6c; answers 22 and 23; docs/milestones/M14-14c-8-plain-game-1.md), said once the day is known (docs/milestones/M14-14b-19-controls-layout-and-state.md, answer 3).
export function Game({
  family,
  botCheck,
  onStarted,
  onPlaying,
  ...hooks
}: DayHooks & { family: RunFamily; botCheck?: () => Promise<string>; onStarted?: () => void; onPlaying: (playing: boolean) => void }) {
  const router = useRouter();
  const { run, setRun, noPuzzle, error, setError, over } = useRun(hooks, family);
  const routes = runRoutes(family);
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

  async function startRun() {
    let body;
    if (family === "guest") {
      setBusy(true);
      setError(null);
      try {
        body = startBody(family, await botCheck!());
      } catch (err) {
        setError(errorText(err));
        setBusy(false);
        return;
      }
    }
    if (await send(routes.start, body)) onStarted?.();
  }

  // At zero the server is asked again, and decides whether time is up (rule 3). The run in play can't vanish, so no run
  // at all is an error, shown as any other.
  async function timeUp(): Promise<RunState | null> {
    try {
      const response = await api<RunResponse>(routes.state, { method: "GET" });
      if (!response.run) throw new Error("the run in play is gone");
      setRun(response.run);
      return response.run;
    } catch (err) {
      setError(errorText(err));
      return null;
    }
  }

  const runner: Runner = {
    run,
    noPuzzle,
    error,
    busy,
    over,
    start: () => void startRun(),
    next: () => send(routes.next),
    answer: (text) => send(routes.answer, { index: run!.question!.index, text }),
    timeUp,
  };
  return <Run runner={runner} onPlaying={onPlaying} kind={family} out="Back to Today" onLeave={() => router.push("/", { transitionTypes: BACK })} />;
}

// A test run (docs/milestones/M14-14b-11-test-runs.md): an admin plays a day as often as they like and nothing is saved
// (human, 2026-10-29, answer 2). The browser holds the run, the texts that named answers and whether the next question
// is open, and sends all of it each time to POST /api/admin/test, which answers with play's state, so this is the same
// screen (answer 3), in the play frame too (14c-6, answer 11). hostAnswers: a
// draft's, as its page shows them (answer 9); null for an approved day. label: the test run's label and Restart
// (answer 12), which the frame keeps above the question, so they stay in view the whole run. Its 20 seconds count down
// here alone: nothing is stored for the database to judge.
type Moves = { texts: string[]; open: boolean; timedOut: boolean };
const FRESH: Moves = { texts: [], open: false, timedOut: false };

export function TestGame({
  date,
  hostAnswers,
  onPlaying,
  label,
  onRestart,
}: {
  date: string;
  hostAnswers: string[][] | null;
  onPlaying: (playing: boolean) => void;
  label: ReactNode;
  onRestart: () => void;
}) {
  const router = useRouter();
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
    next: () => send({ ...moves, open: true }),
    answer: (text) => send(moves, text),
    timeUp: async () => (await send({ ...moves, timedOut: true }))?.run ?? null,
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
  // A test run's × and See results go back to the admin puzzles page it started from (14c-6 answer 26), and restart it:
  // Next.js keeps this page hidden, so its next Play test would otherwise pick up this run's moves.
  const back = () => {
    onRestart();
    router.push("/admin/puzzles", { transitionTypes: BACK });
  };
  return <Run runner={runner} onPlaying={onPlaying} kind="test" label={label} out="Back to Puzzles" onLeave={back} onResults={back} />;
}

// The game screen's run, whichever runner it comes from. kind: whose run it is, which says what sits with its result
// (src/app/result-extras.ts): a test run saves nothing, so it has no Share or answer searches (14b-11, answer 6; 14b-12,
// Out of scope), and a guest's has the peek under it (docs/milestones/M18-guest-play.md, answer 2). From Start to See
// results the run is in the play frame, the shell's bars hidden (docs/milestones/M14-14c-8-plain-game-1.md): a run
// already over when the screen opens shows the cards at once (14c-6, answer 25), and one that ends here shows its recap
// until See results. onLeave: where the × goes, and out what it says to screen readers (14c-6, answers 22, 26); onResults:
// where See results goes, if not to the cards here (a test run's). label: a line the frame keeps above the question, a
// test run's.
function Run({
  runner,
  onPlaying,
  kind,
  out,
  onLeave,
  onResults,
  label,
}: {
  runner: Runner;
  onPlaying: (playing: boolean) => void;
  kind: RunKind;
  out: string;
  onLeave: () => void;
  onResults?: () => void;
  label?: ReactNode;
}) {
  const { run, noPuzzle, error, busy, over } = runner;
  const extras = resultExtras(kind);
  const playing = run?.status === "in_progress";
  // A page Next.js kept hidden shows again with the run as it last had it, while the run loads again (useRun's load is an
  // effect, which runs each time the page shows). A run that was in play then may have ended elsewhere meanwhile, its
  // time up away from the page, so the screen waits for the new state rather than start from the old one (14c-6, answer 25).
  const [hiddenWith, setHiddenWith] = useState<RunState | null>(null);
  useEffect(() => () => setHiddenWith(run), [run]);
  const stale = playing && run === hiddenWith;
  // Played here, and its recap not yet left: the frame stays up after the run is over, until See results or the ×.
  // Hiding the page forgets it, so a run that ends while the page is away opens on the cards.
  const [seen, setSeen] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(
    () => () => {
      setSeen(false);
      setDone(false);
    },
    [],
  );
  if (playing && !stale && !seen) setSeen(true);
  const inGame = playing || (seen && !done);
  const known = run !== null || noPuzzle !== null || error !== null;
  useEffect(() => {
    if (known) onPlaying(inGame);
  }, [onPlaying, inGame, known]);
  // Read once, at mount (an initializer, so the development server's second render reads it too), and spent after
  // (src/app/to-play.ts).
  const [expectPlay] = useState(expectingPlay);
  useEffect(spendToPlay, []);
  // The × after the recap counts as leaving it, so the page comes back as the cards when it shows again.
  const leave = () => {
    if (!playing) setDone(true);
    onLeave();
  };

  if (noPuzzle) return <NoPuzzleBanner msToReset={noPuzzle.msToReset} />;
  // The frame is up while the state loads on the way into a run, so the page doesn't show its cards for a moment first.
  if (!run)
    return error ? (
      <p role="alert">{error}</p>
    ) : expectPlay ? (
      <PlayFrame steps={GAME_1_STEPS} out={out} onLeave={onLeave}>
        <QuestionSkeleton />
      </PlayFrame>
    ) : (
      <BannerSkeleton />
    );
  // Its new load failing is said, not hidden behind the loading layer.
  if (stale)
    return error ? (
      <p role="alert">{error}</p>
    ) : (
      <PlayFrame steps={GAME_1_STEPS} out={out} onLeave={onLeave}>
        <QuestionSkeleton />
      </PlayFrame>
    );
  if (inGame)
    return (
      <PlayFrame steps={GAME_1_STEPS} out={out} onLeave={leave}>
        {label}
        {pastMidnight(run) && <p>{PAST_MIDNIGHT}</p>}
        {error && <p role="alert">{error}</p>}
        {run.status === "in_progress" && run.next && <Reveal run={run} busy={busy} onNext={runner.next} />}
        {run.status === "in_progress" && run.question && (
          <Question
            key={run.question.index}
            question={run.question}
            total={run.total}
            points={run.points}
            busy={busy}
            // Keyed by each state the server sends, so a retry restarts the count from the server's own time left.
            clock={<Countdown key={`${run.question.index}:${run.msLeft}`} msLeft={run.msLeft!} onTimeUp={() => void runner.timeUp()} />}
            onAnswer={async (text) => (await runner.answer(text))?.notInList ?? false}
          />
        )}
        {over && (
          <Recap
            heading={endedHeading(run)}
            answers={run.answered.map((a) => ({
              key: a.index,
              text: a.matched
                ? `${a.prompt}: you said ${a.answer.name}, the host said ${a.hostAnswers.map((h) => h.name).join(", ")} (caught)`
                : `${a.prompt}: you said ${a.answer.name} (safe, +${pointsText(a.points)})`,
            }))}
            total={`Total: ${earnsBonus(run) ? `${pointsText(run.points)} + about ${run.bonus} bonus` : pointsText(run.points)}`}
            onSeeResults={() => {
              setDone(true);
              onResults?.();
            }}
          />
        )}
      </PlayFrame>
    );
  return (
    <div className={styles.game}>
      <Banner date={run.date}>{over && <Score run={run} />}</Banner>
      {run.status === "not_started" && (
        <>
          {/* The 20 seconds are judged in SQL (private.question_deadline; DECISIONS.md, Config and tunables), so they
              have no constant here; the points come from tunables.ts. */}
          <p className={styles.rules}>
            <strong>{run.total} questions · 20 seconds each.</strong> Give an answer the host didn&apos;t pick. Each
            question you survive is worth more: {POINTS_PER_QUESTION[0]} points up to{" "}
            {POINTS_PER_QUESTION[POINTS_PER_QUESTION.length - 1]}.
          </p>
          <button type="button" className={`${kit.primary} ${styles.start}`} disabled={busy} onClick={runner.start}>
            Start
          </button>
          <HowToPlay steps={GAME_1_STEPS} />
        </>
      )}
      {over && <Result run={run} share={extras.share} search={extras.search} focus={seen && done} />}
      {over && extras.peek && <GuestPeek />}
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
// details are on the game screen, under #result. With the result already drawn and shown (the game screen's own
// banner; a game screen visited before stays in the document, hidden, under Today), Result scrolls to it without
// putting #result in the address, as Result does once it's drawn (docs/milestones/M14-14b-23-small-jumps-and-finds.md,
// answer 2).
function Score({ run }: { run: RunState }) {
  function toDrawn(event: { preventDefault: () => void }) {
    const drawn = document.getElementById("result");
    if (!drawn?.checkVisibility()) return;
    event.preventDefault();
    drawn.scrollIntoView();
  }
  return (
    <>
      <Facts facts={[earnsBonus(run) ? `${pointsText(run.points)} + about ${run.bonus} bonus` : pointsText(run.points), endedText(run)]} />
      <ButtonLink href={`${GAME.path}#result`} onClick={toDrawn} transitionTypes={FORWARD} className={`${kit.primary} ${styles.play}`}>
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
export function Facts({ facts }: { facts: string[] }) {
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

// A question card before the run in play loads: its soft card, a line for its chips and one for its prompt.
function QuestionSkeleton() {
  return (
    <Skeleton label="Loading your question">
      <div className={`${kit.card} ${kit.soft}`}>
        <Line />
        <Line />
      </div>
    </Skeleton>
  );
}

// Offbeat's banner: the day as a chip, the game's name, then what the day holds for the player (mockup 3).
// The banner before today's run loads: the real banner, its title, a line where the day goes.
export function BannerSkeleton() {
  return (
    <Skeleton label="Loading today's puzzle">
      <Banner>
        <Line />
      </Banner>
    </Skeleton>
  );
}

// game: Fragments' card is this banner in its own colour (src/app/today-fragments.tsx; M16 16f-2).
export function Banner({ date, game = GAME, children }: { date?: string; game?: typeof GAME | typeof SUBSTRINGS; children?: ReactNode }) {
  return (
    <div className={game === SUBSTRINGS ? `${styles.banner} ${styles.fragments}` : styles.banner}>
      {date && <p className={`${kit.chip} ${styles.chip}`}>{longDate(date)}</p>}
      <h2 className={styles.title}>{game.name}</h2>
      {children}
    </div>
  );
}

// How a finished run ended, as the recap and the result say it (docs/milestones/M14-14c-2-neutral-words.md).
const endedHeading = (run: RunState): string =>
  run.status === "survived"
    ? `You survived all ${run.total}!`
    : run.status === "timed_out"
      ? `Time's up on question ${run.answered.length + 1}`
      : `Caught on question ${run.answered.length}`;

// How a finished run ended, as the banner says it.
function endedText(run: RunState): string {
  if (run.status === "survived") return `survived all ${run.total}`;
  if (run.status === "timed_out") return `time's up on question ${run.answered.length + 1}`;
  return `caught on question ${run.answered.length}`;
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

export const pointsText = (n: number) => (n === 1 ? "1 point" : `${n} points`);

// The answer's rarity as a plain word (docs/milestones/M14-14c-8-plain-game-1.md, Numbers: "Common", "Uncommon", "Rare",
// approved with the ticket; human, 2026-11-10: "approve").
const RARITY: Record<Tier, string> = { common: "Common", uncommon: "Uncommon", rare: "Rare" };

// After a safe answer (G5): your answer next to the host's, the points it earned with its estimated rarity bonus (M09:
// from the expected popularity alone; the final bonus is worked out once the day is over), the answer's rarity, and the
// letter taken at the next question (docs/milestones/M14-14c-2-neutral-words.md, answer 7). The next question and its 20
// seconds start on Next, which has focus at once (WCAG 2.2 2.4.3). A screen reader hears the result once (4.1.3).
function Reveal({ run, busy, onNext }: { run: RunState; busy: boolean; onNext: () => void }) {
  const last = run.answered[run.answered.length - 1];
  return (
    <div className={kit.card}>
      <h2>Safe!</h2>
      <StatusMessage text={`Safe! ${pointsText(last.points)}`} />
      <p>
        You said {last.answer.name}; the host said {last.hostAnswers.map((h) => h.name).join(", ")}.
      </p>
      <p>Rarity: {RARITY[last.tier]}</p>
      <p>
        +{pointsText(last.points)}, rarity bonus +{last.bonus} (estimate) · {pointsText(run.points)} so far
      </p>
      {run.next!.steals && <p>Next question: {run.next!.steals.toUpperCase()} is taken.</p>}
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
  // The seconds left, under the prompt.
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
    // Mockup 3's question card: the question's number and the points as chips, the prompt with the seconds under it,
    // the stolen letters as struck tiles, the answer box and Answer (M14 14b-8b; answer 11).
    <div className={`${kit.card} ${kit.soft}`}>
      <p className={kit.head}>
        <span className={`${kit.chip} ${kit.dark}`}>
          Question {question.index + 1} of {total}
        </span>
        <span className={kit.chip}>{pointsText(points)} so far</span>
      </p>
      <div className={styles.ask}>
        <h2 className={styles.prompt}>{question.prompt}</h2>
      </div>
      {clock}
      {question.stolen.length > 0 && (
        <div>
          <p className={styles.taken}>Letters taken</p>
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
            {blocked} is taken. Try a word without it.
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
// so the result brings itself into view once it's drawn (docs/milestones/M14-14b-2c-review-items.md, item 14). Then
// #result leaves the address, so the page shown again or reloaded later stays where the player left it
// (docs/milestones/M14-14b-23-small-jumps-and-finds.md, answer 2).
function Result({ run, share, search, focus }: { run: RunState; share: boolean; search: boolean; focus: boolean }) {
  const survived = survivedCount(run);
  const box = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // Coming from the recap, whose See results had focus and is gone with the frame (WCAG 2.2 2.4.3). A run already over
  // when the screen opens leaves focus where it is.
  useEffect(() => {
    if (focus) heading.current!.focus();
  }, [focus]);
  useEffect(() => {
    if (window.location.hash !== "#result") return;
    box.current?.scrollIntoView();
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);
  return (
    <div id="result" ref={box} className={kit.card}>
      <h2 ref={heading} tabIndex={-1}>
        {endedHeading(run)}
      </h2>
      <p>
        You survived {survived} of {run.total} questions and scored {pointsText(run.points)}
        {earnsBonus(run) ? `, plus a rarity bonus of about ${run.bonus}.` : "."} {bonusNote(run)}
      </p>
      {share && <Share run={run} />}
      <ol className={kit.rows}>
        {run.answered.map((a) => (
          <li key={a.index} className={kit.row}>
            <div className={kit.grow}>
              <span>
                {a.prompt}: you said {a.answer.name}, the host said {a.hostAnswers.map((h) => h.name).join(", ")}
                {a.matched ? " (caught)" : ` (safe, +${pointsText(a.points)}, bonus +${a.bonus})`} · {givenText(a.share)}
              </span>{" "}
              {search && <AnswerSearch date={run.date} index={a.index} prompt={a.prompt} />}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Share (M05, S4), by the share sheet or the clipboard (src/app/share.tsx). The link is today's game at the site's root
// (S3), from the page's own origin so it's right on any deployment.
function Share({ run }: { run: RunState }) {
  const [note, setNote] = useState<string | null>(null);
  const [copy, setCopy] = useState<string | null>(null);

  async function share() {
    setCopy(null);
    const text = shareText(run);
    const url = `${window.location.origin}/`;
    try {
      const shared = await shareLink(text, url);
      if (shared === "copied") setNote("Copied");
      if (shared === "refused") setCopy(`${text}\n${url}`);
    } catch (err) {
      setNote(`Couldn't share: ${String(err)}`);
    }
  }

  return (
    <>
      <p>
        <button type="button" className={kit.primary} onClick={share}>
          Share
        </button>{" "}
        {note && <span role="status">{note}</span>}
      </p>
      {copy && <CopyField value={copy} />}
    </>
  );
}
