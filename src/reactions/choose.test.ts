// The reaction row shown before the server answers (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b).
import { describe, expect, it } from "vitest";
import { choose } from "./choose";

describe("choose", () => {
  it("adds a first reaction", () => {
    expect(choose({ counts: [], mine: null }, "😂")).toEqual({ counts: [{ emoji: "😂", count: 1 }], mine: "😂" });
  });

  it("moves the player's reaction, keeping the set's order", () => {
    const row = { counts: [{ emoji: "👍" as const, count: 2 }, { emoji: "❤️" as const, count: 1 }], mine: "👍" as const };
    expect(choose(row, "😂")).toEqual({
      counts: [
        { emoji: "👍", count: 1 },
        { emoji: "😂", count: 1 },
        { emoji: "❤️", count: 1 },
      ],
      mine: "😂",
    });
  });

  it("removes the player's reaction, dropping an emoji nobody else used", () => {
    expect(choose({ counts: [{ emoji: "😮", count: 1 }], mine: "😮" }, null)).toEqual({ counts: [], mine: null });
  });
});
