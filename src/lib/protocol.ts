// Bumped only on breaking API changes, never per deploy (docs/milestones/M00-data-design.md §2). 2: answers are
// typed text instead of entry IDs (M04 13c-1). 3: a reveal waits for Next before the next question (M04 13c-4).
// 4: the leaderboard is this week and last week instead of one all-time list (M10 10a). 5: the board shows a friend
// as started, not their question or finished, until the viewer has finished (M12 12d). 6: GET /api/run answers run
// null on a day with no puzzle, instead of 404 (M12 12f, F2). 7: the weekly boards name their game, `game`, and are
// refused without it (M16 16e-2). 8: comments and reactions name their game, `game`, and are refused without it (M16 16f-3).
export const PROTOCOL_VERSION = 8;
