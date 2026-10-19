import { describe, expect, it } from "vitest";
import type { Question } from "@/content/puzzle";
import { matchAnswer } from "./matching";

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

  it("rejects an ID that isn't in the accepted bank", () => {
    expect(matchAnswer(question, "unicorn")).toBe("invalid_entry");
  });

  it("only uses groups of host answers", () => {
    const groupOnNonHost: Question = { ...question, host_answers: ["cat"], match_groups: { dog: ["puppy"] } };
    expect(matchAnswer(groupOnNonHost, "puppy")).toBe("not_matched");
  });
});
