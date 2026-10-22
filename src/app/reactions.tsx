"use client";

// Reactions on a comment or a friend's run (docs/milestones/M08-comments-and-reactions.md, 8b): one button per emoji
// in the set (D3) with its count, the player's own pressed. Tapping another replaces it; tapping it again removes it.
// Plain UI; the look is M14.
import { REACTIONS } from "@/config/tunables";
import type { Emoji, Reactions as ReactionsData } from "@/reactions/reactions";

// Without onReact (a past day, or the player's own run) the counts are shown as text, and nothing if there are none.
export function Reactions({ reactions, busy, onReact }: { reactions: ReactionsData; busy?: boolean; onReact?: (emoji: Emoji | null) => void }) {
  if (!onReact) return reactions.counts.length > 0 && <span>{reactions.counts.map((c) => `${c.emoji} ${c.count}`).join(" ")}</span>;
  return (
    <span role="group" aria-label="Reactions">
      {REACTIONS.map((emoji) => {
        const count = reactions.counts.find((c) => c.emoji === emoji)?.count ?? 0;
        const mine = reactions.mine === emoji;
        return (
          <button key={emoji} type="button" aria-pressed={mine} disabled={busy} onClick={() => onReact(mine ? null : emoji)}>
            {emoji}
            {count > 0 && ` ${count}`}
          </button>
        );
      })}
    </span>
  );
}
