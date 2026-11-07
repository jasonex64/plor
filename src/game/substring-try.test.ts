// A typed try's letters and text (src/game/substring-try.ts; DECISIONS.md, Game 2, "Matching and showing").
import { describe, expect, it } from "vitest";
import { cleanedTry, plainText, tryKey } from "./substring-try";

describe("tryKey", () => {
  it.each([
    ["apple", "apple"],
    ["app3le", "apple"],
    ["well-known", "wellknown"],
    ["well---known", "wellknown"],
    ["well known", "wellknown"],
    ["  Well Known  ", "wellknown"],
    ["CAFÉ", "cafe"],
    ["it´s", "its"],
    ["it`s", "its"],
    ["it's", "its"],
    ["s/he", "she"],
    ["123", ""],
    ["", ""],
    ["日本", ""],
  ])("%s is %s", (typed, key) => {
    expect(tryKey(typed)).toBe(key);
  });
});

describe("cleanedTry", () => {
  it("keeps letters, apostrophes and hyphens, lower-cased and trimmed", () => {
    expect(cleanedTry("  He's ")).toBe("he's");
    expect(cleanedTry("Well-Known")).toBe("well-known");
    expect(cleanedTry("caf3e")).toBe("cafe");
    expect(cleanedTry("well known")).toBe("wellknown");
    expect(cleanedTry("s/he")).toBe("she");
  });

  it("reads a phone's curly apostrophe as an apostrophe", () => {
    expect(cleanedTry("he\u2019s")).toBe("he's");
    expect(cleanedTry("can\u2019t")).toBe("can't");
    expect(cleanedTry("it\u2018s")).toBe("it's");
    expect(cleanedTry("won\u02BCt")).toBe("won't");
  });

  it("keeps accents, in one form however they were typed", () => {
    expect(cleanedTry("café")).toBe("café");
    expect(cleanedTry("CAFÉ")).toBe("café");
  });
});

describe("plainText", () => {
  it("takes accents off and leaves the rest", () => {
    expect(plainText("café")).toBe("cafe");
    expect(plainText("papier-mâché")).toBe("papier-mache");
    expect(plainText("he's")).toBe("he's");
  });
});
