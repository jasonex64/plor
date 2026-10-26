// What the result and Today's banner say of the rarity bonus (human, 2026-10-26: "Hide when nothing (Recommended)";
// docs/milestones/M14-14b-2c-review-items.md, answer 7). Only a question survived before the run's day ended earns
// one (src/game/scoring.ts: a caught answer, or one given after midnight, earns 0; M09 D8).
import type { RunState } from "@/game/runs";

// Whether any answer can earn a bonus, so the bonus is worth naming at all.
export function earnsBonus(run: RunState): boolean {
  return run.answered.some((a) => !a.matched && a.inDay);
}

// The line after the bonus: that answers after midnight earn none, for a run with a survived one; otherwise, while a
// bonus can be earned, when the final one comes; nothing when there's no bonus to earn.
export function bonusNote(run: RunState): string {
  if (run.answered.some((a) => !a.matched && !a.inDay)) return "Answers after midnight earn no bonus.";
  if (earnsBonus(run)) return "The final bonus is worked out once the day is over.";
  return "";
}
