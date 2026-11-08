// A run's status, apart from the run module (src/game/runs.ts), which talks to the database, so the pages can read it
// too (docs/milestones/M14-14b-2c-review-items.md, item 46). "timed_out": the current question's 20 seconds ran out,
// which ends the run (M04 13c-2; the database decides). The timer, not midnight, ends an unfinished run: a run started
// before midnight can be finished after it (human, 2026-10-21), but its answers after midnight count for nothing on the
// boards (M16 16e-3a, docs/milestones/M16-16e-points-and-boards.md, answer 35).
export type RunStatus = "not_started" | "in_progress" | "died" | "survived" | "timed_out";

// The states of a run that's over, which open the day's thread and reactions (M08) and the shares (M11 H5).
export const FINISHED: RunStatus[] = ["died", "survived", "timed_out"];
