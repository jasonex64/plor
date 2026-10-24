// The points of a run: the question ladder and the rarity bonus (docs/milestones/M09-points-and-leaderboard.md, 9a;
// N1–N5). Expected values are worked by hand in the ticket's design, not computed with the functions under test.
import { describe, expect, it } from "vitest";
import { PERFECT_RUN_BONUS_CAP, POINTS_PER_QUESTION } from "@/config/tunables";
import { fixtureDay, fixtureId } from "@/test/answer-fixture";
import { answerBonus, blendedShare, cappedBonus, expectedShare, runBonusCap, scoreRun, type DayCounts, type ScoredEvent } from "./scoring";

// The fixture day (src/test/answer-fixture.ts): question 1 is "Name an animal", 11 members, 2 in the host bank (bear,
// the host's pick, and dog); question 2 is "Name a fruit", 5 members, 2 in the host bank.
const puzzle = fixtureDay("2001-02-03", "2001-02-03T00:00:00Z");
const animal = puzzle.questions[0];
const t = (q: number, slug: string) => fixtureId(q, slug);

const safe = (index: number, entryId: string, inDay = true): ScoredEvent => ({ index, entryId, matched: false, inDay });
const caught = (index: number, entryId: string): ScoredEvent => ({ index, entryId, matched: true, inDay: true });

describe("the expected share of an answer (N5, D11)", () => {
  it("splits half the players among the host bank and half among every other member, as approved", () => {
    expect(expectedShare(animal, t(0, "dog"))).toBeCloseTo(0.5 / 2);
    expect(expectedShare(animal, t(0, "cat"))).toBeCloseTo(0.5 / 9);
  });

  it("shares evenly when every member is in the host bank", () => {
    expect(expectedShare({ ...animal, members: 2 }, t(0, "dog"))).toBeCloseTo(1 / 2);
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
    // Caught on question 4 after cat, kiwi and green, none in the host bank, with no counts yet: 25 + 50 + 75 = 150, and
    // bonuses 25 × 0.5 × (1 − (0.5/9) / 0.2) = 9.03, 50 × 0.5 × (1 − (0.5/3) / 0.2) = 4.17 and 75 × 0.5 × 0.167 = 6.25.
    const score = scoreRun(puzzle, [safe(0, t(0, "cat")), safe(1, t(1, "kiwi")), safe(2, t(2, "green")), caught(3, t(3, "italy"))], null);
    expect(score).toEqual({ ladder: 150, bonus: 19, bonuses: [9, 4, 6, 0] });
  });

  it("gives no bonus for an answer given after the day's midnight, though its ladder points count (D8)", () => {
    const score = scoreRun(puzzle, [safe(0, t(0, "cat")), safe(1, t(1, "kiwi"), false), caught(2, t(2, "red"))], null);
    expect(score).toEqual({ ladder: 75, bonus: 9, bonuses: [9, 0, 0] });
  });

  it("uses the day's counts when given, and the expectation for a question too few answered", () => {
    // Cat, given by 3 of 20: (10 × 0.5/9 + 3) / 30 = 11.85%, so 25 × 0.5 × (1 − 0.5926) = 5.09. Kiwi: 4 answered, too few,
    // so its expectation counts: 4.
    const counts: DayCounts = new Map([
      [0, { answered: 20, byEntry: new Map([[t(0, "dog"), 8], [t(0, "cat"), 3]]) }],
      [1, { answered: 4, byEntry: new Map([[t(1, "kiwi"), 2]]) }],
    ]);
    const score = scoreRun(puzzle, [safe(0, t(0, "cat")), safe(1, t(1, "kiwi")), caught(2, t(2, "red"))], counts);
    expect(score).toEqual({ ladder: 75, bonus: 9, bonuses: [5, 4, 0] });
  });
});
