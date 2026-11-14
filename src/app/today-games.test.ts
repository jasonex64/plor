// Which of Today's game cards is in front, and which show (docs/milestones/M16-16f-the-shared-pieces.md, 16f-2; answers
// 5, 7 and 25).
import { describe, expect, it } from "vitest";
import { todayCards } from "./today-games";

const left = { over: false };
const over = { over: true };

describe("todayCards", () => {
  it("opens on Offbeat when neither is played", () => {
    expect(todayCards(left, left)).toEqual({ cards: ["offbeat", "substrings"], front: 0 });
  });

  it("opens on Fragments when Offbeat is over and Fragments is left to play", () => {
    expect(todayCards(over, left)).toEqual({ cards: ["offbeat", "substrings"], front: 1 });
  });

  it("opens on Offbeat when only Fragments is over", () => {
    expect(todayCards(left, over)).toEqual({ cards: ["offbeat", "substrings"], front: 0 });
  });

  it("opens on Offbeat when both are over", () => {
    expect(todayCards(over, over)).toEqual({ cards: ["offbeat", "substrings"], front: 0 });
  });

  it("shows only the game that has an approved day", () => {
    expect(todayCards(left, null)).toEqual({ cards: ["offbeat"], front: 0 });
    expect(todayCards(null, left)).toEqual({ cards: ["substrings"], front: 0 });
    expect(todayCards(null, over)).toEqual({ cards: ["substrings"], front: 0 });
  });

  it("shows Offbeat's no-puzzle card when neither has a day", () => {
    expect(todayCards(null, null)).toEqual({ cards: ["offbeat"], front: 0 });
  });
});
