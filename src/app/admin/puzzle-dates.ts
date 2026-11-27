// The dates the Puzzles page's Days row lists: every date that has a day of either game, or is tomorrow with nothing
// drafted (docs/milestones/M15-15f-fragments-test-run.md, 15f-1, answer 1: one date, both games), oldest first.
import type { DayView } from "@/admin/puzzles";

// Whether a day has a draft, or has been approved, of either kind: seven questions, or a clock's three, which holds its own under `clock`.
export const hasDraft = (d: DayView): boolean => d.draft !== null || (d.clock?.draft ?? null) !== null;
export const isApproved = (d: DayView): boolean => d.live !== null || (d.clock?.live ?? null) !== null;

export function slotDates(offbeat: string[], fragments: string[], emptyTomorrow: string | null): string[] {
  return [...new Set([...offbeat, ...fragments, ...(emptyTomorrow ? [emptyTomorrow] : [])])].sort();
}
