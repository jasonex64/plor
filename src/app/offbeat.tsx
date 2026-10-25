"use client";

// Offbeat's game screen, /offbeat, and its How to play (docs/milestones/M14-14a-2b-game-screen.md; L25, L29, L34, L35):
// the run, the player's stats, yesterday's answers and the feed; from 1200px the feed in a right column (L42). Laid
// out from round 5's mockup; the game's own look comes with 14c.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LETTER_SCHEDULE, POINTS_PER_QUESTION, QUESTIONS_PER_DAY } from "@/config/tunables";
import type { Stats, Yesterday } from "@/game/offbeat";
import type { RunState } from "@/game/runs";
import { api } from "@/lib/api-client";
import { PAUSED_TEXT, PAYLOAD_VERSION, changesThread, useBoardChannel } from "./board-channel";
import { Comments } from "./comments";
import { Game } from "./game";
import { errorText } from "./messages";
import styles from "./offbeat.module.css";

export function OffbeatScreen({ username }: { username: string }) {
  const [runOver, setRunOver] = useState(false);
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
  const [channelError, setChannelError] = useState<string | null>(null);
  const { paused } = useBoardChannel({
    joined: nudgeComments,
    changed: (message) => {
      if (message.v !== PAYLOAD_VERSION) console.error("board message with unknown version", message.v);
      if (changesThread(message, "feed")) nudgeComments();
    },
    failed: (err) => setChannelError(errorText(err)),
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
        <Link href="/">
          <span aria-hidden="true">← </span>Today
        </Link>
      </p>
      <section id="offbeat" aria-label="Offbeat" className={styles.game}>
        <Game key={`game-${gameDay}`} onOver={reportOver} onDayOver={nextDay} />
      </section>
      <div className={styles.cards}>
        <OffbeatInfo key={`info-${day}-${ended}`} />
      </div>
      <div className={styles.feed}>
        {paused && <p role="status">{PAUSED_TEXT}</p>}
        {channelError && <p role="alert">{channelError}</p>}
        <Comments key={`feed-${day}`} username={username} runOver={runOver} nudge={commentsNudge} title="Offbeat comments" />
      </div>
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
  if (!info) return <p>Loading…</p>;
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

// The stats as round 5 shows them: "1,050 best score", "5.2/7 avg. survived", and the questions survived each day.
function YourOffbeat({ stats }: { stats: Stats }) {
  const today = stats.days[stats.days.length - 1].date;
  const said = stats.days.map(
    (d) => `${weekday(d.date)} ${d.survived ?? (d.date === today ? "not played yet" : "not played")}`,
  );
  return (
    <section aria-label="Your Offbeat" className={styles.card}>
      <h2 className={styles.heading}>Your Offbeat</h2>
      <dl className={styles.stats}>
        <div>
          <dt>day streak</dt>
          <dd>{stats.streak}</dd>
        </div>
        <div>
          <dt>best score</dt>
          <dd>{stats.best === null ? "–" : stats.best.toLocaleString("en-US")}</dd>
        </div>
        <div>
          <dt>avg. survived</dt>
          <dd>{stats.average === null ? "–" : `${stats.average.toFixed(1)}/${QUESTIONS_PER_DAY}`}</dd>
        </div>
      </dl>
      <figure className={styles.chart}>
        <figcaption>Questions survived, last 7 days</figcaption>
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
    <section aria-label="Yesterday's answers" className={styles.card}>
      <div className={styles.titled}>
        <h2 className={styles.heading}>Yesterday&apos;s answers</h2>
        <span className={styles.muted}>{dateText(yesterday.date, { weekday: "short", day: "numeric", month: "short" })}</span>
      </div>
      {yesterday.state === "none" && <p>There was no puzzle yesterday.</p>}
      {yesterday.state === "in_play" && <p>Your run from yesterday is still going. Finish it to see the Wind&apos;s answers.</p>}
      {yesterday.state === "shown" && (
        <ol className={styles.answers}>
          {yesterday.questions.map((q) => (
            <li key={q.index}>
              <div className={styles.titled}>
                <strong>
                  {q.index + 1} · {q.prompt}
                </strong>
                {q.yours && (
                  <span className={q.yours.matched ? styles.caught : styles.safe}>{q.yours.matched ? "Caught" : "Safe"}</span>
                )}
              </div>
              <span className={styles.muted}>
                {q.yours && `You: ${q.yours.answer.name} · `}The Wind: {q.hostAnswers.map((h) => h.name).join(", ")}
              </span>
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

// How to play, in round 3's wording (L29; provisional, L32), told through the ridge and the Wind, with the game's
// numbers from tunables.ts (the 20 seconds are judged in SQL, private.question_deadline). Start climbing starts the run
// and goes to the game screen, as Start does there, and shows only before today's run has started
// (docs/milestones/M14-14a-2c-review-fixes.md).
export function HowToPlay() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  useEffect(() => {
    api<{ run: RunState | null }>("/api/run", { method: "GET" }).then(
      (r) => setRun(r.run),
      (err) => setError(errorText(err)),
    );
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/run/start", { method: "POST" });
      router.push("/offbeat");
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <section aria-label="How to play" className={styles.how}>
      <p className={styles.back}>
        <Link href="/offbeat">
          <span aria-hidden="true">‹ </span>Offbeat
        </Link>
      </p>
      <h2 className={styles.heading}>How to play</h2>
      <p>
        Up on the ridge, the Wind is listening. It has already thought of a few answers to every question. Say one of
        them and it blows you right off.
      </p>
      <p>{QUESTIONS_PER_DAY} questions, one climb. You get 20 seconds for each.</p>
      <p>
        Think off the beaten path. If the Wind didn&apos;t think of it, you&apos;re safe, and the rarer your answer, the
        bigger your bonus.
      </p>
      <p>Typo? No harm done. If it isn&apos;t a real answer, just try again.</p>
      <p>
        Watch your letters. On questions {STEALS} the Wind snatches one, so you&apos;ll have to answer without it.
      </p>
      <p>
        Keep climbing. Each step is worth more than the last: {POINTS_PER_QUESTION[0]} points at the bottom,{" "}
        {POINTS_PER_QUESTION[POINTS_PER_QUESTION.length - 1]} at the top. Run out of time and the climb ends too.
      </p>
      {run?.status === "not_started" && (
        <button type="button" className={styles.start} disabled={busy} onClick={() => void start()}>
          Start climbing
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
