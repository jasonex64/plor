// How a friend's Offbeat run ended, in the words the live board and the feed share (src/app/board.tsx, src/app/feed.tsx).
import type { Ended, Scored } from "@/friends/board";

const plural = (n: number, one: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : `${one}s`}`;

export function endedText(ended: Ended | Scored): string {
  if (ended.result === "scored") return `scored ${plural(ended.points, "point")} with ${plural(ended.answers, "answer")}`;
  if (ended.result === "caught") return `caught on question ${ended.question} by "${ended.answer}"`;
  if (ended.result === "survived") return "survived every question";
  return `ran out of time on question ${ended.question}`;
}
