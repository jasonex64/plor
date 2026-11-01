"use client";

// Reactions on a comment or a friend's run (docs/milestones/M08-comments-and-reactions.md, 8b): one per player from the
// set (D3). Since 14b-13 (docs/milestones/M14-14b-13-reactions-menu.md) a comment or run shows only the reactions people
// used, as small text with the player's own tinted, and its ⋯ opens a popover of the set, the player's own pressed.
// Picking another replaces it; picking it again removes it. A pick shows at once and is held for Undo
// (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b), so no button waits.
import { REACTIONS } from "@/config/tunables";
import type { Emoji, Reactions as ReactionsData } from "@/reactions/reactions";
import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import { useDismiss } from "./dismiss";
import kit from "./kit.module.css";
import styles from "./reactions.module.css";

// The reactions used, in the set's order, each with its count: nothing if there are none (answer 2). The player's own is
// tinted, edged and said to be theirs, so it isn't colour alone (answer 6; WCAG 2.2 1.4.1). below: on a row's second
// line (kit .below), as under a comment or a friend's run. Kept mounted while there are none, so the first reaction pops.
export function Reactions({ reactions, below = false }: { reactions: ReactionsData; below?: boolean }) {
  const grown = useGrown(reactions);
  if (reactions.counts.length === 0) return null;
  const summary = (
    <span className={styles.summary}>
      {REACTIONS.filter((emoji) => reactions.counts.some((c) => c.emoji === emoji && c.count > 0)).map((emoji, i) => {
        const count = reactions.counts.find((c) => c.emoji === emoji)!.count;
        const mine = reactions.mine === emoji;
        return (
          <Fragment key={emoji}>
            {/* Read "😂 1, ❤️ 2", not run together; between the counts, so each count's own text is as it was
                (docs/milestones/M14-14b-18-headings-today-invites-words.md). */}
            {i > 0 && <span className="sr-only">, </span>}
            <span className={mine ? `${styles.used} ${styles.mine}` : styles.used}>
              {/* Keyed by how often its count has grown, so each new reaction pops it in again (14b-10b, answer 12). */}
              <span key={grown[emoji] ?? 0} className={grown[emoji] ? `${styles.emoji} ${kit.pop}` : styles.emoji}>
                {emoji}
              </span>
              {` ${count}`}
              {mine && <span className="sr-only">, yours</span>}
            </span>
          </Fragment>
        );
      })}
    </span>
  );
  return below ? <div className={kit.below}>{summary}</div> : summary;
}

// How many times each emoji's count has grown since the reactions were first shown: a reaction added, the player's own or
// one that arrived (14b-10b, answer 12). The first counts shown pop nothing.
function useGrown(reactions: ReactionsData): Partial<Record<Emoji, number>> {
  const [grown, setGrown] = useState<Partial<Record<Emoji, number>>>({});
  const before = useRef<Map<Emoji, number> | null>(null);
  useEffect(() => {
    const now = new Map(reactions.counts.map((c) => [c.emoji, c.count]));
    const last = before.current;
    before.current = now;
    if (!last) return;
    const more = REACTIONS.filter((e) => (now.get(e) ?? 0) > (last.get(e) ?? 0));
    if (more.length > 0) setGrown((g) => Object.fromEntries([...Object.entries(g), ...more.map((e) => [e, (g[e] ?? 0) + 1])]));
  }, [reactions]);
  return grown;
}

// An action under the emoji in the popover: a comment's Delete or Report.
export type MenuAction = { name: string; run: () => void };

// The ⋯ at a comment's or run's top right (answers 1, 3 and 5), a disclosure button (WAI-ARIA APG Disclosure): it shows
// a popover right under it, of the set without counts (answer 8) when the player can react, then the actions. A pick
// closes it back on the ⋯ (answer 7); so do Escape, a press outside, focus leaving and another ⋯ opening (dismiss.ts).
export function ReactMenu({
  label,
  reactions,
  onReact,
  actions = [],
}: {
  label: string;
  reactions: ReactionsData;
  onReact?: (emoji: Emoji | null) => void;
  actions?: MenuAction[];
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, root, button);
  const pick = (run: () => void) => () => {
    setOpen(false);
    button.current?.focus();
    run();
  };
  return (
    <div ref={root} className={styles.menu}>
      <button
        ref={button}
        type="button"
        className={styles.more}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panel : undefined}
        onClick={() => setOpen(!open)}
      >
        <Dots />
      </button>
      {open && (
        <div id={panel} className={`${kit.card} ${styles.panel} ${kit.pop}`}>
          {onReact && (
            <div role="group" aria-label="Reactions" className={styles.emojis}>
              {REACTIONS.map((emoji) => {
                const mine = reactions.mine === emoji;
                return (
                  <button key={emoji} type="button" className={styles.pick} aria-pressed={mine} onClick={pick(() => onReact(mine ? null : emoji))}>
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}
          {actions.map((a) => (
            <button key={a.name} type="button" className={styles.action} onClick={pick(a.run)}>
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Three dots, drawn on the tab icons' 24px grid at their 22px size (shell.tsx), so the ⋯ is the same in every font.
function Dots() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

// What the toast says for a pick (14b-6, answer 19): the emoji chosen, or the one taken away.
export function reactionText(reactions: ReactionsData, emoji: Emoji | null): string {
  return emoji ? `${emoji} added` : `${reactions.mine} removed`;
}
