"use client";

// Reactions on a comment or a friend's run (docs/milestones/M08-comments-and-reactions.md, 8b): one button per emoji
// in the set (D3) with its count, the player's own pressed. Tapping another replaces it; tapping it again removes it.
// A tap shows at once and is held for Undo (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b), so no button waits.
import { REACTIONS } from "@/config/tunables";
import type { Emoji, Reactions as ReactionsData } from "@/reactions/reactions";
import kit from "./kit.module.css";
import styles from "./reactions.module.css";

// Without onReact (a past day, or the player's own run) the counts are shown as text, and nothing if there are none.
export function Reactions({ reactions, onReact }: { reactions: ReactionsData; onReact?: (emoji: Emoji | null) => void }) {
  if (!onReact) return reactions.counts.length > 0 && <span>{reactions.counts.map((c) => `${c.emoji} ${c.count}`).join(" ")}</span>;
  return (
    <span role="group" aria-label="Reactions" className={styles.group}>
      {REACTIONS.map((emoji) => {
        const count = reactions.counts.find((c) => c.emoji === emoji)?.count ?? 0;
        const mine = reactions.mine === emoji;
        return (
          <button key={emoji} type="button" className={`${kit.chip} ${styles.reaction}`} aria-pressed={mine} onClick={() => onReact(mine ? null : emoji)}>
            {emoji}
            {/* At 0, room for a count that isn't shown or read, so a chip is as wide before its count appears as
                after (14b-6b). */}
            {count > 0 ? ` ${count}` : <span className={styles.none} />}
          </button>
        );
      })}
    </span>
  );
}

// What the toast says for a tap (answer 19): the emoji chosen, or the one taken away.
export function reactionText(reactions: ReactionsData, emoji: Emoji | null): string {
  return emoji ? `${emoji} added` : `${reactions.mine} removed`;
}
