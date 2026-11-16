// A day's place (docs/milestones/M16-16e-points-and-boards.md, answers 25 and 26, and "16e-2 in detail").
import { describe, expect, it } from "vitest";
import { percentile } from "./percentile";

describe("percentile", () => {
  it("is the share of the others beaten", () => {
    expect(percentile(50, [10, 20, 60, 70])).toBe(50);
    expect(percentile(80, [10, 20, 60, 70])).toBe(100);
    expect(percentile(5, [10, 20, 60, 70])).toBe(0);
  });

  it("counts a tie as half", () => {
    expect(percentile(20, [10, 20, 60, 70])).toBe(37.5);
    expect(percentile(20, [20])).toBe(50);
  });

  it("keeps one decimal", () => {
    expect(percentile(20, [10, 30, 40])).toBe(33.3);
    expect(percentile(35, [10, 30, 40])).toBe(66.7);
  });

  it("is 100 for a day with no other player", () => {
    expect(percentile(0, [])).toBe(100);
  });
});
