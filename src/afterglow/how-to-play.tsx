"use client";

// How to play (docs/milestones/M14-14c-6-afterglow-in-play.md, 14c-6d): a button that opens a panel over the page it's
// on, before today's run has started, on the game screen and on Today's banner (answers 30, 34, 40). The panel is a
// modal <dialog> (MDN <dialog>, SOURCES.md), so the page behind is inert, Escape closes it and focus goes back to the
// button; it has Afterglow's look on its plain dark (answers 32, 35). Four chunks, one at a time (answer 38), after the
// WAI-ARIA APG Carousel pattern (answer 42): each a slide named "N of 4", announced politely as it changes, with ‹ and ›
// that don't move focus, so › stays the one button and becomes Close on the last chunk (answers 31, 36).
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { AFTERGLOW, LETTER_SCHEDULE, POINTS_PER_QUESTION, QUESTIONS_PER_DAY } from "@/config/tunables";
import { handjet } from "./font";
import { typeScale } from "./scene";
import styles from "./afterglow.module.css";

// The questions where a letter is taken, from tunables.ts: "2, 4, 5 and 7", with no comma before "and", as the human
// approved the words (answer 43), which British English's list leaves out.
const STEALS = new Intl.ListFormat("en-GB", { type: "conjunction" }).format(
  LETTER_SCHEDULE.flatMap((tier, i) => (tier === null ? [] : [String(i + 1)])),
);
const [FIRST, LAST] = [POINTS_PER_QUESTION[0], POINTS_PER_QUESTION[POINTS_PER_QUESTION.length - 1]];
// The human's four chunks (answers 38, 43), today's rules cut short (answer 33). The 20 seconds are judged in SQL
// (private.question_deadline), so they have no constant here.
const CHUNKS = [
  `The host has picked a few answers to each question. Say one and your run ends. ${QUESTIONS_PER_DAY} questions, one run a day.`,
  "You get 20 seconds for each question. A typo, or not a real answer? Try again. The clock keeps going.",
  `On questions ${STEALS} a letter is taken. Answer without it.`,
  `Not the host's? You're safe, and the rarer your answer, the bigger your bonus. Each question is worth more: ${FIRST} points for the first, ${LAST} for the last. Run out of time and your run ends.`,
];

// className: the opening button's look where it sits: Today's smaller button; on the game screen the plain button.
export function HowToPlay({ className }: { className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [at, setAt] = useState(0);
  // The panel takes the question box's width at the scene's type scale, for the window as it is.
  const [k, setK] = useState(1);
  useEffect(() => {
    const onResize = () => setK(typeScale());
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, []);
  function open() {
    setAt(0);
    setK(typeScale());
    dialog.current!.showModal();
  }
  const close = () => dialog.current!.close();
  const last = at === CHUNKS.length - 1;
  const size = { "--k": k, "--prompt-w": `${AFTERGLOW.PROMPT_W}px` } as CSSProperties;
  return (
    <>
      <button type="button" className={className} onClick={open}>
        How to play
      </button>
      <dialog ref={dialog} aria-labelledby={title} className={`${styles.howto} ${handjet.variable}`} style={size}>
        <div className={styles.howtoTop}>
          <h2 id={title} className={styles.howtoTitle}>
            How to play
          </h2>
          <button type="button" className={styles.howtoClose} aria-label="Close" onClick={close}>
            ×
          </button>
        </div>
        <div role="group" aria-roledescription="carousel" aria-label="Rules">
          <div className={styles.howtoChunks} aria-live="polite" aria-atomic="false">
            {CHUNKS.map((text, i) => (
              <p key={text} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${CHUNKS.length}`} hidden={i !== at}>
                {text}
              </p>
            ))}
          </div>
          <div className={styles.howtoNav}>
            {/* Unavailable on the first chunk, and still in its place, so the row doesn't shift. */}
            <button type="button" aria-label="Previous" aria-disabled={at === 0} onClick={() => at > 0 && setAt(at - 1)}>
              ‹
            </button>
            <span className={styles.howtoDots} aria-hidden="true">
              {CHUNKS.map((text, i) => (
                <span key={text} data-at={i === at ? "" : undefined}>
                  •
                </span>
              ))}
            </span>
            <button type="button" aria-label={last ? undefined : "Next"} onClick={last ? close : () => setAt(at + 1)}>
              {last ? "Close" : "›"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
