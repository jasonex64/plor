// The bonus line's branches (docs/milestones/M14-14b-2c-review-items.md, answer 7): a bonus is named only when an
// answer survived before midnight can earn one, and a run with survived answers after midnight says they earn none.
import { describe, expect, it } from "vitest";
import type { AnsweredQuestion, RunState } from "@/game/runs";
import { bonusNote, earnsBonus } from "./bonus";

const answer = (index: number, matched: boolean, inDay: boolean): AnsweredQuestion => ({
  index,
  prompt: "Name an animal",
  answer: { id: "a", name: "a" },
  matched,
  hostAnswers: [],
  points: 0,
  bonus: 0,
  share: null,
  inDay,
});
const run = (answered: AnsweredQuestion[]) => ({ answered }) as RunState;

describe("the bonus line", () => {
  it("names nothing for a catch on question 1", () => {
    const r = run([answer(0, true, true)]);
    expect([earnsBonus(r), bonusNote(r)]).toEqual([false, ""]);
  });

  it("names the bonus, to be final once the day is over, for a question survived before midnight", () => {
    const r = run([answer(0, false, true), answer(1, true, true)]);
    expect([earnsBonus(r), bonusNote(r)]).toEqual([true, "The final bonus is worked out once the day is over."]);
  });

  it("names no bonus for a run survived only after midnight, and says those answers earn none", () => {
    const r = run([answer(0, false, false), answer(1, true, false)]);
    expect([earnsBonus(r), bonusNote(r)]).toEqual([false, "Answers after midnight earn no bonus."]);
  });

  it("names the bonus of the answers before midnight, and says those after it earn none", () => {
    const r = run([answer(0, false, true), answer(1, false, false)]);
    expect([earnsBonus(r), bonusNote(r)]).toEqual([true, "Answers after midnight earn no bonus."]);
  });
});
