"use client";

// Reactions on a comment or a friend's run (docs/milestones/M08-comments-and-reactions.md, 8b): one per player from the
// set (D3). Since 14b-13 (docs/milestones/M14-14b-13-reactions-menu.md) a comment or run shows only the reactions people
// used, as small text with the player's own tinted, and its ⋯ opens a popover of the set, the player's own pressed.
// Picking another replaces it; picking it again removes it. A pick shows at once and is held for Undo
// (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b), so no button waits.
import { LONG_PRESS_MS, REACTIONS } from "@/config/tunables";
import type { Emoji, Reactions as ReactionsData } from "@/reactions/reactions";
import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useDismiss } from "./dismiss";
import kit from "./kit.module.css";
import styles from "./reactions.module.css";

// The reactions used, in the set's order, each with its count: nothing if there are none (answer 2). The player's own is
// tinted, edged and said to be theirs, so it isn't colour alone (answer 6; WCAG 2.2 1.4.1). below: on a row's second
// line (kit .below), as under a comment or a friend's run. name: the group's, for a line whose visible label names it.
// Kept mounted while there are none, so the first reaction pops.
export function Reactions({ reactions, below = false, name = "Reactions" }: { reactions: ReactionsData; below?: boolean; name?: string }) {
  const grown = useGrown(reactions);
  if (reactions.counts.length === 0) return null;
  const summary = (
    // Named for screen readers, "Reactions: 😂 1, ❤️ 2" (docs/milestones/M14-14b-21-screen-readers.md, answer 6).
    <span role="group" aria-label={name} className={below ? styles.summary : `${styles.summary} ${styles.line}`}>
      {REACTIONS.filter((emoji) => reactions.counts.some((c) => c.emoji === emoji && c.count > 0)).map((emoji, i) => {
        const { count, names } = reactions.counts.find((c) => c.emoji === emoji)!;
        const mine = reactions.mine === emoji;
        return (
          <Fragment key={emoji}>
            {/* Read "😂 1, ❤️ 2", not run together; between the counts, so each count's own text is as it was
                (docs/milestones/M14-14b-18-headings-today-invites-words.md). */}
            {i > 0 && <span className="sr-only">, </span>}
            <Used mine={mine} who={[...(mine ? ["You"] : []), ...names]}>
              {/* Keyed by how often its count has grown, so each new reaction pops it in again (14b-10b, answer 12). */}
              <span key={grown[emoji] ?? 0} className={grown[emoji] ? `${styles.emoji} ${kit.pop}` : styles.emoji}>
                {emoji}
              </span>
              {` ${count}`}
              {mine && <span className="sr-only">, yours</span>}
            </Used>
          </Fragment>
        );
      })}
    </span>
  );
  // On a row's second line the names box spans that line (kit .tip), so the line holds it.
  return below ? <div className={`${kit.below} ${styles.line}`}>{summary}</div> : summary;
}

// One reaction used, and who used it (docs/milestones/M20-design-rules-and-clean-up.md, 20j; answers 28 and 51 to 53):
// the names, "You" first then A to Z, show in the kit's names box under the line (kit.module.css .tip) while the pointer
// is on it or it has focus, and on a phone once a finger has held it LONG_PRESS_MS; Escape or a press elsewhere hides
// them (WCAG 2.2 1.4.13: dismissible, hoverable, persistent). They are its description, so a screen reader reads them on
// focus whether they show or not; they show on a keyboard's focus only (:focus-visible), as a tap that focuses the chip on
// a phone would otherwise show them at once, not after the hold (20j's review). A finger that starts to scroll cancels the hold (the browser's pointercancel). The box
// is the chip's sibling, so the chip's text is its own; both sit in one span, so the pointer can move onto the box.
function Used({ mine, who, children }: { mine: boolean; who: string[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const tip = useId();
  const root = useRef<HTMLSpanElement>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const release = () => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  };
  useEffect(() => release, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPress = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPress);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPress);
    };
  }, [open]);
  return (
    <span
      ref={root}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setOpen(false);
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== "touch") return;
        release();
        hold.current = setTimeout(() => setOpen(true), LONG_PRESS_MS);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <span tabIndex={0} aria-describedby={tip} className={mine ? `${styles.used} ${styles.mine}` : styles.used} onFocus={(e) => setOpen(e.currentTarget.matches(":focus-visible"))} onBlur={() => setOpen(false)}>
        {children}
      </span>
      <span role="tooltip" id={tip} className={kit.tip} hidden={!open}>
        {who.join(", ")}
      </span>
    </span>
  );
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
  reactions?: ReactionsData;
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
                const mine = reactions?.mine === emoji;
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
