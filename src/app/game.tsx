"use client";

// The game's run (docs/milestones/M14-14a-2b-game-screen.md): on its game screen, GAME.path, the rules and Start, then
// one question at a time, answered by typing (no list, no suggestions: the server reads the text; human, 2026-10-21),
// a free retry for text that names no entry, 20 seconds per question, a reveal after each answer that waits for Next,
// points as you go, and a result with how many players gave each answer (docs/milestones/M11-home-screen.md, 11a). On
// Today, Offbeat's banner links in: Play before, the score and the time to the next puzzle after
// (docs/milestones/M14-14a-2a-today.md); with Skip the game screen on, Play starts the run itself
// (docs/milestones/M14-14a-3b-settings.md, L39).
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { AnsweredQuestion, RunState } from "@/game/runs";
import { FINISHED } from "@/game/status";
import { shareText, survivedCount } from "@/game/share";
import { POINTS_PER_QUESTION } from "@/config/tunables";
import { api, ApiError } from "@/lib/api-client";
import { bonusNote, earnsBonus, PAST_MIDNIGHT, pastMidnight } from "./bonus";
import { ButtonLink } from "./button-link";
import { useCountdown } from "./countdown";
import { BACK, FORWARD } from "./slide";
import { givenText } from "./given";
import { AnswerSearch } from "./answer-search";
import { errorText } from "./messages";
import styles from "./game.module.css";
import kit from "./kit.module.css";
import { CopyField, shareLink } from "./share";
import { GAME } from "@/platform/game";
import { Afterglow, AfterglowLoading } from "@/afterglow/afterglow";
import type { Asked, Reply, Result as Shown, Start } from "@/afterglow/scene";
import { Line, Skeleton } from "./skeleton";
import { expectingPlay, markToPlay, spendToPlay } from "./to-play";

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

// Starts today's run and opens the game screen with question 1 in play: Start playing on How to play, and Play on
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
      markToPlay();
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
            <Facts facts={[`${run.total} questions`, "Don't match the host"]} />
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
            <Facts facts={[`${run.total} questions`, "20 seconds each", "Don't match the host"]} />
            <button type="button" className={`${kit.primary} ${styles.play}`} disabled={starting.busy} onClick={() => void starting.start()}>
              Play
            </button>
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
// onPlaying: whether Afterglow is up, when the screen shows only the game (docs/milestones/
// M14-14b-6-feel-and-polish.md, 14b-6c; answers 22 and 23), said once the day is known (docs/milestones/M14-14b-19-controls-layout-and-state.md, answer 3).
export function Game({ onStarted, onPlaying, ...hooks }: DayHooks & { onStarted: () => void; onPlaying: (playing: boolean) => void }) {
  const router = useRouter();
  const { run, setRun, noPuzzle, error, setError, over } = useRun(hooks);
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

  // At zero the server is asked again, and decides whether time is up (rule 3).
  async function timeUp(): Promise<RunState | null> {
    try {
      const response = await api<RunResponse>("/api/run", { method: "GET" });
      if (response.run) setRun(response.run);
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
    start: () => void send("/api/run/start").then((r) => r && onStarted()),
    next: () => send("/api/run/next"),
    answer: (text) => send("/api/run/answer", { index: run!.question!.index, text }),
    timeUp,
  };
  return <Run runner={runner} onPlaying={onPlaying} saved out="Back to Today" onLeave={() => router.push("/", { transitionTypes: BACK })} />;
}

// A test run (docs/milestones/M14-14b-11-test-runs.md): an admin plays a day as often as they like and nothing is saved
// (human, 2026-10-29, answer 2). The browser holds the run, the texts that named answers and whether the next question
// is open, and sends all of it each time to POST /api/admin/test, which answers with play's state, so this is the same
// screen (answer 3), Afterglow's too (docs/milestones/M14-14c-6-afterglow-in-play.md, answer 11). hostAnswers: a
// draft's, as its page shows them (answer 9); null for an approved day. label: the test run's label and Restart
// (answer 12), which Afterglow keeps over the scene, so they stay in view the whole run. Its 20 seconds count down
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
  return <Run runner={runner} onPlaying={onPlaying} saved={false} label={label} out="Back to Puzzles" onLeave={back} onResults={back} />;
}

// The game screen's run, whichever runner it comes from. saved: a played run, whose result has Share and the answer
// searches; a test run saves nothing, so it has neither (14b-11, answer 6; 14b-12, Out of scope). From Start to See
// results the run is Afterglow, full screen (docs/milestones/M14-14c-6-afterglow-in-play.md): a run already over when
// the screen opens shows the cards at once (answer 25), and one that ends here shows its ending list until See results.
// onLeave: where the × goes (answers 22, 26), and out what it says to screen readers; onResults: where See results goes,
// if not to the cards here (a test run's, answer 26). label: a line Afterglow keeps over the scene, a test run's.
function Run({
  runner,
  onPlaying,
  saved,
  out,
  onLeave,
  onResults,
  label,
}: {
  runner: Runner;
  onPlaying: (playing: boolean) => void;
  saved: boolean;
  out: string;
  onLeave: () => void;
  onResults?: () => void;
  label?: ReactNode;
}) {
  const { run, noPuzzle, error, busy, over } = runner;
  const playing = run?.status === "in_progress";
  // A page Next.js kept hidden shows again with the run as it last had it, while the run loads again (useRun's load is an
  // effect, which runs each time the page shows). A run that was in play then may have ended elsewhere meanwhile, its
  // time up away from the page, so the scene waits for the new state rather than start from the old one (answer 25).
  const [hiddenWith, setHiddenWith] = useState<RunState | null>(null);
  useEffect(() => () => setHiddenWith(run), [run]);
  const stale = playing && run === hiddenWith;
  // Played here, and its ending list not yet left: the scene stays up after the run is over, until See results or the ×.
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

  if (noPuzzle) return <NoPuzzleBanner msToReset={noPuzzle.msToReset} />;
  if (!run) return error ? <p role="alert">{error}</p> : expectPlay ? <AfterglowLoading /> : <BannerSkeleton />;
  if (stale) return <AfterglowLoading />;
  if (inGame)
    return (
      <Afterglow
        out={out}
        start={() => startOf(run)}
        io={{
          answer: (text) => runner.answer(text).then(replyOf),
          next: () => runner.next().then((r) => r && askedOf(r.run)),
          timeUp: () => runner.timeUp().then((r) => r && (r.status === "in_progress" && r.question ? askedOf(r) : "over")),
          seeResults: () => {
            setDone(true);
            onResults?.();
          },
          leave: () => {
            if (!playing) setDone(true);
            onLeave();
          },
        }}
        notices={
          <>
            {label}
            {pastMidnight(run) && <p>{PAST_MIDNIGHT}</p>}
            {error && <p role="alert">{error}</p>}
          </>
        }
      />
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
          <ButtonLink href={`${GAME.path}/how-to-play`} transitionTypes={FORWARD}>
            How to play
          </ButtonLink>
        </>
      )}
      {over && <Result run={run} saved={saved} />}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

// An answered question as Afterglow's scene takes it: its tier picks the firework, and points plus the provisional
// bonus size the burst only (src/afterglow/scene.ts, Result).
const resultOf = (a: AnsweredQuestion): Shown => ({ answer: a.answer.name, caught: a.matched, tier: a.tier, points: a.points, total: a.points + a.bonus });
const askedOf = (run: RunState): Asked | null => run.question && { prompt: run.question.prompt, stolen: run.question.stolen, msLeft: run.msLeft! };

// Where the scene picks the run up: a question in play, or a safe answer waiting for Next, on its sky result.
function startOf(run: RunState): Start {
  const results = run.answered.map(resultOf);
  const asked = askedOf(run);
  if (asked) return { total: run.total, msQuestion: run.msQuestion, results, at: { kind: "ask", asked } };
  const last = run.answered[run.answered.length - 1];
  return { total: run.total, msQuestion: run.msQuestion, results, at: { kind: "result", hostSaid: last.hostAnswers.map((h) => h.name), next: run.next! } };
}

// The server's reply to an answer, as the scene takes it: text that named nothing; a late answer the database refused,
// which ended the run with nothing added; or the answer it named, and what comes next.
function replyOf(response: AnswerResponse | null): Reply {
  if (!response) return { kind: "failed" };
  const { run, notInList } = response;
  if (notInList) return { kind: "offList" };
  if (run.status === "timed_out") return { kind: "timeUp" };
  const last = run.answered[run.answered.length - 1];
  return { kind: "listed", result: resultOf(last), hostSaid: last.hostAnswers.map((h) => h.name), next: run.next, over: run.status !== "in_progress" };
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

const pointsText = (n: number) => (n === 1 ? "1 point" : `${n} points`);

// The result's details, below the banner, which carries the score and the time to the next puzzle. A link to
// #result (the banner's Result, the clock bar's) lands before the run has loaded, when there's nothing to jump to yet,
// so the result brings itself into view once it's drawn (docs/milestones/M14-14b-2c-review-items.md, item 14). Then
// #result leaves the address, so the page shown again or reloaded later stays where the player left it
// (docs/milestones/M14-14b-23-small-jumps-and-finds.md, answer 2).
function Result({ run, saved }: { run: RunState; saved: boolean }) {
  const survived = survivedCount(run);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.location.hash !== "#result") return;
    box.current?.scrollIntoView();
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);
  return (
    <div id="result" ref={box} className={kit.card}>
      <h2>
        {run.status === "survived"
          ? `You survived all ${run.total}!`
          : run.status === "timed_out"
            ? `Time's up on question ${run.answered.length + 1}`
            : `Caught on question ${run.answered.length}`}
      </h2>
      <p>
        You survived {survived} of {run.total} questions and scored {pointsText(run.points)}
        {earnsBonus(run) ? `, plus a rarity bonus of about ${run.bonus}.` : "."} {bonusNote(run)}
      </p>
      {saved && <Share run={run} />}
      <ol className={kit.rows}>
        {run.answered.map((a) => (
          <li key={a.index} className={kit.row}>
            <div className={kit.grow}>
              <span>
                {a.prompt}: you said {a.answer.name}, the host said {a.hostAnswers.map((h) => h.name).join(", ")}
                {a.matched ? " (caught)" : ` (safe, +${pointsText(a.points)}, bonus +${a.bonus})`} · {givenText(a.share)}
              </span>{" "}
              {saved && <AnswerSearch date={run.date} index={a.index} prompt={a.prompt} />}
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
