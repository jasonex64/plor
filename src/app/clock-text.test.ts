import { describe, expect, it } from "vitest";
import { addedText, answersText } from "./clock-text";

describe("the clock game's words", () => {
  it("says the seconds an answer added, to one decimal only when not whole", () => {
    expect(addedText(5000)).toBe("+5 s");
    expect(addedText(2400)).toBe("+2.4 s");
    expect(addedText(7600)).toBe("+7.6 s");
  });

  it("counts answers, one in the singular", () => {
    expect(answersText(0)).toBe("0 answers");
    expect(answersText(1)).toBe("1 answer");
    expect(answersText(4)).toBe("4 answers");
  });
});
