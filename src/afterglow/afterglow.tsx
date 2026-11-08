"use client";

// Afterglow on the page (docs/milestones/M14-14c-6-afterglow-in-play.md, 14c-6b-1): the scene full screen over the
// whole window, the shell's bars, sidebar and clock bar hidden while it shows (answers 3, 10; body[data-game],
// src/app/body-flag.ts). The markup is the mock's page (RIFF-mocks `themes/festival/page.html` at fcc11e4), its ids
// as data-part names, since the page already has a #result; the scene (./scene.ts) owns everything inside it.
import localFont from "next/font/local";
import { memo, useEffect, useRef, type ReactNode } from "react";
import { GAME } from "@/platform/game";
import { useBodyFlag } from "@/app/body-flag";
import { startScene, type Io, type Start } from "./scene";
import styles from "./afterglow.module.css";

// Afterglow's one font (docs/milestones/M14-14c-4-five-themes-rebuilt.md: Handjet at weight 400, "Handjet heavier"),
// the mock's Latin file with its OFL licence beside it (src/app/fonts/OFL-Handjet.txt; licence read in 14c-4), a
// variable font. Blocked, as the mock had it, so no text shows in the fallback before the scene measures it.
const handjet = localFont({ src: "../app/fonts/Handjet.woff2", weight: "100 900", display: "block", variable: "--afterglow-font" });

// The mock's markup, drawn once: the scene writes into it, and React never renders it again. out: what the × says to
// screen readers, where it goes.
const Stage = memo(function Stage({ out }: { out: string }) {
  return (
    <>
      <canvas data-part="screen" className={styles.screen} aria-hidden="true" />
      <div className={styles.ui}>
        <h1 data-part="name" className={styles.name}>
          {GAME.name}
        </h1>
        <div data-part="hud" className={styles.hud} aria-label="Score">
          <span data-part="hudQ" />
          <b data-part="hudScore" />
        </div>
        <section data-part="ask" className={styles.window} aria-label="Question" hidden>
          <div className={styles.meta}>
            <span data-part="qnum" />
            {/* The seconds left, in the timer's own text for screen readers (14b-21). */}
            <span role="timer">
              <b data-part="secs" />
              <span aria-hidden="true"> s</span>
              <span className="sr-only"> seconds left</span>
            </span>
          </div>
          <p data-part="qtext" className={styles.q} />
          <form data-part="form" className={styles.answer}>
            <input data-part="answer" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Your answer" />
            <button type="submit" data-part="submit" />
          </form>
          <p data-part="letters" className={styles.letters} />
          <p data-part="note" role="status" className={styles.note} hidden />
        </section>
        <p data-part="word" className={styles.word} aria-hidden="true" hidden />
        <section data-part="result" className={styles.result} aria-labelledby="afterglow-tier" hidden>
          <h2 data-part="rTier" id="afterglow-tier" className={styles.tier} />
          <p data-part="rAns" className={styles.ans} />
          <ol data-part="rRecap" className={styles.recap} aria-label="Your answers" hidden />
          <p data-part="rHost" className={styles.host} hidden />
          <p data-part="rPts" className={styles.pts} />
          <p data-part="rFlav" className={styles.flav} />
          <button type="button" data-part="rBtn" className={styles.go} hidden />
        </section>
        <p data-part="lett" className={styles.lett} aria-hidden="true" hidden />
        <p data-part="caption" className={styles.caption} aria-hidden="true" hidden />
        <p data-part="verdict" className="sr-only" aria-live="polite" />
        {/* The way out: a × that screen readers hear as where it goes, Back to Today (answer 22), shown while no fuse burns
            (answer 5). */}
        <button type="button" data-part="out" className={styles.out} aria-label={out} hidden>
          ×
        </button>
      </div>
    </>
  );
});

// start: where the run picks up, read when the scene starts, again each time the page shows it (a page Next.js keeps
// hidden stops its effects). io: what the scene's moves do, the latest each time. notices: the page's own lines over the
// scene, such as an error, the past-midnight note and a test run's label. out: where the × goes, as screen readers hear it.
export function Afterglow({ start, io, notices, out }: { start: () => Start; io: Io; notices: ReactNode; out: string }) {
  useBodyFlag("game", true);
  const root = useRef<HTMLDivElement>(null);
  const latest = useRef({ start, io });
  useEffect(() => {
    latest.current = { start, io };
  });
  useEffect(() => {
    const now = () => latest.current.io;
    return startScene(root.current!, handjet.style.fontFamily, latest.current.start(), {
      answer: (text) => now().answer(text),
      next: () => now().next(),
      timeUp: () => now().timeUp(),
      seeResults: () => now().seeResults(),
      leave: () => now().leave(),
      fault: (err) => now().fault(err),
    });
  }, []);
  return (
    <div ref={root} className={`${styles.afterglow} ${handjet.variable}`}>
      <Stage out={out} />
      <div className={styles.notices}>{notices}</div>
    </div>
  );
}

// Before the run's state has loaded, on the way into a run: the scene's dark, full screen, so the page doesn't show its
// cards for a moment first (src/app/to-play.ts).
export function AfterglowLoading() {
  useBodyFlag("game", true);
  return (
    <div className={styles.afterglow} role="status">
      <span className="sr-only">Loading {GAME.name}</span>
    </div>
  );
}
