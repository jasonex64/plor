import { describe, expect, it } from "vitest";
import type { Puzzle, Question } from "@/content/puzzle";
import { buildInsights, type AnswerRow } from "./report";

function question(prompt: string, ids: string[], host: string[], bank: string[]): Question {
  return { prompt, entries: ids.map((id) => ({ id, name: id, aliases: [] })), host_bank: bank, host_answers: host, match_groups: {} };
}
const animals = ["dog", "cat", "axolotl", "lion", "owl", "yak", "emu"];
const puzzle: Puzzle = {
  format: 2,
  game_id: "offbeat",
  date: "2026-10-26",
  questions: [
    question("Q1", animals, ["dog"], ["dog", "cat"]),
    question("Q2", animals, ["cat"], ["cat", "dog"]),
    question("Q3", animals, ["lion"], ["lion"]),
    question("Q4", animals, ["owl"], ["owl"]),
  ],
};

// n answers to question idx: `caught` of them the host answer, the rest spread over other entries in order.
function answers(idx: number, n: number, caught: number, host: string, others: string[]): AnswerRow[] {
  return Array.from({ length: n }, (_, i) =>
    i < caught ? { question_idx: idx, entry_id: host, matched: true } : { question_idx: idx, entry_id: others[(i - caught) % others.length], matched: false },
  );
}

const rows = [
  ...answers(0, 10, 2, "dog", ["cat", "axolotl"]), // 20%
  ...answers(1, 10, 5, "cat", ["yak"]), // 50%
  ...answers(2, 10, 3, "lion", ["emu"]), // 30%: 20 points below Q2
  ...answers(3, 4, 0, "owl", ["emu"]), // too few
];

describe("buildInsights", () => {
  const day = buildInsights("2026-10-26", true, puzzle, rows, []);

  it("counts answers, catches and the catch rate per question", () => {
    expect(day.questions.map((q) => [q.answered, q.caught, q.catchRate])).toEqual([
      [10, 2, 0.2],
      [10, 5, 0.5],
      [10, 3, 0.3],
      [4, 0, 0],
    ]);
  });

  it("names the host answers", () => {
    expect(day.questions[0].hostAnswers).toEqual([{ id: "dog", name: "dog" }]);
  });

  it("measures the share of answers in the host bank, matched or not", () => {
    // Q1: 2 dog (host) + 4 cat (host bank, not host) + 4 axolotl.
    expect(day.questions[0].hostBankShare).toBe(0.6);
  });

  it("marks a question with fewer than 5 players as too few", () => {
    expect(day.questions.map((q) => q.tooFew)).toEqual([false, false, false, true]);
  });

  it("flags a later question that catches 10+ points fewer than an earlier one", () => {
    expect(day.questions.map((q) => q.breaksShape)).toEqual([false, false, true, false]);
  });

  it("doesn't let an earlier question with too few players flag a later one (M02 2f, B14)", () => {
    // Q1: 4 players, all caught (100%, too few). Q2: 10 players, 2 caught (20%), 80 points lower but not flagged.
    const day = buildInsights("d", true, puzzle, [...answers(0, 4, 4, "dog", ["cat"]), ...answers(1, 10, 2, "cat", ["yak"])], []);
    expect(day.questions.slice(0, 2).map((q) => [q.tooFew, q.breaksShape])).toEqual([
      [true, false],
      [false, false],
    ]);
  });

  it("counts a dip of exactly 10 points, and not 9", () => {
    const at = (laterCaught: number) =>
      buildInsights("d", true, puzzle, [...answers(0, 10, 4, "dog", ["cat"]), ...answers(1, 10, laterCaught, "cat", ["yak"])], []).questions[1].breaksShape;
    expect(at(3)).toBe(true); // 40% → 30%
    expect(at(4)).toBe(false); // 40% → 40%
    // 30% → 20% is 9.999… in floating point; the comparison must be exact.
    const exact = buildInsights("d", true, puzzle, [...answers(0, 10, 3, "dog", ["cat"]), ...answers(1, 10, 2, "cat", ["yak"])], []);
    expect(exact.questions[1].breaksShape).toBe(true);
    const nine = buildInsights("d", true, puzzle, [...answers(0, 100, 40, "dog", ["cat"]), ...answers(1, 100, 31, "cat", ["yak"])], []);
    expect(nine.questions[1].breaksShape).toBe(false); // 40% → 31%
  });

  it("lists the 5 most common answers, ties by name", () => {
    const spread = ["cat", "cat", "axolotl", "axolotl", "lion", "owl", "yak", "emu"].map((id) => ({ question_idx: 0, entry_id: id, matched: false }));
    const top = buildInsights("d", true, puzzle, spread, []).questions[0].topAnswers;
    expect(top.map((t) => [t.answer.id, t.count])).toEqual([
      ["axolotl", 2],
      ["cat", 2],
      ["emu", 1],
      ["lion", 1],
      ["owl", 1],
    ]);
  });

  it("groups misses that differ only in case, spacing or accents, most common first", () => {
    const misses = [
      { question_idx: 0, typed: "Okapi" },
      { question_idx: 0, typed: "okapi" },
      { question_idx: 0, typed: "okapi" },
      { question_idx: 0, typed: "Pokémon" },
      { question_idx: 1, typed: "okapi" },
    ];
    expect(buildInsights("d", true, puzzle, [], misses).questions[0].misses).toEqual([
      { text: "okapi", count: 3 },
      { text: "Pokémon", count: 1 },
    ]);
  });

  it("reports a question nobody answered without a rate", () => {
    const empty = buildInsights("d", false, puzzle, [], []);
    expect(empty.questions[0]).toMatchObject({ answered: 0, catchRate: null, hostBankShare: null, tooFew: true, breaksShape: false });
    expect(empty.finished).toBe(false);
  });
});
