// A reaction row as it will be once the player's choice is sent, shown at once (docs/milestones/
// M14-14b-6-feel-and-polish.md, 14b-6b): the player's old emoji loses one, the new one gains one, and the counts keep
// the set's order and only the emojis used, as the server sends them (src/reactions/reactions.ts).
import { REACTIONS } from "@/config/tunables";
import type { Emoji, Reactions } from "./reactions";

export function choose(reactions: Reactions, emoji: Emoji | null): Reactions {
  const counts = new Map(reactions.counts.map((c) => [c.emoji, c.count]));
  if (reactions.mine) counts.set(reactions.mine, (counts.get(reactions.mine) ?? 0) - 1);
  if (emoji) counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
  return {
    counts: REACTIONS.filter((e) => (counts.get(e) ?? 0) > 0).map((e) => ({ emoji: e, count: counts.get(e)! })),
    mine: emoji,
  };
}
