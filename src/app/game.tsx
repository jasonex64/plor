"use client";

// The game's run, as a day on a clock plays it (docs/milestones/M14-14a-2b-game-screen.md; M23): on its game screen, GAME.path,
// the day's state is loaded here and the clock game's screens take it from there (src/app/clock-game.tsx). On Today, Offbeat's
// banner links in: Play before, the score and the time to the next puzzle after (docs/milestones/M14-14a-2a-today.md).
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { ClockState } from "@/game/clock-state";
import { api } from "@/lib/api-client";
import { useCountdown } from "./countdown";
import { BACK } from "./slide";
import { errorText, PAUSED_NOTE } from "./messages";
import styles from "./game.module.css";
import kit from "./kit.module.css";
import { gameColour } from "./game-colour";
import { Emblem } from "./emblem";
import { GAME, SUBSTRINGS } from "@/platform/game";
import { CLOCK_STEPS } from "./how-to-play";
import { PlayFrame } from "./play-frame";
import { Line, Skeleton } from "./skeleton";
import { expectingPlay, spendToPlay } from "./to-play";
import { runRoutes, type RunFamily } from "./run-routes";
import { ClockGame, ClockTodayBanner } from "./clock-game";

// run is null on a day with no puzzle, with the time to the reset (M12 12f, F2).
type RunResponse = { run: ClockState } | { run: null; msToReset: number };
type NoPuzzle = { msToReset: number };

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
  const [clock, setClock] = useState<ClockState | null>(null);
  const [noPuzzle, setNoPuzzle] = useState<NoPuzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const over = clock?.status === "over";
  const loaded = clock !== null;
  useEffect(() => {
    if (loaded) onOver(over);
  }, [onOver, loaded, over]);

  // Stable, so the run loads once each time the page shows, not on every render.
  const load = useCallback(() => {
    api<RunResponse>(runRoutes(family).state, { method: "GET" }).then(
      (r) => (r.run ? setClock(r.run) : setNoPuzzle({ msToReset: r.msToReset })),
      (err) => setError(errorText(err)),
    );
  }, [family]);
  useEffect(load, [load]);
  // Each state carries the time to the reset as the server measured it, so the timer starts again from each one, with
  // whether that state is in play.
  useEffect(() => {
    const msToReset = clock?.msToReset ?? noPuzzle?.msToReset;
    if (msToReset === undefined) return;
    const timer = setTimeout(() => onDayOver(clock?.status === "in_progress"), msToReset);
    return () => clearTimeout(timer);
  }, [clock, noPuzzle, onDayOver]);
  return { clock, setClock, noPuzzle, error };
}

// Offbeat on Today: Play opens the game screen; a run in play is continued there; after it, the score and the time to the
// next puzzle.
// main: this card is the one in front on Today (src/app/today-games.ts), so its Play or Continue is the screen's one
// raised button (docs/milestones/M20-design-rules-and-clean-up.md, answers 45 and 47).
// family: a guest's card on the signed-out front page reads the guest's run, and its Play says "without an account"
// (20n-7, answer 98).
export function TodayBanner({ main, family = "account", ...hooks }: DayHooks & { main: boolean; family?: RunFamily }) {
  const { clock, noPuzzle, error } = useRun(hooks, family);
  if (clock) return <ClockTodayBanner run={clock} main={main} family={family} />;
  if (noPuzzle) return <NoPuzzleBanner />;
  return error ? <p role="alert">{error}</p> : <BannerSkeleton />;
}

// The run on the game screen. onStarted: Start began today's run, which counts in the streak at once (src/game/streak.ts), so
// the shell's rank can follow (docs/milestones/M14-14b-2a-streak-ranks.md). family: which routes it plays
// (src/app/run-routes.ts); a guest has no streak, so no onStarted. botCheck: runs the bot check when a guest presses Start and
// gives the token the start sends. onPlaying: whether the play frame is up, when the screen shows only the game (docs/milestones/
// M14-14b-6-feel-and-polish.md, 14b-6c; answers 22 and 23), said once the day is known (docs/milestones/
// M14-14b-19-controls-layout-and-state.md, answer 3). Its state stays here, in useRun, so the one reset timer and the one report
// of the run's end read the run as it is now.
export function Game({
  family,
  botCheck,
  onStarted,
  onPlaying,
  ...hooks
}: DayHooks & { family: RunFamily; botCheck?: () => Promise<string>; onStarted?: () => void; onPlaying: (playing: boolean) => void }) {
  const { clock, setClock, noPuzzle, error } = useRun(hooks, family);
  if (clock) return <ClockGame family={family} botCheck={botCheck} run={clock} setRun={setClock} onStarted={onStarted} onPlaying={onPlaying} />;
  return <Waiting noPuzzle={noPuzzle} error={error} onPlaying={onPlaying} />;
}

// The game screen before the run's state is known, and when there is none to show: no puzzle today, or the state failed to load.
function Waiting({ noPuzzle, error, onPlaying }: { noPuzzle: NoPuzzle | null; error: string | null; onPlaying: (playing: boolean) => void }) {
  const router = useRouter();
  const known = noPuzzle !== null || error !== null;
  useEffect(() => {
    if (known) onPlaying(false);
  }, [onPlaying, known]);
  // Read once, at mount (an initializer, so the development server's second render reads it too), and spent after
  // (src/app/to-play.ts).
  const [expectPlay] = useState(expectingPlay);
  useEffect(spendToPlay, []);
  if (noPuzzle) return <NoPuzzleBanner />;
  if (error) return <p role="alert">{error}</p>;
  // The frame is up while the state loads on the way into a run, so the page doesn't show its cards for a moment first.
  return expectPlay ? (
    <PlayFrame steps={CLOCK_STEPS} out="Back to Today" onLeave={() => router.push("/", { transitionTypes: BACK })}>
      <QuestionSkeleton />
    </PlayFrame>
  ) : (
    <BannerSkeleton />
  );
}

function NoPuzzleBanner() {
  return (
    <Banner>
      <Facts facts={[PAUSED_NOTE]} />
    </Banner>
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
        <span key={f} className={kit.chip}>
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

// Play on a game's card: a guest's says what it is, as the front page's buttons did (M18, answer 26; M20 20n-7, answer 98).
export const playText = (family: RunFamily) => (family === "guest" ? "Play without an account" : "Play");

// game: Fragments' card is this banner in its own colour (src/app/today-fragments.tsx; M16 16f-2).
// page: the game screen's own card, read from the left at the card's width, as Fragments' is (M20 20n-4).
export function Banner({ date, game = GAME, page = false, children }: { date?: string; game?: typeof GAME | typeof SUBSTRINGS; page?: boolean; children?: ReactNode }) {
  return (
    <div className={`${kit.card} ${styles.banner} ${gameColour(game.id)}${page ? ` ${styles.page}` : ""}`}>
      {/* The emblem is on Today's cards and the front page, not on the game's own screen (20n-7, answer 100). */}
      <Band game={game} date={date} emblem={!page} />
      {children}
    </div>
  );
}

// A game's band, the first thing in its card: its name, the card's heading, and the day (M20 20k-3, answers 54 and 55).
// The card's own game class colours it (kit .offbeat, .fragments).
export function Band({ game, date, emblem = false }: { game: typeof GAME | typeof SUBSTRINGS; date?: string; emblem?: boolean }) {
  return (
    <div className={styles.band}>
      {emblem && <Emblem game={game.id} />}
      <h2>{game.name}</h2>
      {/* "Offbeat · Tuesday 17 November", as the Balanced sample's band reads; the dot is seen, not read, and is its own
          element so the day's is the day alone. */}
      {date && (
        <>
          <span aria-hidden="true">·</span>
          <p>{longDate(date)}</p>
        </>
      )}
    </div>
  );
}

// A finished run's score, the card's big number, popping in when the card or result shows it (M20 answers 55 and 57).
// Its unit is in the same line, so it reads "120 points".
export function BigScore({ points }: { points: number }) {
  return (
    <p className={`${styles.score} ${kit.pop}`}>
      {points}
      <span> {points === 1 ? "point" : "points"}</span>
    </p>
  );
}

// Nothing to do at zero: Game's own timer moves the page to the new day.
const NOTHING = () => {};

// Time to the next reset at midnight Pacific, from the server's next reset (ROADMAP item from the M00 review). label
// says what comes then: the next puzzle after a run, only a new day when today has none, since tomorrow may not either.
export function ResetCountdown({ label, msToReset }: { label: string; msToReset: number }) {
  const total = Math.ceil(useCountdown(msToReset, NOTHING) / 1000);
  const two = (n: number) => String(n).padStart(2, "0");
  return (
    <p role="timer" className={kit.chip}>
      {label} {Math.floor(total / (60 * 60))}:{two(Math.floor(total / 60) % 60)}:{two(total % 60)}
    </p>
  );
}

export const pointsText = (n: number) => (n === 1 ? "1 point" : `${n} points`);
