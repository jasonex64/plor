// A run's points: the ladder for each survived question, plus a rarity bonus for each survived answer, bigger the
// fewer players gave it (DECISIONS.md, Game 1: Scoring; docs/milestones/M09-points-and-leaderboard.md, design and
// N1–N5). Pure, so the game screens (provisional) and settling (final) score the same way.
import {
  HOST_BANK_EXPECTED_SHARE,
  PERFECT_RUN_BONUS_CAP,
  POINTS_PER_QUESTION,
  RARITY_BONUS_FRACTION,
  RARITY_EXPECTATION_WEIGHT,
  RARITY_MIN_PLAYERS,
  RARITY_ZERO_SHARE,
} from "@/config/tunables";
import type { ApprovedPuzzle, ApprovedQuestion } from "@/content/puzzle";

// inDay: given before the run's day ended at midnight; later answers earn no bonus (D8).
export type ScoredEvent = { index: number; entryId: string; matched: boolean; inDay: boolean };

// One closed day's answers given before its midnight, by question index: how many players answered it, and how many
// gave each entry.
export type DayCounts = Map<number, { answered: number; byEntry: Map<string, number> }>;

// The share of players expected to give this answer before any are counted (D11, N5): the host bank, the common
// tier, shares HOST_BANK_EXPECTED_SHARE, and every other member of the category, as approved, the rest. With every
// member in the host bank, they all share evenly (Claude's reading; no number involved). 13c replaces it with levels.
export function expectedShare(question: ApprovedQuestion, entryId: string): number {
  const bank = question.host_bank.length;
  const others = question.members - bank;
  if (others === 0) return 1 / bank;
  return question.host_bank.includes(entryId) ? HOST_BANK_EXPECTED_SHARE / bank : (1 - HOST_BANK_EXPECTED_SHARE) / others;
}

// The expectation blended with the day's counts, as if it were RARITY_EXPECTATION_WEIGHT more players (N1), once
// enough players answered (N4).
export function blendedShare(expected: number, count: number, answered: number): number {
  if (answered < RARITY_MIN_PLAYERS) return expected;
  return (RARITY_EXPECTATION_WEIGHT * expected + count) / (RARITY_EXPECTATION_WEIGHT + answered);
}

// Up to RARITY_BONUS_FRACTION of the question's points, shrinking to 0 at RARITY_ZERO_SHARE (N2), rounded down.
export function answerBonus(index: number, share: number): number {
  return Math.floor(POINTS_PER_QUESTION[index] * RARITY_BONUS_FRACTION * Math.max(0, 1 - share / RARITY_ZERO_SHARE));
}

// A run's bonus stays below the points of the first question it didn't survive, so getting further always beats
// rarer answers (the human's rule); a perfect run has its own cap (N3).
export function runBonusCap(survived: number, total: number): number {
  return survived === total ? PERFECT_RUN_BONUS_CAP : POINTS_PER_QUESTION[survived] - 1;
}

export function cappedBonus(sum: number, survived: number, total: number): number {
  return Math.min(sum, runBonusCap(survived, total));
}

// counts: the closed day's counts for the final bonus, or null for the provisional one (the expectation alone).
// bonuses lines up with events: 0 for a caught answer or one given after midnight.
export function scoreRun(puzzle: ApprovedPuzzle, events: ScoredEvent[], counts: DayCounts | null): { ladder: number; bonus: number; bonuses: number[] } {
  const bonuses = events.map((e) => {
    if (e.matched || !e.inDay) return 0;
    const expected = expectedShare(puzzle.questions[e.index], e.entryId);
    const day = counts?.get(e.index);
    return answerBonus(e.index, day ? blendedShare(expected, day.byEntry.get(e.entryId) ?? 0, day.answered) : expected);
  });
  const survived = events.filter((e) => !e.matched).length;
  return {
    ladder: events.reduce((sum, e) => sum + (e.matched ? 0 : POINTS_PER_QUESTION[e.index]), 0),
    bonus: cappedBonus(bonuses.reduce((a, b) => a + b, 0), survived, puzzle.questions.length),
    bonuses,
  };
}
