// A day's score in a game on the boards that compare games (docs/milestones/M15-15i-par-scores.md): the day's points
// against the game's par, out of 100 and no higher (human, 2026-11-15: "A fixed par per game instead"), to one decimal
// (M16 16e, answer 26: "One decimal"). No other player's score enters, so two close runs get close numbers however few
// played, and a game that scores differently weighs the same once it names its par (`PAR_POINTS`).

const oneDecimal = (x: number) => Math.round(x * 10) / 10;

export const parScore = (points: number, par: number) => Math.min(100, oneDecimal((points / par) * 100));

// Days' scores added up, kept to one decimal, as adding decimals in floating point drifts.
export const scoreTotal = (scores: number[]) => oneDecimal(scores.reduce((sum, s) => sum + s, 0));

// The overall board's Average (M16 16e-3b, answer 2): the scores over the game-days played, to one decimal, and 0 with
// none.
export const scoreAverage = (scores: number[]) => (scores.length === 0 ? 0 : oneDecimal(scores.reduce((sum, s) => sum + s, 0) / scores.length));
