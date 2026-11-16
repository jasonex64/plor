// The dates the Puzzles page's Days row lists: every date that has a day of either game, or is tomorrow with nothing
// drafted (docs/milestones/M15-15f-fragments-test-run.md, 15f-1, answer 1: one date, both games), oldest first.
export function slotDates(offbeat: string[], fragments: string[], emptyTomorrow: string | null): string[] {
  return [...new Set([...offbeat, ...fragments, ...(emptyTomorrow ? [emptyTomorrow] : [])])].sort();
}
