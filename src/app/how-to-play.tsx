"use client";

// How to play (14c-6d; plain in docs/milestones/M14-14c-8-plain-game-1.md): a
// button that opens a panel over the page it's on, on Today's banner and over the game, for both games. The panel is a
// modal <dialog> (MDN <dialog>, SOURCES.md), so the page behind is inert, Escape closes it and focus goes back to the
// button. Four steps, one at a time, after the WAI-ARIA APG Carousel pattern (14c-6d, answer 42): each a slide named "N
// of 4", announced politely as it changes, with Previous and Next, which don't move focus; Next becomes Close on the last
// step. The words are neutral (docs/milestones/M14-14c-2-neutral-words.md).
import { useId, useRef, useState } from "react";
import { SUBSTRING_BONUS_LETTER_POINTS, SUBSTRING_ROUNDS } from "@/config/tunables";
import kit from "./kit.module.css";
import styles from "./how-to-play.module.css";

// Game 2's four steps, as the human approved them word for word (docs/milestones/M14-14c-9-plain-game-2.md, answer 8). The
// 20 seconds are judged in SQL as well (supabase/migrations/20261107105151_game_2_rounds.sql), so they have no constant.
export const GAME_2_STEPS = [
  `Each round gives you a few letters. Type a word that holds them together, in that order: for "cks", "rocks" or "backspace". ${SUBSTRING_ROUNDS.length} rounds, one run a day.`,
  "You get 20 seconds a round. Not a word, missing the letters, or used already? Try again. The clock keeps going.",
  "Out of time? That round scores nothing, but your run goes on to the next.",
  `Longer words score more, and each word with the day's bonus letter earns ${SUBSTRING_BONUS_LETTER_POINTS} more. At the end, every different letter you've used adds to your bonus.`,
];

// Offbeat's four steps (docs/milestones/M23-23d-the-screens.md, Design). The clock's 20 seconds, the time each tier adds
// and its points are judged in SQL (private.clock_start_ms, clock_added_ms, clock_points), so no number is typed here.
export const CLOCK_STEPS = [
  "One clock runs for the whole run. Name answers to each question: every answer adds time to the clock, and the rarer the answer, the more time and the more points.",
  "Type an answer and press Enter. Text that isn't on the list, or an answer you've already said, adds nothing.",
  "Next opens the next question, and there is no going back. On the last question, Finish ends your run.",
  "When the clock reaches zero, your run is over. Your points are the total of your answers. The result lists each one with how rare it was, shows some you missed, and lets you share your run as a row of coloured squares.",
];

// steps: the game's four (CLOCK_STEPS, GAME_2_STEPS).
export function HowToPlay({ steps }: { steps: readonly string[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [at, setAt] = useState(0);
  function open() {
    setAt(0);
    dialog.current!.showModal();
  }
  const close = () => dialog.current!.close();
  const last = at === steps.length - 1;
  return (
    <>
      <button type="button" onClick={open}>
        How to play
      </button>
      <dialog ref={dialog} aria-labelledby={title} className={styles.dialog}>
        <div className={styles.top}>
          <h2 id={title} className={styles.title}>
            How to play
          </h2>
          <button type="button" className={kit.close} aria-label="Close" onClick={close}>
            ×
          </button>
        </div>
        <div role="group" aria-roledescription="carousel" aria-label="Rules">
          <div className={styles.steps} aria-live="polite" aria-atomic="false">
            {steps.map((text, i) => (
              <p key={text} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${steps.length}`} hidden={i !== at}>
                {text}
              </p>
            ))}
          </div>
          <div className={styles.nav}>
            {/* Unavailable on the first step, and still in its place, so the row doesn't shift. */}
            <button type="button" aria-disabled={at === 0} onClick={() => at > 0 && setAt(at - 1)}>
              Previous
            </button>
            <span className={styles.place} aria-hidden="true">
              {at + 1} of {steps.length}
            </span>
            <button type="button" className={kit.primary} onClick={last ? close : () => setAt(at + 1)}>
              {last ? "Close" : "Next"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
