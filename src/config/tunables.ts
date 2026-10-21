// Every tunable number, each with its origin (DECISIONS.md: Config and tunables).

// Origin: human, 2026-10-18 (docs/milestones/M01-puzzle-content.md, Numbers).
export const QUESTIONS_PER_DAY = 7;

// Username length (human, 2026-10-18; docs/milestones/M02-sign-in-and-play.md, Numbers). The database's check
// constraint profile_username_format enforces it; src/lib/profile.db.test.ts checks the two agree (M02 2f, B6).
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

// Typo auto-correct on typed answers: one typo forgiven, only for text of 4+ letters (human, 2026-10-19, for
// "did you mean"; auto-correct instead of a prompt, human, 2026-10-21; docs/milestones/M13-game-mechanics.md).
export const TYPO_MAX_EDITS = 1;
export const TYPO_MIN_LETTERS = 4;

// Puzzle insights report (human, 2026-10-19; docs/milestones/M03-puzzle-insights.md, Numbers).
// A question's catch rate counts once this many players answered it; fewer is shown as "too few".
export const INSIGHTS_MIN_PLAYERS = 5;
// A later question that catches at least this many percentage points fewer players than an earlier one breaks the
// day's gently rising shape (DECISIONS.md: Game 1).
export const INSIGHTS_SHAPE_DROP_POINTS = 10;
// How many of a question's most common answers the report lists.
export const INSIGHTS_TOP_ANSWERS = 5;
