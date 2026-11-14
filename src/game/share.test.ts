// The share text must never spoil the day (docs/milestones/M05-share.md): no prompt, no player answer, no host
// answer. It shows the date and the rounds survived, whichever way the run ended (S1, S2).
import { describe, expect, it } from "vitest";
import type { AnsweredQuestion, RunState } from "./runs";
import { GAME, SUBSTRINGS } from "@/platform/game";
import type { PlayedRound, SubstringRun } from "./substring-state";
import { shareText, substringShareText } from "./share";

const PROMPTS = ["Name an animal", "Name a fruit", "Name a color", "Name a city", "Name a sport", "Name a tool", "Name a planet"];

function answered(index: number, matched: boolean): AnsweredQuestion {
  return {
    index,
    prompt: PROMPTS[index],
    answer: { id: `you${index}`, name: `youranswer${index}` },
    matched,
    tier: "rare",
    hostAnswers: [{ id: `host${index}`, name: `hostanswer${index}` }],
    points: 0,
    bonus: 0,
    share: null,
    inDay: true,
  };
}

function finished(status: RunState["status"], outcomes: boolean[]): RunState {
  return {
    date: "2026-10-21",
    status,
    total: 7,
    answered: outcomes.map((matched, i) => answered(i, matched)),
    question: null,
    msLeft: null,
    next: null,
    points: 0,
    bonus: 0,
    msToReset: 0,
    dayOver: false,
  };
}

describe("shareText", () => {
  it("shows all seven rounds for a perfect run", () => {
    expect(shareText(finished("survived", [false, false, false, false, false, false, false]))).toBe(
      `${GAME.name} · Oct 21\n🟩🟩🟩🟩🟩🟩🟩 7/7`,
    );
  });

  it("shows the rounds survived before a catch", () => {
    expect(shareText(finished("died", [false, false, false, true]))).toBe(`${GAME.name} · Oct 21\n🟩🟩🟩⬜⬜⬜⬜ 3/7`);
  });

  it("shows a timed-out run the same way as a caught one (S1: rounds only, however it ended)", () => {
    expect(shareText(finished("timed_out", [false, false, false]))).toBe(
      shareText(finished("died", [false, false, false, true])),
    );
  });

  it("shows no rounds for a catch on question 1", () => {
    expect(shareText(finished("died", [true]))).toBe(`${GAME.name} · Oct 21\n⬜⬜⬜⬜⬜⬜⬜ 0/7`);
  });

  it("holds no prompt, player answer or host answer from the run", () => {
    const run = finished("died", [false, false, false, false, false, false, true]);
    const text = shareText(run);
    for (const a of run.answered) {
      for (const spoiler of [a.prompt, a.answer.name, ...a.hostAnswers.map((h) => h.name)]) {
        expect(text).not.toContain(spoiler);
      }
    }
  });
});

// Fragments' share (docs/milestones/M16-16f-the-shared-pieces.md, 16f-3; human, 2026-11-13, answer 34: "Score and round
// marks"): the name and day as Offbeat's, one mark per round, found or missed, and the score where Offbeat's n/total is.
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
