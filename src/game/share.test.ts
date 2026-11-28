// The share text must never spoil the day (docs/milestones/M05-share.md): no prompt and no answer.
import { describe, expect, it } from "vitest";
import { GAME, SUBSTRINGS } from "@/platform/game";
import type { PlayedRound, SubstringRun } from "./substring-state";
import type { ClockAnswer, ClockState } from "./clock-state";
import { clockShareText, substringShareText } from "./share";

// Fragments' share (docs/milestones/M16-16f-the-shared-pieces.md, 16f-3; human, 2026-11-13, answer 34: "Score and round
// marks"): the name and day, one mark per round, found or missed, and the score.
function fragmentsRun(words: (string | null)[], total: number): SubstringRun {
  const rounds: PlayedRound[] = words.map((word, i) => ({ letters: `qx${i}`, word, points: word ? 50 : 0, bonus: 0, examples: word ? [] : ["spoileword"] }));
  return {
    date: "2026-11-14",
    status: "finished",
    total: 7,
    bonusLetter: "j",
    rounds,
    open: null,
    score: { words: total, bonus: 0, letters: 0, used: "abc", total },
    standing: null,
  };
}

describe("substringShareText", () => {
  it("marks each round found or missed and ends with the score, by a hand-worked run", () => {
    // Words in rounds 1, 2, 4, 5 and 7; rounds 3 and 6 missed; a score of 310.
    const run = fragmentsRun(["abc", "abd", null, "abe", "abf", null, "abg"], 310);
    expect(substringShareText(run)).toBe(`${SUBSTRINGS.name} · Nov 14\n🟩🟩⬜🟩🟩⬜🟩 310`);
  });

  it("shows a run of misses as all missed, with its score of 0", () => {
    expect(substringShareText(fragmentsRun(Array(7).fill(null), 0))).toBe(`${SUBSTRINGS.name} · Nov 14\n⬜⬜⬜⬜⬜⬜⬜ 0`);
  });

  it("holds no word, letters or examples from the run", () => {
    const run = fragmentsRun(["abc", null, "abd", "abe", "abf", "abg", "abh"], 300);
    const text = substringShareText(run);
    for (const spoiler of ["abc", "abd", "qx0", "qx1", "spoileword"]) expect(text).not.toContain(spoiler);
  });
});

// The clock game's share (docs/milestones/M23-23d-the-screens.md, "The share text"; answers 43 and 46): the score and a line of
// squares per question, one per answer by tier, wrapping every 10, and never a name.
describe("clockShareText", () => {
  const give = (index: number, tiers: ("common" | "uncommon" | "rare")[]): ClockAnswer[] =>
    tiers.map((tier, n) => ({ index, answer: { id: `id${index}${n}`, name: `secretname${index}${n}` }, tier, addedMs: 3000, points: 10 }));
  const over = (answers: ClockAnswer[], points: number): ClockState => ({
    format: 4,
    date: "2026-11-25",
    status: "over",
    total: 3,
    question: null,
    msLeft: null,
    answers,
    points,
    msToReset: 0,
    dayOver: false,
    missed: [],
  });
  const C = "common" as const;
  const U = "uncommon" as const;
  const R = "rare" as const;

  it("is the points, a line of squares per question in the order given, wrapped at 10", () => {
    const answers = [
      ...give(0, [C, C, U, C, R, C, U, C]),
      ...give(1, [C, U, C, C]),
      ...give(2, [C, C, C, R, U, C, C, C, U, C, C, U]),
    ];
    expect(clockShareText(over(answers, 340))).toBe(
      [`Plor ${GAME.name}, Nov 25: 340 points`, "1 🟩🟩🟦🟩🟪🟩🟦🟩", "2 🟩🟦🟩🟩", "3 🟩🟩🟩🟪🟦🟩🟩🟩🟦🟩", "  🟩🟦"].join("\n"),
    );
  });

  it("starts every full line of a question that wraps twice with the number only once", () => {
    const text = clockShareText(over(give(0, Array(21).fill(C)), 210)).split("\n");
    expect(text.slice(1, 4)).toEqual(["1 " + "🟩".repeat(10), "  " + "🟩".repeat(10), "  🟩"]);
  });

  it("gives a question with no answers its line, says one point as one point, and holds no answer's name", () => {
    const text = clockShareText(over(give(0, [R]), 1));
    expect(text.split("\n")).toEqual([`Plor ${GAME.name}, Nov 25: 1 point`, "1 🟪", "2", "3"]);
    expect(text).not.toContain("secretname");
  });
});
