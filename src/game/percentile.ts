// A day's place in a game (docs/milestones/M16-game-2-substrings.md, "Comparing games"; M16-16e-points-and-boards.md):
// the share of that day's other players a player beat, a tie counting half, to one decimal (human, 2026-11-07: "One
// decimal"), and 100 on a day with no other player ("100, top of the day"). It's the end of a run's "Better than X% of
// players"; the boards count par scores (src/game/par.ts; docs/milestones/M15-15i-par-scores.md).

const oneDecimal = (x: number) => Math.round(x * 10) / 10;

export function percentile(score: number, others: number[]): number {
  if (others.length === 0) return 100;
  const beaten = others.reduce((sum, other) => sum + (other < score ? 1 : other === score ? 0.5 : 0), 0); // a tie counts half (human, 2026-11-17, docs/milestones/PROCESS-lint-rules.md answer 23)
  return oneDecimal((beaten / others.length) * 100);
}
