// The share text must never spoil the day (docs/milestones/M05-share.md): no prompt, no player answer, no host
// answer. It shows the date and the rounds survived, whichever way the run ended (S1, S2).
import { describe, expect, it } from "vitest";
import type { AnsweredQuestion, RunState } from "./runs";
import { shareText } from "./share";

const PROMPTS = ["Name an animal", "Name a fruit", "Name a color", "Name a city", "Name a sport", "Name a tool", "Name a planet"];

function answered(index: number, matched: boolean): AnsweredQuestion {
  return {
    index,
    prompt: PROMPTS[index],
    answer: { id: `you${index}`, name: `youranswer${index}` },
    matched,
    hostAnswers: [{ id: `host${index}`, name: `hostanswer${index}` }],
    points: 0,
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
    msToReset: 0,
  };
}

describe("shareText", () => {
  it("shows all seven rounds for a perfect run", () => {
    expect(shareText(finished("survived", [false, false, false, false, false, false, false]))).toBe(
      "Offbeat · Oct 21\n🟩🟩🟩🟩🟩🟩🟩 7/7",
    );
  });

  it("shows the rounds survived before a catch", () => {
    expect(shareText(finished("died", [false, false, false, true]))).toBe("Offbeat · Oct 21\n🟩🟩🟩⬜⬜⬜⬜ 3/7");
  });

  it("shows a timed-out run the same way as a caught one (S1: rounds only, however it ended)", () => {
    expect(shareText(finished("timed_out", [false, false, false]))).toBe(
      shareText(finished("died", [false, false, false, true])),
    );
  });

  it("shows no rounds for a catch on question 1", () => {
    expect(shareText(finished("died", [true]))).toBe("Offbeat · Oct 21\n⬜⬜⬜⬜⬜⬜⬜ 0/7");
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
