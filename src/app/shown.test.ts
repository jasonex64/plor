// The count-up's curve and steps (docs/milestones/M14-14b-10-calm-and-alive.md, 14b-10b, answers 26 and 27).
import { describe, expect, it } from "vitest";
import { countAt, ease } from "./shown";

describe("ease", () => {
  it("starts at 0, ends at 1, and never steps back", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    let last = 0;
    for (let i = 1; i <= 100; i++) {
      const y = ease(i / 100);
      expect(y).toBeGreaterThanOrEqual(last);
      last = y;
    }
  });

  // The curve's values found apart from this code, by bisecting x(s) for s (2026-10-30): 0.3967 and 0.9461.
  it("is cubic-bezier(0.2, 0.8, 0.2, 1): quick out, well past halfway at half the time", () => {
    expect(ease(0.1)).toBeCloseTo(0.3967, 3);
    expect(ease(0.5)).toBeCloseTo(0.9461, 3);
  });
});

describe("countAt", () => {
  it("counts whole numbers from one value to the other", () => {
    expect(countAt(0, 1250, 0)).toBe(0);
    expect(countAt(0, 1250, 1)).toBe(1250);
    expect(Number.isInteger(countAt(3, 17, 0.37))).toBe(true);
  });

  it("counts down as well, when a number falls (a streak broken)", () => {
    expect(countAt(9, 0, 1)).toBe(0);
    expect(countAt(9, 0, 0.5)).toBeLessThan(9);
  });
});
