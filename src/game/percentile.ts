// A day's place in a game (docs/milestones/M16-game-2-substrings.md, "Comparing games"; M16-16e-points-and-boards.md):
// the share of that day's other players a player beat, a tie counting half, to one decimal (human, 2026-11-07: "One
// decimal"), and 100 on a day with no other player ("100, top of the day"). Places, not points, so games that score
// differently weigh the same.

const oneDecimal = (x: number) => Math.round(x * 10) / 10;

export function percentile(score: number, others: number[]): number {
  if (others.length === 0) return 100;
  const beaten = others.reduce((sum, other) => sum + (other < score ? 1 : other === score ? 0.5 : 0), 0);
  return oneDecimal((beaten / others.length) * 100);
}

// Every player's place on a day, from every player's score that day.
export function dayPercentiles(scores: Map<string, number>): Map<string, number> {
  const all = [...scores.entries()];
  return new Map(all.map(([player, score]) => [player, percentile(score, all.filter(([other]) => other !== player).map(([, s]) => s))]));
}

// Days' places added up, kept to one decimal, as adding decimals in floating point drifts.
export const placeTotal = (places: number[]) => oneDecimal(places.reduce((sum, p) => sum + p, 0));

// The overall board's Average (M16 16e-3b, answer 2): the places over the game-days played, to one decimal like a place
// (answer 26), and 0 with none.
export const placeAverage = (places: number[]) => (places.length === 0 ? 0 : oneDecimal(places.reduce((sum, p) => sum + p, 0) / places.length));
