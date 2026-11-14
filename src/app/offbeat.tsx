"use client";

// The game's screen, at its record's address (src/platform/game.ts) (docs/milestones/M14-14a-2b-game-screen.md; L25, L29, L34, L35):
// the run, the player's stats, yesterday's answers and the feed; from 1200px the feed in the right column (L42;
// SideColumn). Laid out from round 5's mockup.
import { ButtonLink } from "./button-link";
import { useCallback, useEffect, useRef, useState } from "react";
import { QUESTIONS_PER_DAY } from "@/config/tunables";
import type { Stats, Yesterday } from "@/game/offbeat";
import { api } from "@/lib/api-client";
import { PAYLOAD_VERSION, changesThread, useBoardChannel } from "./board-channel";
import { LiveStatus } from "./live-status";
import { Comments } from "./comments";
import { AnswerSearch } from "./answer-search";
import { Game, TestGame } from "./game";
import { expectingPlay } from "./to-play";
import { errorText } from "./messages";
import { SideColumn } from "./side-column";
import { BACK } from "./slide";
import kit from "./kit.module.css";
import { SurvivedChart } from "./survived-chart";
import { CountUp } from "./count-up";
import styles from "./offbeat.module.css";
import { Line, Skeleton } from "./skeleton";
import { GAME, GAME_ID } from "@/platform/game";

// onStarted: Start began today's run, so the shell's streak can follow (docs/milestones/M14-14b-2a-streak-ranks.md).
export function OffbeatScreen({ username, name, onStarted }: { username: string; name: string; onStarted: () => void }) {
  const [runOver, setRunOver] = useState(false);
  // While the run is in progress the screen holds only the game: the cards and the feed come back when it ends
  // (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6c; answer 23). Until the run loads, it's what the way in expects
  // (src/app/to-play.ts), so opened onto a run in play the cards and feed don't show for a moment, and opened before or
  // after one they're there from the first paint, the feed's column with them (docs/milestones/M14-14b-19-controls-layout-and-state.md, answer 3).
  // Both stay mounted, hidden: the cards load with the page, not after the run's state (14a-2c, criterion 3), and a
  // draft in the feed and the day it shows stay across the run (answer 2).
  const [playing, setPlaying] = useState(expectingPlay);
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
      {/* In a run the game is full screen, with its own way out (the play frame, src/app/play-frame.tsx). */}
      <p className={styles.back} hidden={playing}>
        <ButtonLink href="/" transitionTypes={BACK}>
          <span aria-hidden="true">‹ </span>Today
        </ButtonLink>
      </p>
      <section id="offbeat" aria-label={GAME.name} className={styles.game}>
        <Game key={`game-${gameDay}`} family="account" onOver={reportOver} onDayOver={nextDay} onStarted={onStarted} onPlaying={setPlaying} />
      </section>
      <div className={styles.cards} hidden={playing}>
        <OffbeatInfo key={`info-${day}-${ended}`} />
      </div>
      <SideColumn label="Feed" inPlace className={styles.feed} hidden={playing}>
        <LiveStatus channel={channel} />
        <Comments key={`feed-${day}`} username={username} name={name} runOver={runOver} nudge={commentsNudge} game={GAME_ID} title={`${GAME.name} comments`} />
      </SideColumn>
    </div>
  );
}

// A test run's screen (docs/milestones/M14-14b-11-test-runs.md): the game screen as players see it (human, 2026-10-29,
// answer 3: "i need the real screen and animations so i can critique it"), under a "Test run" label and Restart, which
// stay in view the whole run (answer 12): in a run they ride above the question in the play frame, whose × goes back to the admin
// puzzles page (14c-6, answers 11 and 26). Back goes to the admin puzzles
// page, where Play test is. After the run the cards come back as on the game screen; the comments don't (answer 6).
export function TestScreen({ date, hostAnswers }: { date: string; hostAnswers: string[][] | null }) {
  const [playing, setPlaying] = useState(false);
  const [restarts, setRestarts] = useState(0);
  const label = `Test run${hostAnswers ? " of the draft" : ""}: nothing is saved`;
  const again = () => setRestarts((n) => n + 1);
  const restart = (
    <button type="button" onClick={again}>
      Restart
    </button>
  );
  return (
    <div className={styles.screen}>
      {!playing && (
        <div className={`${styles.back} ${styles.testBar}`}>
          <ButtonLink href="/admin/puzzles" transitionTypes={BACK}>
            <span aria-hidden="true">‹ </span>Puzzles
          </ButtonLink>
          <span className={kit.chip}>{label}</span>
          {restart}
        </div>
      )}
      <section aria-label={`${GAME.name} test run`} className={styles.game}>
        {/* Restart mounts the run again, from the rules (answer 12). */}
        <TestGame
          key={restarts}
          date={date}
          hostAnswers={hostAnswers}
          onPlaying={setPlaying}
          onRestart={again}
          label={
            <p>
              {label} {restart}
            </p>
          }
        />
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
          <h2 className={styles.heading}>Yesterday&apos;s answers</h2>
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

// "24 Oct" and "Fri 23 Oct", from a calendar date read in UTC so it can't shift by a day.
const dateText = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });

// The stats as round 5 shows them: "1,050 best score", "5.2/7 avg. survived", and the questions survived each day.
function YourOffbeat({ stats }: { stats: Stats }) {
  return (
    <section aria-label={`Your ${GAME.name}`} className={kit.card}>
      <h2 className={styles.heading}>Your {GAME.name}</h2>
      <dl className={styles.stats}>
        <div className={kit.stat}>
          <dt>day streak</dt>
          <dd>
            <CountUp name="offbeat.streak" value={stats.streak} />
          </dd>
        </div>
        <div className={kit.stat}>
          <dt>best score</dt>
          <dd>{stats.best === null ? "–" : <CountUp name="offbeat.best" value={stats.best} />}</dd>
        </div>
        <div className={kit.stat}>
          <dt>avg. survived</dt>
          <dd>{stats.average === null ? "–" : `${stats.average.toFixed(1)}/${QUESTIONS_PER_DAY}`}</dd>
        </div>
      </dl>
      <SurvivedChart days={stats.days} />
    </section>
  );
}

// Yesterday's questions with the host's answers, for everyone once the day is closed (L34), and the player's own
// answer and how it went where they gave one.
function YesterdaysAnswers({ yesterday }: { yesterday: Yesterday }) {
  return (
    <section aria-label="Yesterday's answers" className={kit.card}>
      <div className={styles.titled}>
        <h2 className={styles.heading}>Yesterday&apos;s answers</h2>
        <span className={styles.muted}>{dateText(yesterday.date, { weekday: "short", day: "numeric", month: "short" })}</span>
      </div>
      {yesterday.state === "none" && <p>There was no puzzle yesterday.</p>}
      {yesterday.state === "in_play" && <p>Your run from yesterday is still going. Finish it to see the host&apos;s answers.</p>}
      {yesterday.state === "shown" && (
        <ol className={`${kit.rows} ${styles.answers}`}>
          {yesterday.questions.map((q) => (
            <li key={q.index} className={kit.row}>
              <div className={styles.titled}>
                <strong>
                  {q.index + 1} · {q.prompt}
                </strong>
                {q.yours && (
                  <span className={q.yours.matched ? `${kit.chip} ${kit.caught}` : `${kit.chip} ${kit.safe}`}>{q.yours.matched ? "Caught" : "Safe"}</span>
                )}
              </div>
              <span className={styles.muted}>
                {q.yours && `You: ${q.yours.answer.name} · `}The host: {q.hostAnswers.map((h) => h.name).join(", ")}
              </span>
              <AnswerSearch date={yesterday.date} index={q.index} prompt={q.prompt} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
