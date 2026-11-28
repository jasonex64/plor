// How a friend's Offbeat run ended, in the words the feed uses (src/app/feed.tsx).
import type { Scored } from "@/friends/board";

const plural = (n: number, one: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : `${one}s`}`;

export function endedText(ended: Scored): string {
  return `scored ${plural(ended.points, "point")} with ${plural(ended.answers, "answer")}`;
}
