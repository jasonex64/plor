// Puzzle entry's pure steps (docs/milestones/M06-puzzle-entry.md): reading the 7 questions an admin typed, and
// applying the host answers chosen on the review page before the day is checked and approved.
import { describe, expect, it } from "vitest";
import { checkPuzzle } from "@/content/puzzle";
import { fixtureDraft, fixtureId } from "@/test/answer-fixture";
import { copyForClaude, readQuestions, withHostAnswers } from "./puzzle-entry";

const draft = fixtureDraft("2026-11-02");
const seven = ["Name a fruit", "Name a pet", "Name a city", "Name a tool", "Name a sport", "Name a color", "Name a planet"];

describe("readQuestions", () => {
  it("accepts 7 questions and trims them", () => {
    expect(readQuestions(seven.map((q) => `  ${q} `))).toEqual(seven);
  });

  it("refuses the wrong count, an empty question, or anything that isn't a list of text", () => {
    expect(readQuestions(seven.slice(0, 6))).toBeNull();
    expect(readQuestions([...seven.slice(0, 6), "   "])).toBeNull();
    expect(readQuestions([...seven.slice(0, 6), 7])).toBeNull();
    expect(readQuestions("Name a fruit")).toBeNull();
  });
});

describe("copyForClaude", () => {
  it("holds the date, the numbered questions and where the drafting steps are", () => {
    const text = copyForClaude("2026-10-25", seven);
    expect(text).toContain("2026-10-25");
    expect(text).toContain("1. Name a fruit");
    expect(text).toContain("7. Name a planet");
    expect(text).toContain("Puzzle drafting");
  });
});

describe("withHostAnswers", () => {
  const unchanged = draft.questions.map((q) => q.host_answers);

  it("keeps a drafted day as it is when the suggested host answers are kept", () => {
    expect(withHostAnswers(draft, unchanged)).toEqual(draft);
  });

  it("sets a changed host answer and adds it to the host bank, which the rules require", () => {
    const other = fixtureId(0, "cat");
    const changed = withHostAnswers(draft, [[other], ...unchanged.slice(1)]);
    expect(changed.questions[0].host_answers).toEqual([other]);
    expect(changed.questions[0].host_bank).toContain(other);
    expect(checkPuzzle("day", changed)).toEqual([]);
    // The draft itself is left alone.
    expect(draft.questions[0].host_answers).toEqual(unchanged[0]);
  });

  it("refuses a list that doesn't have one entry per question", () => {
    expect(() => withHostAnswers(draft, unchanged.slice(1))).toThrow();
  });
});
