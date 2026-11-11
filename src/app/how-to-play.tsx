"use client";

// How to play (14c-6d; plain in docs/milestones/M14-14c-8-plain-game-1.md): a
// button that opens a panel over the page it's on, on Today's banner and over the game, for both games. The panel is a
// modal <dialog> (MDN <dialog>, SOURCES.md), so the page behind is inert, Escape closes it and focus goes back to the
// button. Four steps, one at a time, after the WAI-ARIA APG Carousel pattern (14c-6d, answer 42): each a slide named "N
// of 4", announced politely as it changes, with Previous and Next, which don't move focus; Next becomes Close on the last
// step. The words are neutral (docs/milestones/M14-14c-2-neutral-words.md).
import { useId, useRef, useState } from "react";
import { LETTER_SCHEDULE, POINTS_PER_QUESTION, QUESTIONS_PER_DAY } from "@/config/tunables";
import kit from "./kit.module.css";
import styles from "./how-to-play.module.css";

// The questions where a letter is taken, from tunables.ts: "2, 4, 5 and 7", with no comma before "and", as the human
// approved the words (14c-6d, answer 43), which British English's list leaves out.
const TAKEN = new Intl.ListFormat("en-GB", { type: "conjunction" }).format(
  LETTER_SCHEDULE.flatMap((tier, i) => (tier === null ? [] : [String(i + 1)])),
);
const [FIRST, LAST] = [POINTS_PER_QUESTION[0], POINTS_PER_QUESTION[POINTS_PER_QUESTION.length - 1]];
// The same four steps as 14c-6d's (answers 38, 43), in the app's words. The 20 seconds are judged in SQL
// (private.question_deadline), so they have no constant here.
const STEPS = [
  `The host has picked a few answers to each question. Say one of them and you're caught: your run ends. ${QUESTIONS_PER_DAY} questions, one run a day.`,
  "You get 20 seconds for each question. A typo, or not a real answer? Try again. The clock keeps going.",
  `On questions ${TAKEN} a letter is taken. Answer without it.`,
  `Not one of the host's? You're safe, and the rarer your answer, the bigger your bonus. Each question is worth more: ${FIRST} points for the first, ${LAST} for the last. Run out of time and your run ends.`,
];

// className: the opening button's look where it sits: the kit's small button on Today and in the play frame, a plain
// button on the game screen.
export function HowToPlay({ className }: { className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [at, setAt] = useState(0);
  function open() {
    setAt(0);
    dialog.current!.showModal();
  }
  const close = () => dialog.current!.close();
  const last = at === STEPS.length - 1;
  return (
    <>
      <button type="button" className={className} onClick={open}>
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
            {STEPS.map((text, i) => (
              <p key={text} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${STEPS.length}`} hidden={i !== at}>
                {text}
              </p>
            ))}
          </div>
          <div className={styles.nav}>
            {/* Unavailable on the first step, and still in its place, so the row doesn't shift. */}
            <button type="button" className={kit.small} aria-disabled={at === 0} onClick={() => at > 0 && setAt(at - 1)}>
              Previous
            </button>
            <span className={styles.place} aria-hidden="true">
              {at + 1} of {STEPS.length}
            </span>
            <button type="button" className={`${kit.small} ${kit.primary}`} onClick={last ? close : () => setAt(at + 1)}>
              {last ? "Close" : "Next"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
