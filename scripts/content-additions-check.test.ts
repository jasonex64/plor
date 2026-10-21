import { describe, expect, it } from "vitest";
import type { Puzzle } from "../src/content/puzzle.ts";
import { compareAdditions } from "./content-additions-check.ts";

const before: Puzzle = {
  format: 1,
  game_id: "offbeat",
  date: "2026-10-26",
  questions: [
    {
      prompt: "Name a pet",
      entries: [
        { id: "dog", name: "dog", aliases: ["dogs"] },
        { id: "cat", name: "cat", aliases: ["cats"] },
      ],
      host_bank: ["dog", "cat"],
      host_answers: ["dog"],
      match_groups: {},
    },
  ],
};
const clone = (): Puzzle => JSON.parse(JSON.stringify(before));

describe("compareAdditions", () => {
  it("accepts new entries and new aliases", () => {
    const after = clone();
    after.questions[0].entries[0].aliases.push("puppy");
    after.questions[0].entries.push({ id: "axolotl", name: "axolotl", aliases: ["axolotls"] });
    expect(compareAdditions("f", before, after)).toEqual({ problems: [], newEntries: 1, newAliases: 1 });
  });

  it.each([
    ["a host answer", (p: Puzzle) => (p.questions[0].host_answers = ["cat"])],
    ["the host bank", (p: Puzzle) => p.questions[0].host_bank.pop()],
    ["the prompt", (p: Puzzle) => (p.questions[0].prompt = "Name an animal")],
    ["an entry's name", (p: Puzzle) => (p.questions[0].entries[1].name = "kitty")],
    ["an entry removed", (p: Puzzle) => p.questions[0].entries.pop()],
    ["an alias removed", (p: Puzzle) => (p.questions[0].entries[0].aliases = [])],
    ["a match group", (p: Puzzle) => (p.questions[0].match_groups = { dog: ["cat"] })],
  ])("reports a change to %s", (_, change) => {
    const after = clone();
    change(after);
    expect(compareAdditions("f", before, after).problems).toHaveLength(1);
  });
});
