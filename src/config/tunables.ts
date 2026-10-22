// Every tunable number, each with its origin (DECISIONS.md: Config and tunables).

// Origin: human, 2026-10-18 (docs/milestones/M01-puzzle-content.md, Numbers).
export const QUESTIONS_PER_DAY = 7;

// Username length (human, 2026-10-18; docs/milestones/M02-sign-in-and-play.md, Numbers). The database's check
// constraint profile_username_format enforces it; src/lib/profile.db.test.ts checks the two agree (M02 2f, B6).
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

// Display name length (human, 2026-10-21; docs/milestones/M07-friends-and-live-board.md, D1). The database's check
// constraint profile_display_name_format enforces it; src/lib/profile.db.test.ts checks the two agree.
export const DISPLAY_NAME_MAX_LENGTH = 24;

// Typo auto-correct on typed answers: one typo forgiven, only for text of 4+ letters (human, 2026-10-19, for
// "did you mean"; auto-correct instead of a prompt, human, 2026-10-21; docs/milestones/M04-game-mechanics.md).
export const TYPO_MAX_EDITS = 1;
export const TYPO_MIN_LETTERS = 4;

// Points for surviving each question, Q1 to Q7: they rise with each harder question in growing jumps, and a perfect
// run is 1000, a round total future games can share (human, 2026-10-21; M04 G1). Replaces k points for question k.
export const POINTS_PER_QUESTION = [25, 50, 75, 100, 150, 250, 350];

// Stolen letters, schedule A (human, 2026-10-21, G8; docs/milestones/M04-game-mechanics.md, "Rules to build", rule 4):
// the tier the Wind steals from at each question, or null for no theft. Tiers are the M04 ticket's measured grouping
// (the share of a category's answers one letter removes): medium C P H U B D M G; heavy consonants R N L T S; vowels
// E A I O.
export const LETTER_TIERS = { medium: "cphubdmg", heavy_consonant: "rnlts", vowel: "eaio" } as const;
export const LETTER_SCHEDULE: (keyof typeof LETTER_TIERS | null)[] = [null, "medium", null, "medium", "heavy_consonant", null, "vowel"];

// Puzzle insights report (human, 2026-10-19; docs/milestones/M03-puzzle-insights.md, Numbers).
// A question's catch rate counts once this many players answered it; fewer is shown as "too few".
export const INSIGHTS_MIN_PLAYERS = 5;
// A later question that catches at least this many percentage points fewer players than an earlier one breaks the
// day's gently rising shape (DECISIONS.md: Game 1).
export const INSIGHTS_SHAPE_DROP_POINTS = 10;
// How many of a question's most common answers the report lists.
export const INSIGHTS_TOP_ANSWERS = 5;
