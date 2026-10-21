// Nothing in an unanswered question's payload may depend on the host bank or host answers (DECISIONS.md:
// Game 1, "Server is authoritative"). The check: change only the host data, and the payload must not change.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Puzzle } from "@/content/puzzle";
import { hostAnswers, publicQuestion } from "./payload";

const puzzle: Puzzle = JSON.parse(readFileSync("content/offbeat/2026-10-26.json", "utf8"));

// The same puzzle with the host bank and host answers moved to other entries, and a match group added.
function withOtherHosts(p: Puzzle): Puzzle {
  return {
    ...p,
    questions: p.questions.map((q) => {
      const others = q.entries.map((e) => e.id).filter((id) => !q.host_bank.includes(id));
      return { ...q, host_bank: others.slice(0, q.host_bank.length), host_answers: [others[0]], match_groups: { [others[0]]: [others[1]] } };
    }),
  };
}

describe("publicQuestion", () => {
  it("is identical whatever the host bank, host answers and match groups are", () => {
    const moved = withOtherHosts(puzzle);
    puzzle.questions.forEach((_, i) => {
      expect(JSON.stringify(publicQuestion(moved, i))).toBe(JSON.stringify(publicQuestion(puzzle, i)));
    });
  });

  it("carries only the prompt, never the answer list (human, 2026-10-21)", () => {
    const q = publicQuestion(puzzle, 0);
    expect(q).toEqual({ index: 0, prompt: puzzle.questions[0].prompt });
  });
});

describe("hostAnswers", () => {
  it("names the host answers, for a question that has been answered", () => {
    const q = puzzle.questions[0];
    expect(hostAnswers(q).map((h) => h.id)).toEqual(q.host_answers);
  });
});
