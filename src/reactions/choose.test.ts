// The reaction row shown before the server answers (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b).
import { describe, expect, it } from "vitest";
import { choose } from "./choose";

describe("choose", () => {
  it("adds a first reaction", () => {
    expect(choose({ counts: [], mine: null }, "😂")).toEqual({ counts: [{ emoji: "😂", count: 1, names: [] }], mine: "😂" });
  });

  it("moves the player's reaction, keeping the set's order", () => {
    // The others' names stay with their emoji: the player's own is mine, never a name (M20 20j).
    const row = { counts: [{ emoji: "👍" as const, count: 2, names: ["Ana"] }, { emoji: "❤️" as const, count: 1, names: ["Ben"] }], mine: "👍" as const };
    expect(choose(row, "😂")).toEqual({
      counts: [
        { emoji: "👍", count: 1, names: ["Ana"] },
        { emoji: "😂", count: 1, names: [] },
        { emoji: "❤️", count: 1, names: ["Ben"] },
      ],
      mine: "😂",
    });
  });

  it("removes the player's reaction, dropping an emoji nobody else used", () => {
    expect(choose({ counts: [{ emoji: "😮", count: 1, names: [] }], mine: "😮" }, null)).toEqual({ counts: [], mine: null });
  });
});
