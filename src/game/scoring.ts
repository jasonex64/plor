// A run's points: the ladder for each survived question, plus a rarity bonus for each survived answer, bigger the
// fewer players gave it (DECISIONS.md, Game 1: Scoring; docs/milestones/M09-points-and-leaderboard.md, design and
// N1–N4; the first guess and pooling, docs/milestones/M13-13c-rarity-and-the-host.md). Pure, so the game screens
// (provisional) and settling (final) score the same way.
import {
  FIRST_GUESS_SHARES,
  PERFECT_RUN_BONUS_CAP,
  POINTS_PER_QUESTION,
  RARITY_BONUS_FRACTION,
  RARITY_EXPECTATION_WEIGHT,
  RARITY_MIN_PLAYERS,
  RARITY_ZERO_SHARE,
} from "../config/tunables.ts";
import type { ApprovedPuzzle, ApprovedQuestion } from "@/content/puzzle";

// inDay: given before the run's day ended at midnight; later answers earn no bonus (D8).
export type ScoredEvent = { index: number; entryId: string; matched: boolean; inDay: boolean };

// Answers given before their day's midnight, by question index: how many answers there were, and how many named each
// entry. For the bonus they're pooled over every day of the question's category (ledger.ts, pooledCounts); for the
// result screen's shares, one day's (ledger.ts, dayCounts).
export type DayCounts = Map<number, { answered: number; byEntry: Map<string, number> }>;

// The first guess at the share of players giving this answer (M13 D5, 40/40/20; docs/milestones/M13-13c-rarity-and-the-host.md):
// each tier's share split evenly among its members, the day's levels naming the common and uncommon ones and every other
// member of the category, as approved, being rare. A tier with no members passes its share to the others in proportion
// to theirs (Claude's reading, as M09's "every member in the host bank"; no number involved).
export function firstGuess(question: ApprovedQuestion, entryId: string): number {
  const levels = Object.values(question.levels);
  const size = {
    common: levels.filter((l) => l === "common").length,
    uncommon: levels.filter((l) => l === "uncommon").length,
    rare: question.members - levels.length,
  };
  const tier = question.levels[entryId] ?? "rare";
  const total = (Object.keys(size) as (keyof typeof size)[]).reduce((sum, t) => sum + (size[t] > 0 ? FIRST_GUESS_SHARES[t] : 0), 0);
  return FIRST_GUESS_SHARES[tier] / total / size[tier];
}

// The first guess blended with the pooled counts, as if it were RARITY_EXPECTATION_WEIGHT more players (N1), once
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

// counts: pooled over the category's past days for the provisional bonus, and over its days through the run's own for
// the final one (human, 2026-10-24: "Past days only (Recommended)"). bonuses lines up with events: 0 for a caught answer
// or one given after midnight.
export function scoreRun(puzzle: ApprovedPuzzle, events: ScoredEvent[], counts: DayCounts): { ladder: number; bonus: number; bonuses: number[] } {
  const bonuses = events.map((e) => {
    if (e.matched || !e.inDay) return 0;
    const expected = firstGuess(puzzle.questions[e.index], e.entryId);
    const pooled = counts.get(e.index);
    return answerBonus(e.index, pooled ? blendedShare(expected, pooled.byEntry.get(e.entryId) ?? 0, pooled.answered) : expected);
  });
  const survived = events.filter((e) => !e.matched).length;
  return {
    ladder: events.reduce((sum, e) => sum + (e.matched ? 0 : POINTS_PER_QUESTION[e.index]), 0),
    bonus: cappedBonus(bonuses.reduce((a, b) => a + b, 0), survived, puzzle.questions.length),
    bonuses,
  };
}
