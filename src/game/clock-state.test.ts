import { describe, expect, it } from "vitest";
import type { ClockPuzzle } from "@/content/puzzle";
import { buildClockState, clockNameIds, type ClockRead, type StoredClockAnswer } from "./clock-state";

const puzzle: ClockPuzzle = {
  format: 4,
  game_id: "offbeat",
  date: "2026-12-01",
  questions: [
    { prompt: "one", category: "a", root: "r1", member_of: null, levels: { c1: "common", c2: "common", u1: "uncommon" } },
    { prompt: "two", category: "b", root: "r2", member_of: null, levels: { d1: "common" } },
    { prompt: "three", category: "c", root: "r3", member_of: null, levels: { e1: "uncommon" } },
  ],
};
const names = new Map([
  ["c1", "cat"],
  ["c2", "ant"],
  ["u1", "yak"],
  ["d1", "dog"],
  ["e1", "emu"],
  ["zz9", "rarebit"],
]);
const given: StoredClockAnswer[] = [
  { question_idx: 0, entry_id: "c1", tier: "common", added_ms: 3000, points: 10 },
  { question_idx: 0, entry_id: "zz9", tier: "rare", added_ms: 7600, points: 50 },
];
const live: ClockRead = { status: "in_progress", answered: 0, msLeft: 25000, msToReset: 1000, dayOver: false };
const over: ClockRead = { status: "survived", answered: 3, msLeft: null, msToReset: 1000, dayOver: false };

describe("the state of a run on a clock", () => {
  it("holds only the open question and the player's own answers while the run is live", () => {
    const state = buildClockState(puzzle.date, puzzle, given, live, new Map(names));
    expect(state).toMatchObject({ status: "in_progress", question: { index: 0, prompt: "one" }, msLeft: 25000, points: 60, missed: null });
    const text = JSON.stringify(state);
    // No later prompt, and no answer the player hasn't given (the names of c2, u1, d1, e1).
    for (const hidden of ["two", "three", "ant", "yak", "dog", "emu", "c2", "u1", "d1", "e1"]) expect(text).not.toContain(hidden);
    expect(state.answers.map((a) => [a.answer.name, a.tier, a.addedMs, a.points])).toEqual([
      ["cat", "common", 3000, 10],
      ["rarebit", "rare", 7600, 50],
    ]);
  });

  it("lists, once over, only the levelled answers the player did not give", () => {
    const state = buildClockState(puzzle.date, puzzle, given, over, new Map(names));
    expect(state).toMatchObject({ status: "over", question: null, msLeft: null });
    expect(state.missed).toEqual([
      { index: 0, prompt: "one", answers: [{ id: "c2", name: "ant", tier: "common" }, { id: "u1", name: "yak", tier: "uncommon" }] },
      { index: 1, prompt: "two", answers: [{ id: "d1", name: "dog", tier: "common" }] },
      { index: 2, prompt: "three", answers: [{ id: "e1", name: "emu", tier: "uncommon" }] },
    ]);
  });

  it("asks for the day's names only once the run is over", () => {
    expect(clockNameIds(puzzle, given, "in_progress")).toEqual(["c1", "zz9"]);
    expect(new Set(clockNameIds(puzzle, given, "survived"))).toEqual(new Set(["c1", "c2", "d1", "e1", "zz9", "u1"]));
  });

  it("is not started with no run", () => {
    const state = buildClockState(puzzle.date, puzzle, [], { status: null, answered: null, msLeft: null, msToReset: 5, dayOver: false }, new Map());
    expect(state).toMatchObject({ status: "not_started", question: null, msLeft: null, answers: [], points: 0, missed: null });
  });
});
