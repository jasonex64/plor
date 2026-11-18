"use client";

// Fragments on Today (docs/milestones/M16-16f-the-shared-pieces.md, 16f-2; human, 2026-11-14: "Mirror, plus the percent
// after play"): Offbeat's banner in Fragments' colour, the day, the name, what the day holds, then Play, Continue or the
// result, and after play "better than X% of players" once the day has enough finished players (src/game/substring-places.ts).
// The run comes from the page (src/app/today-cards.tsx), which needs it to choose the card in front.
import type { SubstringRun } from "@/game/substring-state";
import { SUBSTRINGS } from "@/platform/game";
import { ButtonLink } from "./button-link";
import { Banner, BigScore, Facts, ResetCountdown } from "./game";
import styles from "./game.module.css";
import { GAME_2_STEPS, HowToPlay } from "./how-to-play";
import kit from "./kit.module.css";
import { FORWARD } from "./slide";

// msToReset: the time to the next reset, which Fragments' state doesn't carry; Offbeat's does (src/app/today-cards.tsx), and the
// reset is the one for both games.
// main: this card is the one in front on Today, so its Play or Continue is the screen's one raised button (M20, answers
// 45 and 47); Result is flat.
export function FragmentsBanner({ run, msToReset, main }: { run: SubstringRun; msToReset: number; main: boolean }) {
  const play = main ? `${kit.primary} ${styles.play}` : styles.play;
  return (
    <Banner date={run.date} game={SUBSTRINGS}>
      {run.status === "not_started" && (
        <>
          <Facts facts={[`${run.total} rounds`, "20 seconds each"]} />
          <ButtonLink href={SUBSTRINGS.path} transitionTypes={FORWARD} className={play}>
            Play
          </ButtonLink>
          <HowToPlay steps={GAME_2_STEPS} />
        </>
      )}
      {run.status === "in_progress" && (
        <>
          <Facts facts={["Your run is still going"]} />
          <ButtonLink href={SUBSTRINGS.path} transitionTypes={FORWARD} className={play}>
            Continue
          </ButtonLink>
        </>
      )}
      {run.status === "finished" && (
        <>
          <BigScore points={run.score!.total} />
          {run.standing!.percent !== null && <Facts facts={[`better than ${run.standing!.percent}% of players`]} />}
          <ButtonLink href={SUBSTRINGS.path} transitionTypes={FORWARD} className={styles.play}>
            Result
          </ButtonLink>
          <ResetCountdown label="Next puzzle in" msToReset={msToReset} />
        </>
      )}
    </Banner>
  );
}
