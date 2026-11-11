"use client";

// The play frame both games share (docs/milestones/M14-14c-8-plain-game-1.md, Plan 2; human, 2026-11-10: "Full-screen play
// with a close button"): while a run is in play the shell's top bar, tab bar or sidebar and clock bar are hidden
// (body[data-game], src/app/body-flag.ts; globals.css and shell.module.css hold the rules) and an × goes back to where
// the run started. A fixed layer over the window that scrolls on its own, since the body doesn't while the flag is set.
import { useEffect, useRef, type ReactNode } from "react";
import { useBodyFlag } from "./body-flag";
import { HowToPlay } from "./how-to-play";
import kit from "./kit.module.css";
import styles from "./play-frame.module.css";

// steps: the game's How to play steps. out: what the × says to screen readers and where it goes ("Back to Today", "Back to Puzzles"); onLeave: what it does.
// Focus: the shell's bars leave the page with the frame, so a control that had focus may be gone; if nothing inside the
// frame has it once it shows, the × takes it, so focus is never lost (WCAG 2.2 2.4.3, 2.4.11). A control inside that
// focuses itself, such as the answer box, has already done so by then.
export function PlayFrame({ steps, out, onLeave, children }: { steps: readonly string[]; out: string; onLeave: () => void; children: ReactNode }) {
  useBodyFlag("game", true);
  const root = useRef<HTMLDivElement>(null);
  const leave = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!root.current!.contains(document.activeElement)) leave.current!.focus();
  }, []);
  return (
    <div ref={root} className={styles.frame}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <HowToPlay steps={steps} className={kit.small} />
          <button ref={leave} type="button" className={kit.close} aria-label={out} onClick={onLeave}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// A message a screen reader reads out once (WCAG 2.2 4.1.3, docs/milestones/M14-14c-8-plain-game-1.md, Plan 3). The
// region is on the page empty first and the text is put in after, since screen readers announce a change in a region
// that was there, and not always a region that arrives with its text. Shown to them only.
export function StatusMessage({ text }: { text: string }) {
  const region = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    region.current!.textContent = text;
  }, [text]);
  return <p ref={region} role="status" className="sr-only" />;
}
