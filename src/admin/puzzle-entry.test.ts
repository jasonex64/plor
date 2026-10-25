// Puzzle entry's pure step (docs/milestones/M06-puzzle-entry.md): applying the host answers chosen on the review page
// before the day is checked and approved.
import { describe, expect, it } from "vitest";
import { checkPuzzle } from "@/content/puzzle";
import { fixtureDraft, fixtureId } from "@/test/answer-fixture";
import { withHostAnswers } from "./puzzle-entry";

const draft = fixtureDraft("2026-11-02");

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
