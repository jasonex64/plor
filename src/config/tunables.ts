// Every tunable number, each with its origin (DECISIONS.md: Config and tunables).

// Host answers for question 1, 2, ... 7: question k has k, so difficulty rises through the day.
// Origin: human, 2026-10-18 (docs/milestones/M01-puzzle-content.md, Numbers); tune after the M02 playtest.
export const HOST_ANSWERS_BY_QUESTION = [1, 2, 3, 4, 5, 6, 7];

// 7 questions per day (human, 2026-10-18), one per entry above, so the two can't disagree.
export const QUESTIONS_PER_DAY = HOST_ANSWERS_BY_QUESTION.length;
