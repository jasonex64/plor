// Every tunable number, each with its origin (DECISIONS.md: Config and tunables).

// Origin: human, 2026-10-18 (docs/milestones/M01-puzzle-content.md, Numbers).
export const QUESTIONS_PER_DAY = 7;

// "Did you mean" in the answer box: one typo forgiven, only for text of 4+ letters (human, 2026-10-19;
// docs/milestones/M02-sign-in-and-play.md, Numbers).
export const SUGGEST_MAX_TYPOS = 1;
export const SUGGEST_MIN_LETTERS_FOR_TYPOS = 4;

// Puzzle insights report (human, 2026-10-19; docs/milestones/M03-puzzle-insights.md, Numbers).
// A question's catch rate counts once this many players answered it; fewer is shown as "too few".
export const INSIGHTS_MIN_PLAYERS = 5;
// A later question that catches at least this many percentage points fewer players than an earlier one breaks the
// day's gently rising shape (DECISIONS.md: Game 1).
export const INSIGHTS_SHAPE_DROP_POINTS = 10;
// How many of a question's most common answers the report lists.
export const INSIGHTS_TOP_ANSWERS = 5;
