"use client";

// Today's game cards (docs/milestones/M16-16f-the-shared-pieces.md, 16f-2; the human's answers 5, 7, 16, 25, 40 and 42).
// On phones one card is in front, 82% of the row, with a strip of the next, under a row "Today's games" with Previous and
// Next and "1 of 2"; once the cards' own row is 768px wide the two sit side by side with no arrows (the human, 2026-11-14:
// "Side by side only with room": beside the sidebar a tablet's row is too narrow for two names). A day with an approved day in only one game shows
// that card alone (src/app/today-games.ts). The row follows the WAI-ARIA APG Carousel pattern as How to play's steps do
// (src/app/how-to-play.tsx): a carousel group, each card a slide named "N of 2", the arrows' state in aria-disabled.
// The cards scroll (CSS scroll-snap), so a swipe moves them too; the place and the arrows read the scroll position.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { SubstringRun } from "@/game/substring-state";
import { FINISHED, type RunStatus } from "@/game/status";
import { api } from "@/lib/api-client";
import { GAME, SUBSTRINGS } from "@/platform/game";
import { BannerSkeleton, TodayBanner } from "./game";
import kit from "./kit.module.css";
import { errorText } from "./messages";
import { runRoutes, substringRoutes } from "./run-routes";
import { todayCards } from "./today-games";
import { FragmentsBanner } from "./today-fragments";
import styles from "./today-cards.module.css";

type OffbeatState = { run: { status: RunStatus; msToReset: number } } | { run: null; msToReset: number };
type Days = { offbeat: OffbeatState; fragments: SubstringRun | null };

export function TodayCards({
  skip,
  day,
  timeUps,
  onOver,
  onDayOver,
}: {
  skip: boolean;
  day: number;
  timeUps: number;
  onOver: (over: boolean) => void;
  onDayOver: () => void;
}) {
  const [days, setDays] = useState<Days | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Read again on the new day, when the clock bar's time runs out and when Today shows again, so the card in front
  // follows what the player has played.
  useEffect(() => {
    Promise.all([api<OffbeatState>(runRoutes("account").state, { method: "GET" }), api<{ run: SubstringRun | null }>(substringRoutes("account").state, { method: "GET" })]).then(
      ([offbeat, fragments]) => {
        setDays({ offbeat, fragments: fragments.run });
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, [day, timeUps]);

  const { cards, front } = days
    ? todayCards(days.offbeat.run && { over: FINISHED.includes(days.offbeat.run.status) }, days.fragments && { over: days.fragments.status === "finished" })
    : { cards: [], front: 0 };
  // Offbeat's banner sets the timer for the reset when it's there; Fragments' state has no time to it.
  const msToReset = days && cards[0] !== GAME.id ? (days.offbeat.run ? days.offbeat.run.msToReset : days.offbeat.msToReset) : null;
  useEffect(() => {
    if (msToReset === null) return;
    const timer = setTimeout(onDayOver, msToReset);
    return () => clearTimeout(timer);
  }, [msToReset, onDayOver]);

  const shown = cards.map((card) =>
    card === GAME.id ? (
      <section key={card} id="offbeat" aria-label={GAME.name}>
        <TodayBanner key={`game-${day}-${timeUps}`} skip={skip} onOver={onOver} onDayOver={onDayOver} />
      </section>
    ) : (
      <section key={card} aria-label={SUBSTRINGS.name}>
        <FragmentsBanner run={days!.fragments!} />
      </section>
    ),
  );
  if (error) return <p role="alert">{error}</p>;
  if (!days) return <BannerSkeleton />;
  return shown.length === 1 ? shown[0] : <Carousel front={front}>{shown}</Carousel>;
}

function Carousel({ front, children }: { front: number; children: ReactNode[] }) {
  // Wide: the row itself, not the window, is at least the app's tablet width (src/app/min-width.ts's 768px).
  const [wide, setWide] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = row.current!;
    const observer = new ResizeObserver(() => setWide(el.clientWidth >= 768));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const label = useId();
  const strip = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(front);

  // Where a card's left edge scrolls to: the last can't reach the strip's start, so it ends at the strip's end.
  const target = useCallback((i: number) => {
    const el = strip.current!;
    return Math.min((el.children[i] as HTMLElement).offsetLeft, el.scrollWidth - el.clientWidth);
  }, []);
  // On opening, and each time the day is read again, the card in front is in place with no scrolling to it; the scroll
  // event then says where the strip is, as it does for a swipe.
  useLayoutEffect(() => {
    if (!wide) strip.current!.scrollTo({ left: target(front), behavior: "instant" });
  }, [front, wide, target]);

  function placed() {
    const left = strip.current!.scrollLeft;
    setAt(children.map((_, i) => Math.abs(target(i) - left)).reduce((best, gap, i, gaps) => (gap < gaps[best] ? i : best), 0));
  }
  const go = (i: number) => {
    if (i >= 0 && i < children.length) strip.current!.scrollTo({ left: target(i) });
  };

  return (
    <div ref={row} role={wide ? undefined : "group"} aria-roledescription={wide ? undefined : "carousel"} aria-labelledby={wide ? undefined : label} className={wide ? `${styles.cards} ${styles.wide}` : styles.cards}>
      {!wide && (
        <div className={styles.top}>
          <p id={label} className={styles.label}>
            Today&apos;s games
          </p>
          <div className={styles.nav}>
            {/* Unavailable at an end, and still in its place, so the row doesn't shift (as How to play's Previous). */}
            <button type="button" className={kit.small} aria-label="Previous game" aria-disabled={at === 0} onClick={() => go(at - 1)}>
              ‹
            </button>
            <span className={styles.place} aria-hidden="true">
              {at + 1} of {children.length}
            </span>
            <button type="button" className={kit.small} aria-label="Next game" aria-disabled={at === children.length - 1} onClick={() => go(at + 1)}>
              ›
            </button>
          </div>
        </div>
      )}
      <div ref={strip} className={styles.strip} onScroll={placed}>
        {children.map((card, i) => (
          <div key={i} role={wide ? undefined : "group"} aria-roledescription={wide ? undefined : "slide"} aria-label={wide ? undefined : `${i + 1} of ${children.length}`} className={styles.slide}>
            {card}
          </div>
        ))}
      </div>
    </div>
  );
}
