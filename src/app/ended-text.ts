// How a friend's Offbeat run ended, in the words the live board and the feed share (src/app/board.tsx, src/app/feed.tsx).
import type { Ended } from "@/friends/board";

export function endedText(ended: Ended): string {
  if (ended.result === "caught") return `caught on question ${ended.question} by "${ended.answer}"`;
  if (ended.result === "survived") return "survived every question";
  return `ran out of time on question ${ended.question}`;
}
