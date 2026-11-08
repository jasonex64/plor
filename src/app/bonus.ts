// What the result and Today's banner say of the rarity bonus (human, 2026-10-26: "Hide when nothing (Recommended)";
// docs/milestones/M14-14b-2c-review-items.md, answer 7). Only a question survived before the run's day ended earns
// one (src/game/scoring.ts: a caught answer, or one given after midnight, earns 0; M09 D8).
import type { RunState } from "@/game/runs";

// Whether any answer can earn a bonus, so the bonus is worth naming at all.
export function earnsBonus(run: RunState): boolean {
  return run.answered.some((a) => !a.matched && a.inDay);
}

// A run played past its day's midnight counts on the boards only what it scored before it (M16 16e-3a,
// docs/milestones/M16-16e-points-and-boards.md, answers 35 and 37): one answered after it, or one still going after it.
export function pastMidnight(run: RunState): boolean {
  return run.answered.some((a) => !a.inDay) || (run.dayOver && run.status === "in_progress");
}

// Claude's words, approved with the design (answer 37).
export const PAST_MIDNIGHT = "Past midnight: answers from now on don't count for the boards.";

// The line after the bonus: for a run played past midnight, that those answers don't count, bonus included; otherwise,
// while a bonus can be earned, when the final one comes; nothing when there's no bonus to earn.
export function bonusNote(run: RunState): string {
  if (pastMidnight(run)) return PAST_MIDNIGHT;
  if (earnsBonus(run)) return "The final bonus is worked out once the day is over.";
  return "";
}
