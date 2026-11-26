import { describe, expect, it } from "vitest";
import type { ClockPuzzle } from "@/content/puzzle";
import { buildClockState, clockNameIds, missedOrder, type ClockRead, type StoredClockAnswer } from "./clock-state";

const rare = (prefix: string) => [1, 2, 3, 4, 5, 6].map((n) => `${prefix}${n}`);
const puzzle: ClockPuzzle = {
  format: 4,
  game_id: "offbeat",
  date: "2026-12-01",
  questions: [
    {
      prompt: "one",
      category: "a",
      root: "r1",
      member_of: null,
      levels: { c1: "common", c2: "common", c3: "common", c4: "common", c5: "common", u1: "uncommon", u2: "uncommon", u3: "uncommon", u4: "uncommon" },
      rare: rare("zz"),
      size: 40,
    },
    { prompt: "two", category: "b", root: "r2", member_of: null, levels: { d1: "common" }, rare: rare("yy"), size: 9 },
    { prompt: "three", category: "c", root: "r3", member_of: null, levels: { e1: "uncommon" }, rare: rare("xx"), size: 7 },
  ],
};
const names = new Map<string, string>([
  ...Object.keys(puzzle.questions[0].levels).map((id) => [id, `name ${id}`] as [string, string]),
  ["d1", "dog"],
  ["e1", "emu"],
  ...puzzle.questions.flatMap((q) => q.rare.map((id) => [id, `rare ${id}`] as [string, string])),
]);
const given: StoredClockAnswer[] = [
  { question_idx: 0, entry_id: "c1", tier: "common", added_ms: 3000, points: 10 },
  { question_idx: 0, entry_id: "zz1", tier: "rare", added_ms: 7600, points: 50 },
];
const live: ClockRead = { status: "in_progress", answered: 0, msLeft: 25000, msToReset: 1000, dayOver: false };
const over: ClockRead = { status: "survived", answered: 3, msLeft: null, msToReset: 1000, dayOver: false };
const stateOver = (stored: StoredClockAnswer[], date = puzzle.date) => buildClockState(date, puzzle, stored, over, new Map(names));
const shown = (state: ReturnType<typeof stateOver>, index: number) => state.missed![index].answers.map((a) => a.id);

describe("the state of a run on a clock", () => {
  it("holds only the open question and the player's own answers while the run is live", () => {
    const state = buildClockState(puzzle.date, puzzle, given, live, new Map(names));
    expect(state).toMatchObject({ status: "in_progress", question: { index: 0, prompt: "one" }, msLeft: 25000, points: 60, missed: null });
    const text = JSON.stringify(state);
    // No later prompt, and no answer the player hasn't given.
    for (const hidden of ["two", "three", "dog", "emu", "c2", "u1", "d1", "e1", "zz2", "yy1", "xx1"]) expect(text).not.toContain(hidden);
    expect(state.answers.map((a) => [a.answer.name, a.tier, a.addedMs, a.points])).toEqual([
      ["name c1", "common", 3000, 10],
      ["rare zz1", "rare", 7600, 50],
    ]);
  });

  it("is not started with no run", () => {
    const state = buildClockState(puzzle.date, puzzle, [], { status: null, answered: null, msLeft: null, msToReset: 5, dayOver: false }, new Map());
    expect(state).toMatchObject({ status: "not_started", question: null, msLeft: null, answers: [], points: 0, missed: null });
  });
});

describe("the missed answers of a run that is over", () => {
  it("shows three of each tier at most: common, then uncommon, then the day's first rare ones, with the rest counted", () => {
    const state = stateOver([]);
    const q = state.missed![0];
    expect(q).toMatchObject({ index: 0, prompt: "one" });
    expect(q.answers.map((a) => a.tier)).toEqual(["common", "common", "common", "uncommon", "uncommon", "uncommon", "rare", "rare", "rare"]);
    // The rare ones are the day's own order, not sorted.
    expect(shown(state, 0).slice(6)).toEqual(["zz1", "zz2", "zz3"]);
    expect(q.more).toBe(40 - 0 - 9);
    expect(q.answers[0]).toEqual({ id: expect.any(String), name: `name ${q.answers[0].id}`, tier: "common" });
  });

  it("shows fewer when fewer were missed, and counts what is left from the list's size", () => {
    const state = stateOver([{ question_idx: 1, entry_id: "d1", tier: "common", added_ms: 3000, points: 10 }]);
    // Question 2 has one common answer, given; six rare ones, three shown.
    expect(state.missed![1].answers.map((a) => [a.id, a.tier])).toEqual([["yy1", "rare"], ["yy2", "rare"], ["yy3", "rare"]]);
    expect(state.missed![1].more).toBe(9 - 1 - 3);
    // Question 3's one uncommon answer.
    expect(shown(stateOver([]), 2)).toEqual(["e1", "xx1", "xx2", "xx3"]);
    expect(stateOver([]).missed![2].more).toBe(7 - 0 - 4);
  });

  it("is the same for every player, and a player who gave one sees the next in the day's order", () => {
    const nobody = stateOver([]);
    const first = shown(nobody, 0);
    const commons = first.slice(0, 3);
    const uncommons = first.slice(3, 6);
    // The day's order of all five common answers, as someone who gave three of the first sees the rest of it.
    const gave = (ids: string[]): StoredClockAnswer[] => ids.map((id) => ({ question_idx: 0, entry_id: id, tier: "common", added_ms: 3000, points: 10 }));
    const order = missedOrder(puzzle.date, 0, ["c1", "c2", "c3", "c4", "c5"]);
    expect(commons).toEqual(order.slice(0, 3));
    const other = stateOver(gave([commons[0]]));
    expect(shown(other, 0).slice(0, 3)).toEqual(order.slice(1, 4));
    // The other tiers are untouched, and so is what two players with nothing given see.
    expect(shown(other, 0).slice(3, 6)).toEqual(uncommons);
    expect(shown(stateOver([]), 0)).toEqual(first);
    // Answers given on another question change nothing here.
    expect(shown(stateOver([{ question_idx: 1, entry_id: "d1", tier: "common", added_ms: 3000, points: 10 }]), 0)).toEqual(first);
  });

  it("skips a rare answer the player gave and shows the next of the day's six, never more than three", () => {
    const state = stateOver(given);
    expect(shown(state, 0).slice(6)).toEqual(["zz2", "zz3", "zz4"]);
    expect(shown(state, 0)).not.toContain("c1");
    expect(state.missed![0].more).toBe(40 - 2 - 9);
  });

  it("fixes the order by the day and the question: the same on one day, another on another", () => {
    const ids = ["c1", "c2", "c3", "c4", "c5", "u1", "u2", "u3", "u4"];
    expect(missedOrder("2026-12-01", 0, ids)).toEqual(missedOrder("2026-12-01", 0, [...ids].reverse()));
    expect(missedOrder("2026-12-01", 0, ids)).not.toEqual(missedOrder("2026-12-02", 0, ids));
    expect(missedOrder("2026-12-01", 0, ids)).not.toEqual(missedOrder("2026-12-01", 1, ids));
    expect([...missedOrder("2026-12-01", 0, ids)].sort()).toEqual([...ids].sort());
  });

  it("asks for the names of the answers given and the ones shown, and no others", () => {
    expect(clockNameIds(puzzle.date, puzzle, given, "in_progress")).toEqual(["c1", "zz1"]);
    const ids = clockNameIds(puzzle.date, puzzle, given, "survived");
    const state = stateOver(given);
    expect(new Set(ids)).toEqual(new Set(["c1", "zz1", ...state.missed!.flatMap((q) => q.answers.map((a) => a.id))]));
    expect(ids).not.toContain("zz5");
  });
});
