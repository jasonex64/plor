"use client";

// Game 2's screen in Midnight Brew (docs/milestones/M16-16g-2-midnight-brew-in-play2.md, 16g-2a). A run plays full
// screen, the shell's bars hidden (answer 2; body[data-game], src/app/body-flag.ts), the village on top and the panel
// under it (16g-1 answer 8); the end of a run stays as today's cards (answer 1). The server judges and keeps time, as in
// 16d-2; the village only shows what happened, and each moment is waited for before the panel moves on, so the camera is
// still whenever the box has focus (16g-1 answer 9). three.js and the village load on demand, from this screen alone.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { SubstringRun, TryOutcome } from "@/game/substring-state";
import { ApiError, api } from "@/lib/api-client";
import { SUBSTRINGS } from "@/platform/game";
import { useBodyFlag } from "@/app/body-flag";
import { useCountdown } from "@/app/countdown";
import kit from "@/app/kit.module.css";
import { errorText } from "@/app/messages";
import { BACK } from "@/app/slide";
import { ALPHABET, Results, WHY, scored } from "@/app/substrings";
import cards from "@/app/substrings.module.css";
import type { Village } from "./village";
import styles from "./brew.module.css";

type RunResponse = { run: SubstringRun | null };

// A refusal that means this screen is behind the server: a tab left between rounds overnight has no clock to bring it
// back, and its run isn't today's. Anything else is a failure, and is shown (16d-2).
const BEHIND = ["no_run", "no_puzzle_today", "run_over", "round_running"];

// A word's letters alone, as the server keys it (DECISIONS.md, Game 2), for the blocks and the tier.
const lettersOf = (word: string) => word.normalize("NFD").replace(/[^a-z]/gi, "").toLowerCase();

export function BrewScreen() {
  const [run, setRun] = useState<SubstringRun | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  // The finale has played (or the run was already over on load): the cards show.
  const [ended, setEnded] = useState(false);

  // The run as the server has it now; undefined when that failed, which is shown.
  const load = useCallback(async () => {
    try {
      const r = await api<RunResponse>("/api/substrings", { method: "GET" });
      setError(null);
      return r.run;
    } catch (err) {
      setError(errorText(err));
      return undefined;
    }
  }, []);
  const first = useCallback(() => {
    api<RunResponse>("/api/substrings", { method: "GET" }).then(
      (r) => {
        setRun(r.run);
        setEnded(r.run?.status === "finished");
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, []);
  useEffect(first, [first]);

  if (run === null || (run && ended)) {
    return (
      <section aria-label={SUBSTRINGS.name} className={kit.card}>
        <h2 className={cards.title}>{SUBSTRINGS.name}</h2>
        {error && <p role="alert">{error}</p>}
        {run === null ? <p>There&apos;s no puzzle today.</p> : <Results run={run} />}
      </section>
    );
  }
  if (run === undefined) {
    return (
      <div className={styles.brew} role="status">
        {error ? <p role="alert">{error}</p> : <span className="sr-only">Loading {SUBSTRINGS.name}</span>}
      </div>
    );
  }
  return <Brew run={run} setRun={setRun} load={load} onEnded={() => setEnded(true)} />;
}

// What the panel shows besides the run itself: a moment playing out (nothing to press), the next change casting (Next
// waits), or nothing (16g-1 answer 25).
type Moment = "playing" | "casting" | null;

function Brew({ run, setRun, load, onEnded }: { run: SubstringRun; setRun: (run: SubstringRun | null) => void; load: () => Promise<SubstringRun | null | undefined>; onEnded: () => void }) {
  useBodyFlag("game", true);
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null);
  const village = useRef<Village | null>(null);
  const [ready, setReady] = useState(false);
  const [moment, setMoment] = useState<Moment>(null);
  const [error, setError] = useState<string | null>(null);
  // What's in the box, for the grey letters of a time-up.
  const typed = useRef("");
  // Each round's box starts empty; an accepted word leaves without clearing it.
  useEffect(() => { typed.current = ""; }, [run.open?.index]);
  // The rounds done, for the village when it has loaded.
  const levelNow = useRef(run.rounds.length);
  useEffect(() => { levelNow.current = run.rounds.length; });

  // An error in the village is shown, and logged for whoever looks into it (DECISIONS.md, Error handling); the run goes
  // on without the village, as the panel and the server don't need it.
  const fault = useCallback((err: unknown) => {
    console.error(err);
    village.current?.stop();
    village.current = null;
    setError(errorText(err));
  }, []);
  useEffect(() => {
    const gone = new AbortController();
    let started: Village | null = null;
    const font = getComputedStyle(document.body).fontFamily;
    import("./village")
      .then(({ startVillage }) => startVillage(host.current!, font, fault, gone.signal))
      .then((v) => {
        started = v;
        village.current = v;
        v.setLevel(levelNow.current);
        setReady(true);
        // The second stage in, marked on the scene for the load measurements (answer 11).
        v.extras.then(() => { if (host.current) host.current.dataset.extras = "in"; }, fault);
      })
      .catch((err) => { if (!gone.signal.aborted) fault(err); });
    return () => {
      gone.abort();
      started?.stop();
      village.current = null;
    };
  }, [fault]);
  useEffect(() => { village.current?.score(run.score?.total ?? 0); }, [run.score?.total, ready]);

  // A round ended, by a word or the clock: its moment plays, then the next change casts while Next waits; after round 7
  // the finale plays by itself and the cards follow (16g-1 answers 25 to 27). The village may not have loaded yet on a
  // resumed run: then there's nothing to watch, and the panel goes straight on.
  async function roundEnded(next: SubstringRun, how: { word: string; bonus: boolean } | { typed: string }) {
    setRun(next);
    setMoment("playing");
    // A moment the village can't finish is a fault like any other: shown, and the run goes on without the village.
    const watch = async (moment: (v: Village) => Promise<void>) => {
      const v = village.current;
      if (!v) return;
      try {
        await moment(v);
      } catch (err) {
        if (village.current) fault(err);
      }
    };
    await watch((v) => ("word" in how ? v.word(lettersOf(how.word), how.bonus, next.bonusLetter) : v.miss(lettersOf(how.typed))));
    if (next.status === "finished") {
      await watch((v) => v.finale());
      onEnded();
      return;
    }
    setMoment("casting");
    await watch(async (v) => {
      await v.cast(next.rounds.length);
      await v.settled();
    });
    setMoment(null);
  }

  const send = async (path: string) => {
    try {
      setRun((await api<RunResponse>(path, { method: "POST" })).run);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && BEHIND.includes(err.code)) {
        const fresh = await load();
        if (fresh !== undefined) setRun(fresh);
      } else setError(errorText(err));
    }
  };

  async function timeUp() {
    const fresh = await load();
    if (!fresh) { if (fresh === null) setRun(null); return; }
    if (fresh.open) { setRun(fresh); return; }
    await roundEnded(fresh, { typed: typed.current });
  }

  const last = run.rounds[run.rounds.length - 1];
  return (
    <section aria-label={SUBSTRINGS.name} className={styles.brew}>
      <div ref={host} className={styles.scene}>
        <h2 className={styles.name}>{SUBSTRINGS.name}</h2>
        {!ready && !error && <p className={styles.loading} aria-hidden="true">Loading the village…</p>}
        {/* The way out (answer 2), as Afterglow's: back to Today. */}
        <button type="button" className={styles.out} aria-label="Back to Today" onClick={() => router.push("/", { transitionTypes: BACK })}>
          ×
        </button>
      </div>
      <div className={styles.panel}>
        <div className={styles.inner}>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.top}>
            <span className={styles.round}>
              {run.status === "not_started" ? `${run.total} rounds` : `Round ${Math.min(run.rounds.length + (run.open ? 1 : 0), run.total)} of ${run.total}`}
            </span>
            <span className={styles.score}>
              <small>Score</small>
              <b>{run.score?.total ?? 0}</b>
            </span>
          </div>
          {run.status === "not_started" ? (
            <div className={styles.slot}>
              <p className={styles.intro}>{run.total} rounds. Each gives you a few letters and 20 seconds to type a word that holds them.</p>
              {/* A run starts once the village and the witch are in (answer 11). */}
              <button type="button" className={styles.go} disabled={!ready && !error} onClick={() => send("/api/substrings/start")}>
                {ready || error ? "Start" : "Loading the village…"}
              </button>
            </div>
          ) : run.open && moment === null ? (
            <Round
              key={run.open.index}
              run={run}
              onType={(text) => (typed.current = text)}
              onRefused={() => village.current?.refused()}
              onAccepted={(next) => {
                const played = next.rounds[next.rounds.length - 1];
                void roundEnded(next, { word: played.word ?? "", bonus: played.bonus > 0 });
              }}
              onEnded={(next) => void roundEnded(next, { typed: typed.current })}
              onTimeUp={() => void timeUp()}
            />
          ) : moment === "playing" ? (
            <div className={styles.slot} />
          ) : (
            <div className={styles.slot}>
              <div className={styles.card}>
                <p id="round-end" role="status" className={styles.ended}>
                  {last.word === null ? "Time's up." : `You played ${last.word}: ${scored(last)}.`}
                </p>
                {/* Focus moves here once the change has cast, so Enter goes on and a screen reader hears how the round ended. */}
                <NextButton casting={moment === "casting"} onNext={() => send("/api/substrings/next")} />
              </div>
            </div>
          )}
          {run.status !== "not_started" && <Tracker used={run.score?.used ?? ""} />}
        </div>
      </div>
    </section>
  );
}

function NextButton({ casting, onNext }: { casting: boolean; onNext: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!casting) button.current?.focus({ preventScroll: true }); }, [casting]);
  return (
    <button ref={button} type="button" className={styles.go} disabled={casting} aria-describedby="round-end" onClick={onNext}>
      {casting ? "Casting the spell…" : "Next question"}
    </button>
  );
}

function Round({ run, onType, onRefused, onAccepted, onEnded, onTimeUp }: {
  run: SubstringRun;
  onType: (text: string) => void;
  onRefused: () => void;
  onAccepted: (run: SubstringRun) => void;
  onEnded: (run: SubstringRun) => void;
  onTimeUp: () => void;
}) {
  const open = run.open!;
  const [text, setText] = useState("");
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A ref, not state: two Enters in one tick must see it. One try at a time, or the second comes back "locked" and hides
  // why the first failed (16d, answer 3).
  const trying = useRef(false);
  const type = (value: string) => { setText(value); onType(value); };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (trying.current) return;
    if (text.trim() === "") { type(""); return; }
    trying.current = true;
    const sent = text;
    try {
      const result = await api<RunResponse & { outcome: TryOutcome }>("/api/substrings/try", { method: "POST", body: { text: sent } });
      setError(null);
      const why = WHY[result.outcome];
      if (why) {
        setReason(why(open.letters));
        onRefused();
      } else if (result.outcome === "accepted") {
        onAccepted(result.run!);
        return;
      } else if (result.outcome !== "empty") {
        // Past the clock, or the round already answered: the server's run moves the screen on.
        onEnded(result.run!);
        return;
      }
      // A try that didn't count leaves the box empty for the next word, unless they've typed on since (DECISIONS.md, Game 2).
      setText((now) => {
        const left = now === sent ? "" : now;
        onType(left);
        return left;
      });
    } catch (err) {
      setError(errorText(err));
    } finally {
      trying.current = false;
    }
  }

  return (
    <div className={styles.slot}>
      <div className={styles.prompt}>
        <span className={styles.set}>{open.letters}</span>
        <span className={styles.bonus}>
          Bonus letter <b>{run.bonusLetter}</b>
        </span>
      </div>
      <Clock key={open.msLeft} msLeft={open.msLeft} onTimeUp={onTimeUp} />
      <form onSubmit={submit} className={styles.form}>
        {/* Phones shouldn't change what's typed: a corrected word isn't the player's. */}
        <input value={text} onChange={(e) => type(e.target.value)} aria-label="Your word" autoFocus autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="go" />
        <button type="submit" className={styles.go}>
          Toss it in
        </button>
      </form>
      <p role="status" className={styles.reason}>
        {reason}
      </p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
  );
}

// The bar runs from the time left when the round showed, as the run doesn't carry a round's whole length and the 20
// seconds have one home, the database (DECISIONS.md, Config and tunables); a resumed round's bar starts full.
function Clock({ msLeft, onTimeUp }: { msLeft: number; onTimeUp: () => void }) {
  const left = useCountdown(msLeft, onTimeUp);
  return (
    <div className={styles.clock}>
      <div className={styles.fill} style={{ transform: `scaleX(${msLeft > 0 ? left / msLeft : 0})` }} />
      <p role="timer" className={styles.secs}>
        {Math.ceil(left / 1000)}s<span className="sr-only"> seconds left</span>
      </p>
    </div>
  );
}

// The letters the run has used, cashed in at its end (M16 16e, answer 6). The row of letters is for the eye; the count says it.
function Tracker({ used }: { used: string }) {
  return (
    <div className={styles.tracker}>
      <p className={styles.trackerCount}>
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
