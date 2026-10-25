// The feed's locked text, each branch (docs/milestones/M14-14a-2a-today.md, criterion 4).
import { describe, expect, it } from "vitest";
import { previewText } from "./preview";

describe("previewText", () => {
  it("says nothing to read when nobody commented", () => {
    expect(previewText({ friends: [], others: 0, count: 0, reactions: 0 })).toEqual({ named: [], more: null, read: null });
  });

  it("names up to 3 friends and counts the rest, group members who aren't friends included", () => {
    expect(previewText({ friends: ["Sam", "Mira", "Lee", "Ari"], others: 1, count: 6, reactions: 2 })).toEqual({
      named: ["Sam", "Mira", "Lee"],
      more: "and 2 more",
      read: "Finish today's Offbeat to read 6 comments",
    });
  });

  it("names every friend when there are 3 or fewer and nobody else", () => {
    expect(previewText({ friends: ["Sam"], others: 0, count: 1, reactions: 0 })).toEqual({
      named: ["Sam"],
      more: null,
      read: "Finish today's Offbeat to read 1 comment",
    });
  });

  it("only counts when no friend commented", () => {
    expect(previewText({ friends: [], others: 2, count: 3, reactions: 0 }).more).toBe("2 players commented");
  });
});
