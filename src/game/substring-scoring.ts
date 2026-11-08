// Game 2's score (docs/milestones/M16-16e-points-and-boards.md, Design): a word's points by its letters, 120 for each
// word holding the day's bonus letter, and the run's different letters cashed in at its end. Every round scores the
// same, and a missed round, having no word, scores nothing. Keys are a word's letters alone (DECISIONS.md, Game 2), so
// "it's" scores as 3 letters. No server imports, so the screen and the routes can share it.
import { SUBSTRING_BONUS_LETTER_POINTS, SUBSTRING_LETTERS_POINTS, SUBSTRING_WORD_POINTS } from "@/config/tunables";

export type RunScore = {
  words: number;
  bonus: number;
  // What the run's different letters are worth at its end.
  letters: number;
  // The different letters, in order, for the tracker.
  used: string;
  total: number;
};

// "Round" and "nice numbers" (answers 9 and 10): two significant figures, and under 100 the nearest 5, which gives the
// approved tables.
const nice = (x: number) => (x < 100 ? Math.round(x / 5) * 5 : Number(x.toPrecision(2)));

const grown = ({ at, points, growth }: { at: number; points: number; growth: number }, n: number) => nice(points * growth ** (n - at));

export const wordPoints = (key: string) => grown(SUBSTRING_WORD_POINTS, key.length);

export const lettersPoints = (n: number) => (n === 0 ? 0 : grown(SUBSTRING_LETTERS_POINTS, n));

export const bonusPoints = (key: string, bonusLetter: string) => (key.includes(bonusLetter) ? SUBSTRING_BONUS_LETTER_POINTS : 0);

export function scoreRun(keys: string[], bonusLetter: string): RunScore {
  const used = [...new Set(keys.join(""))].sort().join("");
  const words = keys.reduce((sum, key) => sum + wordPoints(key), 0);
  const bonus = keys.reduce((sum, key) => sum + bonusPoints(key, bonusLetter), 0);
  const letters = lettersPoints(used.length);
  return { words, bonus, letters, used, total: words + bonus + letters };
}
