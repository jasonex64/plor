// The bonus line's branches (docs/milestones/M14-14b-2c-review-items.md, answer 7): a bonus is named only when an
// answer survived before midnight can earn one, and a run played past midnight says its answers from then on count for
// nothing (M16 16e-3a, answers 35 and 37).
import { describe, expect, it } from "vitest";
import type { AnsweredQuestion, RunState } from "@/game/runs";
import { bonusNote, earnsBonus, PAST_MIDNIGHT, pastMidnight } from "./bonus";

const answer = (index: number, matched: boolean, inDay: boolean): AnsweredQuestion => ({
  index,
  prompt: "Name an animal",
  answer: { id: "a", name: "a" },
  matched,
  tier: "rare",
  hostAnswers: [],
  points: 0,
  bonus: 0,
  share: null,
  inDay,
});
const run = (answered: AnsweredQuestion[], status: RunState["status"] = "died", dayOver = false) => ({ answered, status, dayOver }) as RunState;

describe("the bonus line", () => {
  it("names nothing for a catch on question 1", () => {
    const r = run([answer(0, true, true)]);
    expect([earnsBonus(r), bonusNote(r)]).toEqual([false, ""]);
  });

  it("names the bonus, to be final once the day is over, for a question survived before midnight", () => {
    const r = run([answer(0, false, true), answer(1, true, true)]);
    expect([earnsBonus(r), bonusNote(r)]).toEqual([true, "The final bonus is worked out once the day is over."]);
  });

  it("names no bonus for a run survived only after midnight, and says those answers don't count", () => {
    const r = run([answer(0, false, false), answer(1, true, false)]);
    expect([earnsBonus(r), bonusNote(r)]).toEqual([false, PAST_MIDNIGHT]);
  });

  it("names the bonus of the answers before midnight, and says those after it don't count", () => {
    const r = run([answer(0, false, true), answer(1, false, false)]);
    expect([earnsBonus(r), bonusNote(r)]).toEqual([true, PAST_MIDNIGHT]);
  });

  it("says so for a run caught on its first answer after midnight", () => {
    expect(bonusNote(run([answer(0, false, true), answer(1, true, false)]))).toBe(PAST_MIDNIGHT);
  });
});

describe("a run past its midnight", () => {
  it("is one still going after its day is over, even before a late answer", () => {
    expect(pastMidnight(run([answer(0, false, true)], "in_progress", true))).toBe(true);
  });

  it("isn't one finished before midnight, looked at after it", () => {
    expect(pastMidnight(run([answer(0, false, true), answer(1, true, true)], "died", true))).toBe(false);
  });

  it("isn't one still going on its own day", () => {
    expect(pastMidnight(run([answer(0, false, true)], "in_progress", false))).toBe(false);
  });
});
