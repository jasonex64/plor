"use client";

// The clock game's screens (docs/milestones/M23-23d-the-screens.md, 23d-1; M23-23c-the-run-on-a-clock.md for the state and the
// routes): today's one card before the run, the full-screen play on the run's clock, and the result with the points, the answers
// given and the ones missed, and Share. Game (src/app/game.tsx) hands over to it when today's state says `format: 4`. The server decides every
// move, so this screen holds only the state it was last given and the last thing typed's outcome; a reload or a second tab
// reads the same run from the server (answer 32), and a tab that is behind is brought up to date by asking again.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Tier } from "@/content/puzzle";
import type { ClockAnswer, ClockState, MissedQuestion } from "@/game/clock-state";
import { clockShareText } from "@/game/share";
import { api, ApiError } from "@/lib/api-client";
import { GuestPeek } from "./guest-peek";
import { ButtonLink } from "./button-link";
import { Banner, BigScore, Facts, playText, pointsText, ResetCountdown } from "./game";
import { Countdown } from "./countdown-bar";
import { answersText, addedText, TIER_WORD } from "./clock-text";
import { CLOCK_STEPS, HowToPlay } from "./how-to-play";
import { PlayFrame } from "./play-frame";
import { ShareResult } from "./share";
import { errorText } from "./messages";
import { startBody, runRoutes, type RunFamily } from "./run-routes";
import { BACK, FORWARD } from "./slide";
import { markToPlay, spendToPlay } from "./to-play";
import styles from "./clock-game.module.css";
import game from "./game.module.css";
import kit from "./kit.module.css";

type Reply = { run: ClockState; notInList?: boolean; repeat?: boolean };

// What the last thing typed came to: an accepted answer, one already said, or text that names nothing (answers 41 and 44).
type Outcome = { kind: "accepted"; answer: ClockAnswer } | { kind: "repeat" } | { kind: "miss" };

// Refusals that mean this tab is behind the server (another tab opened the next question, or the run ended): the state is
// read again, not shown as a failure.
const BEHIND = ["not_open", "out_of_order", "run_over"];

// run, setRun: the state Game's useRun holds (src/app/game.tsx), which reports the run's end and times the reset from it.
export function ClockGame({
  family,
  botCheck,
  run,
  setRun,
  onStarted,
  onPlaying,
}: {
  family: RunFamily;
  botCheck?: () => Promise<string>;
  run: ClockState;
  setRun: (run: ClockState) => void;
  onStarted?: () => void;
  onPlaying: (playing: boolean) => void;
}) {
  const router = useRouter();
  const routes = runRoutes(family);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const playing = run.status === "in_progress";
  const over = run.status === "over";
  // Whether this screen saw the run in play, so its end takes focus as the play frame leaves (WCAG 2.2 2.4.3); a run found
  // over, on a reload, leaves focus where it is.
  const [seen, setSeen] = useState(false);
  if (playing && !seen) setSeen(true);

  // The run as the server has it: on show again (the effect runs each time a kept page shows), and at zero on the clock.
  const load = useCallback(() => {
    api<{ run: ClockState | null }>(routes.state, { method: "GET" })
      .then((response) => {
        if (!response.run) throw new Error("the run in play is gone");
        return response.run;
      })
      .then(
        (state) => {
          setRun(state);
          setError(null);
        },
        (err) => setError(errorText(err)),
      );
  }, [routes.state, setRun]);
  useEffect(load, [load]);

  useEffect(spendToPlay, []);
  useEffect(() => onPlaying(playing), [onPlaying, playing]);

  async function send<T extends { run: ClockState }>(path: string, body?: unknown): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      const response = await api<T>(path, { method: "POST", body });
      setRun(response.run);
      return response;
    } catch (err) {
      if (err instanceof ApiError && BEHIND.includes(err.code)) load();
      else setError(errorText(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  // A guest's Start runs the bot check first and sends its token, as Game's does.
  async function start() {
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

  // null when the answer did not land as a move: it failed (error says why), or the run ended first and its end is shown.
  async function answer(text: string): Promise<Outcome | null> {
    const reply = await send<Reply>(routes.answer, { index: run.question!.index, text });
    if (!reply) return null;
    if (reply.notInList) return { kind: "miss" };
    if (reply.repeat) return { kind: "repeat" };
    if (reply.run.status !== "in_progress") return null;
    return { kind: "accepted", answer: reply.run.answers[reply.run.answers.length - 1] };
  }

  const leave = () => router.push("/", { transitionTypes: BACK });

  if (playing)
    return (
      <PlayFrame steps={CLOCK_STEPS} out="Back to Today" onLeave={leave}>
        {error && <p role="alert">{error}</p>}
        <Play
          key={run.question!.index}
          run={run}
          busy={busy}
          onAnswer={answer}
          onNext={() => void send(routes.next, { index: run.question!.index })}
          onFinish={() => void send(routes.finish)}
          onTimeUp={() => load()}
        />
      </PlayFrame>
    );
  return (
    <div className={game.game}>
      {/* One card, as the other games' (docs/milestones/M20-design-rules-and-clean-up.md, 20n-4). */}
      <Banner date={run.date} page>
        {run.status === "not_started" ? (
          <>
            {/* The seconds on the clock, the time each tier adds and its points are judged in SQL (private.clock_start_ms,
                clock_added_ms, clock_points), so the rules say them without numbers. */}
            <div className={styles.rules}>
              <p>
                <strong>{run.total} questions, one clock.</strong>
              </p>
              <p>Every answer adds time.</p>
              <p>Rarer answers add more time and more points.</p>
            </div>
            <button type="button" className={`${kit.primary} ${game.start}`} disabled={busy} onClick={() => void start()}>
              Start
            </button>
            <HowToPlay steps={CLOCK_STEPS} />
          </>
        ) : (
          <End run={run} focus={seen} />
        )}
      </Banner>
      {over && family === "guest" && <GuestPeek />}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

// The full-screen play: the clock, the question's place and the running points, the prompt, one input in one place, the
// last thing typed's outcome with the count of this question's answers beside it, and Next or Finish.
function Play({
  run,
  busy,
  onAnswer,
  onNext,
  onFinish,
  onTimeUp,
}: {
  run: ClockState;
  busy: boolean;
  onAnswer: (text: string) => Promise<Outcome | null>;
  onNext: () => void;
  onFinish: () => void;
  onTimeUp: () => void;
}) {
  const question = run.question!;
  const last = question.index === run.total - 1;
  const given = run.answers.filter((a) => a.index === question.index).length;
  const [text, setText] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // A ref, not state: two Enters in one tick must see it. The input stays enabled, so it keeps focus through a send.
  const sending = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const sent = text.trim();
    // busy: a Next or Finish on its way; an answer sent then could land after it and show the earlier question again.
    if (sent === "" || sending.current || busy) return;
    sending.current = true;
    try {
      const result = await onAnswer(sent);
      if (result) {
        setOutcome(result);
        setText((now) => (now === text ? "" : now));
      }
    } finally {
      sending.current = false;
    }
  }

  return (
    <div className={`${kit.card} ${kit.soft}`}>
      <p className={kit.head}>
        <span className={`${kit.chip} ${kit.dark}`}>
          Question {question.index + 1} of {run.total}
        </span>
        <span className={kit.chip}>{pointsText(run.points)}</span>
      </p>
      <h2 className={game.prompt}>{question.prompt}</h2>
      {/* Keyed by each state the server sent, so the count restarts from that state's own time left; at zero the server is
          asked again and decides (the same as the other games'). */}
      <Countdown key={`${question.index}:${run.msLeft}`} msLeft={run.msLeft!} onTimeUp={onTimeUp} />
      <form onSubmit={submit}>
        <label>
          Your answer
          <input
            value={text}
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            onChange={(e) => setText(e.target.value)}
          />
        </label>
      </form>
      <div className={styles.last}>
        {/* Always on the page, its text put in: a polite live region, so each outcome is announced. */}
        <p role="status" aria-label="Last answer" className={styles.outcome}>
          <Said outcome={outcome} />
        </p>
        <span className={kit.chip}>{answersText(given)}</span>
      </div>
      {last ? (
        <button type="button" className={kit.primary} disabled={busy} onClick={onFinish}>
          Finish
        </button>
      ) : (
        <button type="button" className={kit.primary} disabled={busy} onClick={onNext}>
          Next question
        </button>
      )}
    </div>
  );
}

function Said({ outcome }: { outcome: Outcome | null }) {
  if (!outcome) return null;
  if (outcome.kind === "repeat") return <>Already said</>;
  if (outcome.kind === "miss") return <>Not on the list</>;
  const { answer, tier, addedMs, points } = outcome.answer;
  return (
    <>
      <span>{answer.name}</span>
      <span className={kit.chip}>{TIER_WORD[tier]}</span>
      <span>{addedText(addedMs)}</span>
      <span>+{pointsText(points)}</span>
    </>
  );
}

// The result, in the card (docs/milestones/M23-23d-the-screens.md, "The result"): the points, the count of answers, Share, and per
// question a stacked row (M20 20n-5's shape): the question, its count and points, the answers given each with its tier, and the
// answers missed, then the time to the next puzzle.
function End({ run, focus }: { run: ClockState; focus: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) heading.current!.focus();
  }, [focus]);
  return (
    <>
      <BigScore points={run.points} />
      <Facts facts={[answersText(run.answers.length)]} />
      <div id="result" className={game.result}>
        <h2 ref={heading} tabIndex={-1}>
          Your answers
        </h2>
        <ShareResult text={clockShareText(run)} />
        <ol className={kit.rows}>
          {run.missed!.map((q) => {
            const answers = run.answers.filter((a) => a.index === q.index);
            return (
              <li key={q.index} className={kit.row}>
                <div className={`${kit.grow} ${game.answered}`}>
                  <strong>{q.prompt}</strong>
                  <span className={game.small}>
                    {answersText(answers.length)} · {pointsText(answers.reduce((sum, a) => sum + a.points, 0))}
                  </span>
                  {answers.length > 0 && (
                    <ul className={styles.given}>
                      {answers.map((a) => (
                        <li key={a.answer.id}>
                          <span>{a.answer.name}</span>
                          <span className={kit.chip}>{TIER_WORD[a.tier]}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Missed question={q} />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <ResetCountdown label="Next puzzle in" msToReset={run.msToReset} />
    </>
  );
}

const TIERS: Tier[] = ["common", "uncommon", "rare"];

// What the player missed on a question: up to three of each tier, the same for every player (answer 45), and the count of the rest.
function Missed({ question }: { question: MissedQuestion }) {
  const groups = TIERS.map((tier) => ({ tier, names: question.answers.filter((a) => a.tier === tier).map((a) => a.name) })).filter((g) => g.names.length > 0);
  if (groups.length === 0 && question.more <= 0) return null;
  return (
    <div className={styles.missed}>
      <span className={game.small}>You missed</span>
      <ul className={styles.given}>
        {groups.map((g) => (
          <li key={g.tier}>
            <span className={kit.chip}>{TIER_WORD[g.tier]}</span>
            <span>{g.names.join(", ")}</span>
          </li>
        ))}
      </ul>
      {question.more > 0 && <span className={game.small}>and {question.more} more</span>}
    </div>
  );
}

// Today's card for a day on a clock: Play before the run, Continue in it, the points after.
// family: a guest's card says "Play without an account", as the other cards do (M20 20n-7, answer 98).
export function ClockTodayBanner({ run, main, family }: { run: ClockState; main: boolean; family: RunFamily }) {
  const play = main ? `${kit.primary} ${game.play}` : game.play;
  return (
    <Banner date={run.date}>
      {run.status === "not_started" && (
        <>
          <Facts facts={[`${run.total} questions`, "One clock"]} />
          <ButtonLink href="/play" transitionTypes={FORWARD} className={play}>
            {playText(family)}
          </ButtonLink>
        </>
      )}
      {run.status === "in_progress" && (
        <>
          <Facts facts={["Your run is still going"]} />
          <ButtonLink href="/play" transitionTypes={FORWARD} className={play} onClick={markToPlay}>
            Continue
          </ButtonLink>
        </>
      )}
      {run.status === "over" && (
        <>
          <BigScore points={run.points} />
          <Facts facts={[answersText(run.answers.length)]} />
          <ButtonLink href="/play" transitionTypes={FORWARD} className={game.play}>
            Result
          </ButtonLink>
          <ResetCountdown label="Next puzzle in" msToReset={run.msToReset} />
        </>
      )}
    </Banner>
  );
}
