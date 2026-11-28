import { describe, expect, it } from "vitest";
import { endedText } from "./ended-text";

describe("how a finished run reads in the feed", () => {
  it("says what a run scored and how many answers it gave", () => {
    expect(endedText({ result: "scored", points: 340, answers: 14 })).toBe("scored 340 points with 14 answers");
  });

  it("uses the singular for one point and one answer, and groups thousands", () => {
    expect(endedText({ result: "scored", points: 1, answers: 1 })).toBe("scored 1 point with 1 answer");
    expect(endedText({ result: "scored", points: 1200, answers: 0 })).toBe("scored 1,200 points with 0 answers");
  });
});
