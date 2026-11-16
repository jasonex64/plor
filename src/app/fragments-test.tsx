"use client";

// A test run of a Fragments day (docs/milestones/M15-15f-fragments-test-run.md, 15f-2), as Offbeat's (src/app/offbeat.tsx,
// TestScreen): the game's real screen (src/app/substrings.tsx) under a "Test run" label and Restart, for an admin to critique
// (the ticket's answer 3: "Exactly the same"). The browser holds the run, the words so far, and sends all of it each time
// to POST /api/admin/test/substrings, which keeps nothing; the 20 seconds count down here alone. After the run the result
// shows with no Share, comments or board; Back and the × go to the admin puzzles page, where Play test is.
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { SubstringRun, TryOutcome } from "@/game/substring-state";
import { api } from "@/lib/api-client";
import { SUBSTRINGS } from "@/platform/game";
import { ButtonLink } from "./button-link";
import kit from "./kit.module.css";
import styles from "./offbeat.module.css";
import { BACK } from "./slide";
import { SubstringsScreen, type SubstringsSource } from "./substrings";

type Moves = { words: (string | null)[]; open: boolean };
type TestResponse = { run: SubstringRun; outcome?: TryOutcome; played: "draft" | "approved" };

export function FragmentsTestScreen({ date }: { date: string }) {
  // Restart mounts the run again, from the rules; so does leaving it, as Next.js keeps this page hidden and its next Play
  // test would otherwise pick up this run's moves.
  const [restarts, setRestarts] = useState(0);
  return <TestRun key={restarts} date={date} onRestart={() => setRestarts((n) => n + 1)} />;
}

function TestRun({ date, onRestart }: { date: string; onRestart: () => void }) {
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState<TestResponse["played"] | null>(null);
  const moves = useRef<Moves>({ words: [], open: false });
  const source = useMemo<SubstringsSource>(() => {
    const send = async (text: string | null = null) => {
      const response = await api<TestResponse>("/api/admin/test/substrings", { method: "POST", body: { date, ...moves.current, text } });
      setPlayed(response.played);
      return response;
    };
    const open = () => {
      moves.current = { ...moves.current, open: true };
      return send();
    };
    return {
      state: () => send(),
      start: open,
      next: open,
      tryWord: async (text) => {
        const response = await send(text);
        if (response.outcome === "accepted") moves.current = { words: [...moves.current.words, text], open: false };
        return response as TestResponse & { outcome: TryOutcome };
      },
      // Once for each round: its index says which, so a second call for the same round adds nothing.
      timeUp: (index) => {
        if (moves.current.words.length === index) moves.current = { words: [...moves.current.words, null], open: false };
        return send();
      },
    };
  }, [date]);
  const label = `Test run${played === "draft" ? " of the draft" : ""}: nothing is saved`;
  const restart = (
    <button type="button" onClick={onRestart}>
      Restart
    </button>
  );
  const back = () => {
    onRestart();
    router.push("/admin/puzzles", { transitionTypes: BACK });
  };
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
      <section aria-label={`${SUBSTRINGS.name} test run`} className={styles.game}>
        <SubstringsScreen
          test={{
            source,
            onLeave: back,
            label: (
              <p>
                {label} {restart}
              </p>
            ),
          }}
          onPlaying={setPlaying}
        />
      </section>
    </div>
  );
}
