// The points of a run: the question ladder and the rarity bonus (docs/milestones/M09-points-and-leaderboard.md, 9a;
// N1–N5). Expected values are worked by hand in the ticket's design, not computed with the functions under test.
import { describe, expect, it } from "vitest";
import { PERFECT_RUN_BONUS_CAP, POINTS_PER_QUESTION } from "@/config/tunables";
import { fixture } from "@/test/puzzles";
import { answerBonus, blendedShare, cappedBonus, expectedShare, runBonusCap, scoreRun, type DayCounts, type ScoredEvent } from "./scoring";

// Question 1 is "Name an animal": 226 entries, 6 in the host bank (elephant, the host's pick, and dog, cat, lion,
// tiger, horse). Question 7 is the zodiac: all 12 signs are in the host bank.
const puzzle = fixture("2001-02-03");
const animal = puzzle.questions[0];
const zodiac = puzzle.questions[6];

const safe = (index: number, entryId: string, inDay = true): ScoredEvent => ({ index, entryId, matched: false, inDay });
const caught = (index: number, entryId: string): ScoredEvent => ({ index, entryId, matched: true, inDay: true });

describe("the expected share of an answer (N5, D11)", () => {
  it("splits half the players among the host bank and half among every other listed answer", () => {
    expect(expectedShare(animal, "dog")).toBeCloseTo(0.5 / 6);
    expect(expectedShare(animal, "aardvark")).toBeCloseTo(0.5 / 220);
  });

  it("shares evenly when every listed answer is in the host bank", () => {
    expect(expectedShare(zodiac, "gemini")).toBeCloseTo(1 / 12);
  });
});

describe("the blended share (N1, N4)", () => {
  it("is the expectation alone while fewer than 5 players answered", () => {
    expect(blendedShare(0.5 / 6, 3, 4)).toBe(0.5 / 6);
  });

  it("weighs the expectation as 10 players once 5 or more answered", () => {
    // The ticket's example: 20 answered, 8 of them dog.
    expect(blendedShare(0.5 / 6, 8, 20)).toBeCloseTo((10 * (0.5 / 6) + 8) / 30);
    expect(blendedShare(0.5 / 6, 8, 20)).toBeCloseTo(0.2944, 4);
  });
});

describe("an answer's bonus (N2)", () => {
  it("matches the ticket's worked example on question 1, worth 25", () => {
    // Provisional: dog 25 × 0.5 × (1 − 0.0833 / 0.2) = 7.29; aardvark 25 × 0.5 × (1 − 0.00227 / 0.2) = 12.36.
    expect(answerBonus(0, 0.5 / 6)).toBe(7);
    expect(answerBonus(0, 0.5 / 220)).toBe(12);
    // Final, after 20 answered: dog's share 29.4% earns nothing; a single answer's 3.41% earns 10.37.
    expect(answerBonus(0, 0.2944)).toBe(0);
    expect(answerBonus(0, (10 * (0.5 / 220) + 1) / 30)).toBe(10);
  });

  it("is half the question's points at a share of 0, and 0 at a 20% share or more", () => {
    expect(answerBonus(5, 0)).toBe(125);
    expect(answerBonus(5, 0.2)).toBe(0);
    expect(answerBonus(5, 0.9)).toBe(0);
  });
});

describe("the cap on a run's bonus (N3; the human's rule)", () => {
  it("is one less than the first missed question's points, or 500 for a perfect run", () => {
    expect(runBonusCap(3, 7)).toBe(99);
    expect(runBonusCap(0, 7)).toBe(24);
    expect(runBonusCap(7, 7)).toBe(PERFECT_RUN_BONUS_CAP);
  });

  it("means a run that got further always outranks one that didn't, whatever the answers", () => {
    const ladder = (n: number) => POINTS_PER_QUESTION.slice(0, n).reduce((a, b) => a + b, 0);
    for (let k = 0; k <= 7; k++) {
      // The most a run surviving k questions can earn: every answer given by nobody else (share 0).
      const uncapped = POINTS_PER_QUESTION.slice(0, k).reduce((sum, _, i) => sum + answerBonus(i, 0), 0);
      // With "up to half", the cap never has to cut anything (the ticket's claim)…
      expect(uncapped).toBeLessThanOrEqual(runBonusCap(k, 7));
      // …and the best run surviving k still scores less than the worst run surviving k + 1 (no bonus at all).
      if (k < 7) expect(ladder(k) + uncapped).toBeLessThan(ladder(k + 1));
    }
  });

  it("cuts a bonus that would pass the cap, and leaves one under it", () => {
    // Not reachable with today's numbers (above); the cap is the guard if they change.
    expect(cappedBonus(200, 3, 7)).toBe(99);
    expect(cappedBonus(42, 3, 7)).toBe(42);
    expect(cappedBonus(600, 7, 7)).toBe(PERFECT_RUN_BONUS_CAP);
  });
});

describe("a run's score", () => {
  it("adds the ladder for each survived question and the bonus for each survived answer", () => {
    // Caught on question 4 after dog, a host-bank state and a host-bank rainy-day activity, with no counts yet:
    // 25 + 50 + 75 = 150, and bonuses 7 + 14 + 21 (each a host-bank answer: share 1/12).
    const score = scoreRun(puzzle, [safe(0, "dog"), safe(1, "california"), safe(2, "watch-a-movie"), caught(3, "a")], null);
    expect(score).toEqual({ ladder: 150, bonus: 42, bonuses: [7, 14, 21, 0] });
  });

  it("gives no bonus for an answer given after the day's midnight, though its ladder points count (D8)", () => {
    const score = scoreRun(puzzle, [safe(0, "dog"), safe(1, "california", false), caught(2, "read-a-book")], null);
    expect(score).toEqual({ ladder: 75, bonus: 7, bonuses: [7, 0, 0] });
  });

  it("uses the day's counts when given, and the expectation for a question too few answered", () => {
    const counts: DayCounts = new Map([
      [0, { answered: 20, byEntry: new Map([["dog", 8], ["aardvark", 1]]) }],
      [1, { answered: 4, byEntry: new Map([["california", 2]]) }],
    ]);
    const score = scoreRun(puzzle, [safe(0, "aardvark"), safe(1, "california"), caught(2, "read-a-book")], counts);
    expect(score).toEqual({ ladder: 75, bonus: 24, bonuses: [10, 14, 0] });
  });
});
