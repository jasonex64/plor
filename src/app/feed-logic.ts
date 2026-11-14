// The feed screen's own rules, apart from the component so each is unit-tested (docs/milestones/M16-16f-the-shared-pieces.md,
// 16f-5; the human's answers 23, 49 and the nudge's merge, 16f-5's step 6).
import type { FeedItem, FeedPage } from "@/comments/feed-page";
import { GAME, SUBSTRINGS } from "@/platform/game";
import type { BoardGame } from "@/friends/leaderboard";
import { dayText, shiftDay } from "./day-text";

// A game's shown name, from its record (src/platform/game.ts).
export const gameName = (game: BoardGame) => (game === GAME.id ? GAME.name : SUBSTRINGS.name);

// Both games, for a thread that shows each (a group's page); a constant, as Comments' games must be.
export const BOTH_GAMES: readonly BoardGame[] = [GAME.id, SUBSTRINGS.id];

// The line where an earlier day's items begin (answer 49): "Yesterday" for the day before today, then the app's date
// style ("Thu 12 Nov"); none for today.
export function dateLine(date: string, today: string): string | null {
  if (date === today) return null;
  return date === shiftDay(today, -1) ? "Yesterday" : dayText(date);
}

// The games the comment box offers: those the writer has finished today (a comment to a game opens by finishing it, M16
// 16f-3), Offbeat first as the carousel orders them (answer 25).
export function postableGames(finishedToday: BoardGame[]) {
  return [GAME, SUBSTRINGS].filter((game) => finishedToday.includes(game.id));
}

// One key per item: a comment's ID, or a result's game, player and day, as the server tells two items apart.
export const itemKey = (item: FeedItem) => (item.kind === "comment" ? `c:${item.id}` : `r:${item.game}:${item.userId}:${item.date}`);

// What the screen holds of the feed: the items loaded so far, newest first, and the cursor for the next page.
export type Loaded = Pick<FeedPage, "items" | "next">;

// A nudge's first page read again, merged into what is loaded, so the reader keeps their place: new items come at the
// top, changed ones are the new copy, ones missing from the newest span (from the top down to the page's last item)
// are gone, and everything older than the span stays as loaded. An item at the span's last instant that the page
// doesn't hold may be cut by the page's end or deleted, which the page can't tell, so it stays until the feed is read
// again from the top. When the page ends the feed, or ends after the loaded items begin (more new items than a page),
// it can't be joined to what is loaded without a gap, so it replaces it.
export function mergeFirstPage(loaded: Loaded, fresh: Loaded): Loaded {
  const last = fresh.items.at(-1);
  const first = loaded.items[0];
  if (fresh.next === null || !last || !first || last.at > first.at) return fresh;
  const inFresh = new Set(fresh.items.map(itemKey));
  const older = loaded.items.filter((item) => !inFresh.has(itemKey(item)) && item.at <= last.at);
  return { items: [...fresh.items, ...older], next: older.length > 0 ? loaded.next : fresh.next };
}

// A feed item's instant as every browser's Date reads it: the server prints microseconds ("…:00.123456Z").
export const instant = (at: string) => at.replace(/(\.\d{3})\d*Z$/, "$1Z");

// Where focus goes when the comment at index i leaves the list (Delete or Report): the next comment down the list, else the
// one above it, by its item key; none if it was the only one (docs/milestones/M14-14b-21-screen-readers.md, answer 4).
// A result between them is passed over: it has no comment's ⋯ for focus to land on.
export function neighbourComment(items: FeedItem[], i: number): string | null {
  const next = items.slice(i + 1).find((item) => item.kind === "comment");
  const before = items.slice(0, i).reverse().find((item) => item.kind === "comment");
  const found = next ?? before;
  return found ? itemKey(found) : null;
}
