"use client";

// The game's screen, at its record's address (src/platform/game.ts), and its How to play (docs/milestones/M14-14a-2b-game-screen.md; L25, L29, L34, L35):
// the run, the player's stats, yesterday's answers and the feed; from 1200px the feed in the right column (L42;
// SideColumn). Laid out from round 5's mockup; the game's own look comes with 14c.
import { ButtonLink } from "./button-link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LETTER_SCHEDULE, POINTS_PER_QUESTION, QUESTIONS_PER_DAY } from "@/config/tunables";
import type { Stats, Yesterday } from "@/game/offbeat";
import type { RunState } from "@/game/runs";
import { api } from "@/lib/api-client";
import { PAYLOAD_VERSION, changesThread, useBoardChannel } from "./board-channel";
import { LiveStatus } from "./live-status";
import { Comments } from "./comments";
import { AnswerSearch } from "./answer-search";
import { Game, TestGame, useStartRun } from "./game";
import { errorText } from "./messages";
import { SideColumn } from "./side-column";
import { BACK } from "./slide";
import kit from "./kit.module.css";
import styles from "./offbeat.module.css";
import { Line, Skeleton } from "./skeleton";
import { GAME } from "@/platform/game";
import { capitalized, caughtWord } from "@/game/words";

// onStarted: Start began today's run, so the shell's streak can follow (docs/milestones/M14-14b-2a-streak-ranks.md).
export function OffbeatScreen({ username, name, onStarted }: { username: string; name: string; onStarted: () => void }) {
  const [runOver, setRunOver] = useState(false);
  // While the run is in progress the screen holds only the game: the cards and the feed come back when it ends
  // (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6c; answer 23).
  const [playing, setPlaying] = useState(false);
  // How many runs ended during this visit: the cards load again for each, so today's run counts in them at once. A
  // run already over when the page opened is in their first load (docs/milestones/M14-14a-2c-review-fixes.md).
  const [ended, setEnded] = useState(0);
  const lastOver = useRef<boolean | null>(null);
  const reportOver = useCallback((over: boolean) => {
    if (lastOver.current === false && over) setEnded((n) => n + 1);
    lastOver.current = over;
    setRunOver(over);
  }, []);
  const [commentsNudge, setCommentsNudge] = useState(0);
  const nudgeComments = useCallback(() => setCommentsNudge((n) => n + 1), []);
  const channel = useBoardChannel({
    joined: nudgeComments,
    changed: (message) => {
      if (message.v !== PAYLOAD_VERSION) console.error("board message with unknown version", message.v);
      if (changesThread(message, "feed")) nudgeComments();
    },
  });
  // At midnight Pacific the page starts again from the server's new day, except a game in play, which goes on to its
  // end (M11 H6), as on Today.
  const [day, setDay] = useState(0);
  const [gameDay, setGameDay] = useState(0);
  const nextDay = useCallback((inPlay: boolean) => {
    setDay((d) => d + 1);
    if (!inPlay) setGameDay((d) => d + 1);
  }, []);

  return (
    <div className={styles.screen}>
      <p className={styles.back}>
        <ButtonLink href="/" transitionTypes={BACK}>
          <span aria-hidden="true">← </span>Today
        </ButtonLink>
      </p>
      <section id="offbeat" aria-label={GAME.name} className={styles.game}>
        <Game key={`game-${gameDay}`} onOver={reportOver} onDayOver={nextDay} onStarted={onStarted} onPlaying={setPlaying} />
      </section>
      {!playing && (
        <>
          <div className={styles.cards}>
            <OffbeatInfo key={`info-${day}-${ended}`} />
          </div>
          <SideColumn label="Feed" inPlace className={styles.feed}>
            <LiveStatus channel={channel} />
            <Comments key={`feed-${day}`} username={username} name={name} runOver={runOver} nudge={commentsNudge} title={`${GAME.name} comments`} />
          </SideColumn>
        </>
      )}
    </div>
  );
}

// A test run's screen (docs/milestones/M14-14b-11-test-runs.md): the game screen as players see it (human, 2026-10-29,
// answer 3: "i need the real screen and animations so i can critique it"), under a "Test run" label and Restart, which
// stay in view the whole run (answer 12). Back goes to the admin puzzles page, where Play test is. After the run the
// cards come back as on the game screen; the comments don't (answer 6).
export function TestScreen({ date, hostAnswers }: { date: string; hostAnswers: string[][] | null }) {
  const [playing, setPlaying] = useState(false);
  const [restarts, setRestarts] = useState(0);
  return (
    <div className={styles.screen}>
      <div className={`${styles.back} ${styles.testBar}`}>
        <ButtonLink href="/admin/puzzles" transitionTypes={BACK}>
          <span aria-hidden="true">← </span>Puzzles
        </ButtonLink>
        <span className={kit.chip}>Test run{hostAnswers ? " of the draft" : ""}: nothing is saved</span>
        <button type="button" onClick={() => setRestarts((n) => n + 1)}>
          Restart
        </button>
      </div>
      <section aria-label={`${GAME.name} test run`} className={styles.game}>
        {/* Restart mounts the run again, from the rules (answer 12). */}
        <TestGame key={restarts} date={date} hostAnswers={hostAnswers} onPlaying={setPlaying} />
      </section>
      {!playing && (
        <div className={styles.cards}>
          <OffbeatInfo />
        </div>
      )}
    </div>
  );
}

function OffbeatInfo() {
  const [info, setInfo] = useState<{ stats: Stats; yesterday: Yesterday } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ stats: Stats; yesterday: Yesterday }>("/api/offbeat", { method: "GET" }).then(setInfo, (err) => setError(errorText(err)));
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!info)
    return (
      <Skeleton label={`Loading your ${GAME.name}`}>
        <section className={kit.card}>
          <h2 className={styles.heading}>Your {GAME.name}</h2>
          <Line />
        </section>
        <section className={kit.card}>
          <h2 className={styles.heading}>Yesterday on the ridge</h2>
          <Line />
        </section>
      </Skeleton>
    );
  return (
    <>
      <YourOffbeat stats={info.stats} />
      <YesterdaysAnswers yesterday={info.yesterday} />
    </>
  );
}

// "Sat", "24 Oct" and "Fri 23 Oct", from a calendar date read in UTC so it can't shift by a day.
const dateText = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });
const weekday = (date: string) => dateText(date, { weekday: "short" });

// The stats as round 5 shows them, in Updraft's words (14c-1): "1,050 best score", "5.2/7 avg. stops climbed", and the
// stops climbed each day.
function YourOffbeat({ stats }: { stats: Stats }) {
  const today = stats.days[stats.days.length - 1].date;
  const said = stats.days.map(
    (d) => `${weekday(d.date)} ${d.survived ?? (d.date === today ? "not played yet" : "not played")}`,
  );
  return (
    <section aria-label={`Your ${GAME.name}`} className={kit.card}>
      <h2 className={styles.heading}>Your {GAME.name}</h2>
      <dl className={styles.stats}>
        <div className={kit.stat}>
          <dt>day streak</dt>
          <dd>{stats.streak}</dd>
        </div>
        <div className={kit.stat}>
          <dt>best score</dt>
          <dd>{stats.best === null ? "–" : stats.best.toLocaleString("en-US")}</dd>
        </div>
        <div className={kit.stat}>
          <dt>avg. stops climbed</dt>
          <dd>{stats.average === null ? "–" : `${stats.average.toFixed(1)}/${QUESTIONS_PER_DAY}`}</dd>
        </div>
      </dl>
      <figure className={styles.chart}>
        <figcaption>Stops climbed, last 7 days</figcaption>
        {/* The bars are one image to a screen reader, whose label says each day's value (WCAG 2.2 1.1.1). */}
        <div role="img" aria-label={said.join(", ")} className={styles.bars}>
          {stats.days.map((d) => (
            <div key={d.date} aria-hidden="true">
              <span className={styles.value}>{d.survived ?? "–"}</span>
              <i style={{ height: `${((d.survived ?? 0) / QUESTIONS_PER_DAY) * 100}%` }} />
              <span>{weekday(d.date)}</span>
            </div>
          ))}
        </div>
      </figure>
    </section>
  );
}

// Yesterday's questions with the Wind's answers, for everyone once the day is closed (L34), and the player's own
// answer and how it went where they gave one.
function YesterdaysAnswers({ yesterday }: { yesterday: Yesterday }) {
  return (
    <section aria-label="Yesterday on the ridge" className={kit.card}>
      <div className={styles.titled}>
        <h2 className={styles.heading}>Yesterday on the ridge</h2>
        <span className={styles.muted}>{dateText(yesterday.date, { weekday: "short", day: "numeric", month: "short" })}</span>
      </div>
      {yesterday.state === "none" && <p>There was no puzzle yesterday.</p>}
      {yesterday.state === "in_play" && <p>Your run from yesterday is still going. Finish it to see the Wind&apos;s answers.</p>}
      {yesterday.state === "shown" && (
        <ol className={`${kit.rows} ${styles.answers}`}>
          {yesterday.questions.map((q) => (
            <li key={q.index} className={kit.row}>
              <div className={styles.titled}>
                <strong>
                  {q.index + 1} · {q.prompt}
                </strong>
                {q.yours && (
                  <span className={q.yours.matched ? `${kit.chip} ${kit.caught}` : `${kit.chip} ${kit.safe}`}>{q.yours.matched ? capitalized(caughtWord(q.index + 1)) : "Climbed"}</span>
                )}
              </div>
              <span className={styles.muted}>
                {q.yours && `You: ${q.yours.answer.name} · `}The Wind: {q.hostAnswers.map((h) => h.name).join(", ")}
              </span>
              <AnswerSearch date={yesterday.date} index={q.index} prompt={q.prompt} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// The questions where the Wind steals a letter, from tunables.ts: "2, 4, 5 and 7".
const STEALS = new Intl.ListFormat("en", { type: "conjunction" }).format(
  LETTER_SCHEDULE.flatMap((tier, i) => (tier === null ? [] : [String(i + 1)])),
);

// How to play, in round 3's wording (L29; provisional, L32) and Updraft's words since 14c-1 (N6), told through the
// ridge and the Wind, with the game's numbers from tunables.ts (the 20 seconds are judged in SQL,
// private.question_deadline). Start climbing starts the run and goes to the game screen, as Start does there, and shows
// only before today's run has started (docs/milestones/M14-14a-2c-review-fixes.md).
export function HowToPlay() {
  const starting = useStartRun(BACK);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  useEffect(() => {
    api<{ run: RunState | null }>("/api/run", { method: "GET" }).then(
      (r) => setRun(r.run),
      (err) => setError(errorText(err)),
    );
  }, []);

  return (
    <section aria-label="How to play" className={`${kit.card} ${styles.how}`}>
      <p className={styles.back}>
        <ButtonLink href={GAME.path} transitionTypes={BACK}>
          <span aria-hidden="true">‹ </span>
          {GAME.name}
        </ButtonLink>
      </p>
      <h2 className={styles.heading}>How to play</h2>
      <p>
        Up on the ridge, the Wind is listening. At every stop it has already thought of a few answers. Say one of them
        and it sends you flying.
      </p>
      <p>{QUESTIONS_PER_DAY} stops, one climb. You get 20 seconds at each.</p>
      <p>
        Think off the beaten path. If the Wind didn&apos;t think of it, you climb on, and the rarer your answer, the
        bigger your bonus.
      </p>
      <p>Typo? No harm done. If it isn&apos;t a real answer, just try again.</p>
      <p>
        Watch your letters. At stops {STEALS} the Wind snatches one, so you&apos;ll have to answer without it.
      </p>
      <p>
        Keep climbing. Each stop is worth more than the last: {POINTS_PER_QUESTION[0]} points at the bottom,{" "}
        {POINTS_PER_QUESTION[POINTS_PER_QUESTION.length - 1]} at the top. Run out of time and the climb ends too.
      </p>
      {run?.status === "not_started" && (
        <button type="button" className={kit.primary} disabled={starting.busy} onClick={() => void starting.start()}>
          Start climbing
        </button>
      )}
      {(error ?? starting.error) && <p role="alert">{error ?? starting.error}</p>}
    </section>
  );
}
