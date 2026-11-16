import { describe, expect, it } from "vitest";
import { parScore, scoreAverage, scoreTotal } from "./par";

describe("parScore", () => {
  it("is the points' share of the par, out of 100", () => {
    expect(parScore(0, 1500)).toBe(0);
    expect(parScore(750, 1500)).toBe(50);
    expect(parScore(1250, 1250)).toBe(100);
  });

  it("keeps one decimal", () => {
    expect(parScore(1400, 1500)).toBe(93.3);
    expect(parScore(100, 1500)).toBe(6.7);
  });

  it("stops at 100 over the par", () => {
    expect(parScore(1500, 1250)).toBe(100);
  });

  it("keeps two close runs close", () => {
    expect(parScore(1500, 1500) - parScore(1400, 1500)).toBeCloseTo(6.7);
  });
});

describe("scoreTotal", () => {
  it("adds days' scores without floating-point drift", () => {
    expect(scoreTotal([33.3, 33.3, 33.4])).toBe(100);
    expect(scoreTotal([0.1, 0.2])).toBe(0.3);
  });
});

describe("scoreAverage", () => {
  it("divides the scores by the game-days played, to one decimal", () => {
    expect(scoreAverage([66.7, 0, 0, 75])).toBe(35.4);
    expect(scoreAverage([100])).toBe(100);
  });

  it("is 0 with no game-day", () => {
    expect(scoreAverage([])).toBe(0);
  });
});
