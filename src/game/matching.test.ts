import { describe, expect, it } from "vitest";
import type { Question } from "../content/puzzle.ts";
import { editDistanceAtMost, matchAnswer, resolveTyped } from "./matching.ts";

const question: Question = {
  prompt: "Name a pet",
  entries: [
    { id: "dog", name: "dog", aliases: ["dogs"] },
    { id: "puppy", name: "puppy", aliases: ["puppies"] },
    { id: "cat", name: "cat", aliases: ["cats"] },
    { id: "hamster", name: "hamster", aliases: ["hamsters"] },
    { id: "axolotl", name: "axolotl", aliases: ["axolotls"] },
  ],
  host_bank: ["dog", "cat", "hamster"],
  host_answers: ["dog", "cat"],
  match_groups: { dog: ["puppy"] },
};

describe("matchAnswer", () => {
  it("matches a host answer itself", () => {
    expect(matchAnswer(question, "dog")).toBe("matched");
  });

  it("matches a host answer that has no match group", () => {
    expect(matchAnswer(question, "cat")).toBe("matched");
  });

  it("matches an entry in a host answer's group", () => {
    expect(matchAnswer(question, "puppy")).toBe("matched");
  });

  it("does not match a host-bank entry that isn't a host answer", () => {
    expect(matchAnswer(question, "hamster")).toBe("not_matched");
  });

  it("does not match a niche answer", () => {
    expect(matchAnswer(question, "axolotl")).toBe("not_matched");
  });

  it("only uses groups of host answers", () => {
    const groupOnNonHost: Question = { ...question, host_answers: ["cat"], match_groups: { dog: ["puppy"] } };
    expect(matchAnswer(groupOnNonHost, "puppy")).toBe("not_matched");
  });
});

describe("editDistanceAtMost", () => {
  it.each([
    ["passprt", "passport", true], // a letter missing
    ["passsport", "passport", true], // a letter extra
    ["passpord", "passport", true], // a letter wrong
    ["paspsort", "passport", true], // two neighbours swapped
    ["pasprt", "passport", false], // two letters missing
    ["pasdpord", "passport", false], // two letters wrong, same length (2c review)
    ["abcd", "badc", false], // two swaps, same length (2c review)
    ["passport", "passport", true],
  ])("%s → %s within one edit: %s", (a, b, within) => {
    expect(editDistanceAtMost(a, b, 1)).toBe(within);
  });
});

describe("resolveTyped", () => {
  const animals: Question = {
    prompt: "Name an animal",
    entries: [
      { id: "mouse", name: "mouse", aliases: ["mice"] },
      { id: "moose", name: "moose", aliases: [] },
      { id: "passport", name: "passport", aliases: ["passports"] },
      { id: "cat", name: "cat", aliases: ["cats", "house cat"] },
      { id: "car", name: "car", aliases: ["cars"] },
    ],
    host_bank: ["mouse"],
    host_answers: ["mouse"],
    match_groups: {},
  };

  it("finds an entry by its name or an alias, after normalization", () => {
    expect(resolveTyped(animals, "  Mouse ")).toBe("mouse");
    expect(resolveTyped(animals, "MICE")).toBe("mouse");
    expect(resolveTyped(animals, "house cat")).toBe("cat");
  });

  // Rules to build, rule 2: exact before typo. "moose" is one letter from the host "mouse" and must stay moose.
  it("prefers an exact name to a typo of another entry", () => {
    expect(resolveTyped(animals, "moose")).toBe("moose");
    expect(matchAnswer(animals, resolveTyped(animals, "moose")!)).toBe("not_matched");
  });

  it("auto-corrects one typo of 4+ letters to the only entry that close (human, 2026-10-21)", () => {
    expect(resolveTyped(animals, "passprt")).toBe("passport");
    expect(resolveTyped(animals, "carz")).toBe("car");
  });

  it("names no entry when two are one typo away, instead of guessing", () => {
    // "mose" is one letter short of both "mouse" and "moose".
    expect(resolveTyped(animals, "mose")).toBeNull();
  });

  it("doesn't auto-correct text under 4 letters, and doesn't count spaces as letters (M02 2f, B4)", () => {
    expect(resolveTyped(animals, "cst")).toBeNull();
    expect(resolveTyped(animals, "ca t")).toBeNull();
  });

  it("names no entry for text that is in no list, or empty", () => {
    expect(resolveTyped(animals, "unicorn")).toBeNull();
    expect(resolveTyped(animals, "   ")).toBeNull();
  });
});
