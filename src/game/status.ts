// A run's status, apart from the run modules, which talk to the database, so the pages can read it too (docs/milestones/
// M14-14b-2c-review-items.md, item 46). "survived" is the one status of a run that is over, whatever its game: a run on a clock
// that has ended, a Fragments run that has played every round (private.run_status). The timer, not midnight, ends an unfinished
// run: a run started before midnight can be finished after it (human, 2026-10-21), but its answers after midnight count for
// nothing on the boards (M16 16e-3a, docs/milestones/M16-16e-points-and-boards.md, answer 35).
export type RunStatus = "not_started" | "in_progress" | "survived";

// The states of a run that's over, which open the day's thread and reactions (M08) and the shares (M11 H5).
export const FINISHED: RunStatus[] = ["survived"];
