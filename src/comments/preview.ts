// What the feed says before the player has played (docs/milestones/M14-14a-2a-today.md, L40): up to 3 friends by name
// (the human, 2026-10-25), then how many more commented, counting group members who aren't friends, who are never
// named (M10 G3). Kept apart from the component so each branch is unit-tested.
import type { FeedPreview } from "./feed";

export const NAMED = 3;

export type PreviewText = {
  // The friends named, in the order they first commented.
  named: string[];
  // The line after them: "and N more", "N players commented" when no friend did, or null.
  more: string | null;
  // The link's words, or null when there's nothing to read yet.
  read: string | null;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function previewText(preview: FeedPreview): PreviewText {
  const named = preview.friends.slice(0, NAMED);
  const others = preview.friends.length - named.length + preview.others;
  return {
    named,
    more: others === 0 ? null : named.length > 0 ? `and ${others} more` : `${plural(others, "player", "players")} commented`,
    read: preview.count === 0 ? null : `Finish today's game to read ${plural(preview.count, "comment", "comments")}`,
  };
}
