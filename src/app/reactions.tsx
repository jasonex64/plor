"use client";

// Reactions on a comment or a friend's run (docs/milestones/M08-comments-and-reactions.md, 8b): one button per emoji
// in the set (D3) with its count, the player's own pressed. Tapping another replaces it; tapping it again removes it.
// A tap shows at once and is held for Undo (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b), so no button waits.
import { REACTIONS } from "@/config/tunables";
import type { Emoji, Reactions as ReactionsData } from "@/reactions/reactions";
import { useEffect, useRef, useState } from "react";
import kit from "./kit.module.css";
import styles from "./reactions.module.css";

// Without onReact (a past day, or the player's own run) the counts are shown as text, and nothing if there are none.
export function Reactions({ reactions, onReact }: { reactions: ReactionsData; onReact?: (emoji: Emoji | null) => void }) {
  const grown = useGrown(reactions);
  if (!onReact) return reactions.counts.length > 0 && <span>{reactions.counts.map((c) => `${c.emoji} ${c.count}`).join(" ")}</span>;
  return (
    <span role="group" aria-label="Reactions" className={styles.group}>
      {REACTIONS.map((emoji) => {
        const count = reactions.counts.find((c) => c.emoji === emoji)?.count ?? 0;
        const mine = reactions.mine === emoji;
        return (
          <button key={emoji} type="button" className={`${kit.chip} ${styles.reaction}`} aria-pressed={mine} onClick={() => onReact(mine ? null : emoji)}>
            {/* Keyed by how often its count has grown, so each new reaction pops it in again (14b-10b, answer 12). */}
            <span key={grown[emoji] ?? 0} className={grown[emoji] ? `${styles.emoji} ${kit.pop}` : styles.emoji}>
              {emoji}
            </span>
            {/* At 0, room for a count that isn't shown or read, so a chip is as wide before its count appears as
                after (14b-6b). */}
            {count > 0 ? <span className={styles.count}>{` ${count}`}</span> : <span className={styles.none} />}
          </button>
        );
      })}
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

// What the toast says for a tap (answer 19): the emoji chosen, or the one taken away.
export function reactionText(reactions: ReactionsData, emoji: Emoji | null): string {
  return emoji ? `${emoji} added` : `${reactions.mine} removed`;
}
