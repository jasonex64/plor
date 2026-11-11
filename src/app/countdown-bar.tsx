"use client";

// The seconds left on a question or a round, as a number with a bar that drains, in both games (docs/milestones/
// M14-14c-9-plain-game-2.md, answer 7b). The number is
// the main sign of time and what screen readers get, in the timer's own text, which some skip in an aria-label
// (docs/milestones/M14-14b-21-screen-readers.md); the bar is only for the eye (WCAG 2.2 1.4.1). At zero it asks the
// server again, which decides whether time is up; the count itself is only a display.
import { useCountdown } from "./countdown";
import styles from "./countdown-bar.module.css";

// The bar runs from the time left when this showed, as the run doesn't carry a whole round's length and the 20 seconds
// have one home, the database (DECISIONS.md, Config and tunables); a resumed one's bar starts full. Callers key it by
// the state the server sent, so a retry restarts the count from the server's own time left.
export function Countdown({ msLeft, onTimeUp }: { msLeft: number; onTimeUp: () => void }) {
  const left = useCountdown(msLeft, onTimeUp);
  const seconds = Math.ceil(left / 1000);
  return (
    <div className={styles.countdown}>
      <div className={styles.box}>
        <p role="timer" className={styles.number}>
          {seconds}
          <span className="sr-only"> seconds left</span>
        </p>
        {/* Shown under the number; the timer's own text says it to screen readers. */}
        <span aria-hidden="true">seconds left</span>
      </div>
      <div aria-hidden="true" className={styles.track}>
        <div className={styles.fill} style={{ transform: `scaleX(${msLeft > 0 ? left / msLeft : 0})` }} />
      </div>
    </div>
  );
}
