// The spoiler-free share text for a finished run (docs/milestones/M05-share.md): the day and the stops climbed, never
// a prompt or an answer. No points: they follow from the stops (S1, human, 2026-10-21). How it ended shows as the
// stop's symbol since 14c-1 (round 10). The day is the date only; a day number waits for the beta's first day (S2).
import type { RunState } from "./runs";
import { GAME } from "@/platform/game";

// One symbol per stop (docs/milestones/M14-14c-1-name-and-words.md, "The share line"; human, 2026-10-27, rounds 6, 7
// and 10): a stop climbed with an answer that earned a rarity bonus (its provisional bonus above 0), one climbed with
// none, where the Wind caught the player, where time ran out, and the stops not reached.
const RARE = "🟪";
const COMMON = "🟩";
const CAUGHT = "💨";
const TIMED_OUT = "❄️";
const NOT_REACHED = "⬜";

// How many stops the run climbed, for the share text and the result screen (M05 review: one count for both).
export function survivedCount(run: RunState): number {
  return run.answered.filter((a) => !a.matched).length;
}

export function shareText(run: RunState): string {
  const survived = survivedCount(run);
  // The run's date is the Pacific day as text ("2026-10-21"); read in UTC so the label can't shift by a day.
  const day = new Date(`${run.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const stops = Array.from({ length: run.total }, (_, i) => {
    const a = run.answered[i];
    if (a) return a.matched ? CAUGHT : a.bonus > 0 ? RARE : COMMON;
    return i === run.answered.length && run.status === "timed_out" ? TIMED_OUT : NOT_REACHED;
  });
  return `${GAME.name} · ${day}\n${stops.join("")} ${survived}/${run.total}`;
}
