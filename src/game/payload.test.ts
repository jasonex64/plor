// Nothing in an unanswered question's payload may depend on the host bank or host answers (DECISIONS.md:
// Game 1, "Server is authoritative"). The check: change only the host data, and the payload must not change.
import { describe, expect, it } from "vitest";
import type { ApprovedPuzzle } from "@/content/puzzle";
import { fixtureDay, fixtureId } from "@/test/answer-fixture";
import type { Db } from "@/lib/db";
import { hostAnswers, named, publicQuestion, thingNames } from "./payload";

const puzzle = fixtureDay("2026-11-02", "2026-11-01T00:00:00Z");

// The same puzzle with the host bank and host answers moved to other members.
function withOtherHosts(p: ApprovedPuzzle): ApprovedPuzzle {
  return {
    ...p,
    questions: p.questions.map((q, i) => ({ ...q, host_bank: [fixtureId(i, "x"), fixtureId(i, "y")], host_answers: [fixtureId(i, "x")] })),
  };
}

describe("publicQuestion", () => {
  it("is identical whatever the host bank and host answers are", () => {
    const moved = withOtherHosts(puzzle);
    puzzle.questions.forEach((_, i) => {
      expect(JSON.stringify(publicQuestion(moved, i))).toBe(JSON.stringify(publicQuestion(puzzle, i)));
    });
  });

  it("carries only the prompt and the stolen letters, never the answers (human, 2026-10-21)", () => {
    expect(publicQuestion(puzzle, 0)).toEqual({ index: 0, prompt: puzzle.questions[0].prompt, stolen: [] });
    // Letters stay gone: by the last question, every letter stolen on the way (schedule A: q2, q4, q5, q7).
    const letters = [1, 3, 4, 6].map((i) => puzzle.questions[i].steals);
    expect(publicQuestion(puzzle, 6).stolen).toEqual(letters);
    expect(publicQuestion(puzzle, 2).stolen).toEqual(letters.slice(0, 1));
  });
});

describe("hostAnswers and named", () => {
  it("name the host answers by their main names, for a question that has been answered", () => {
    const q = puzzle.questions[0];
    expect(hostAnswers(q, new Map([[q.host_answers[0], "bear"]]))).toEqual([{ id: q.host_answers[0], name: "bear" }]);
  });

  it("refuse a thing with no name rather than show nothing", () => {
    expect(() => named(new Map(), "missing")).toThrow("thing missing has no name");
  });
});

// Every thing is shown in lowercase (human, 2026-10-27), whatever the base stores (13f-1).
describe("thingNames", () => {
  it("lowercases the names it reads", async () => {
    const db = { query: async () => ({ rows: [{ id: "a", name: "Washington, D.C." }, { id: "b", name: "Grey Wolf" }] }) } as unknown as Db;
    expect(await thingNames(db, ["a", "b"])).toEqual(new Map([["a", "washington, d.c."], ["b", "grey wolf"]]));
  });
});
