import { describe, expect, it } from "vitest";
import { isListed } from "./misses";

// The held-word check (human, 2026-10-24: "Hold listed words (Recommended)") matches whole words of the normalized
// text, so a listed word inside a harmless one doesn't hold it.
describe("isListed", () => {
  it("holds a text that is, or holds, a listed word or phrase", () => {
    expect(isListed("butt")).toBe(true);
    expect(isListed("big butt")).toBe(true);
    expect(isListed("2 girls 1 cup")).toBe(true);
  });

  it("doesn't hold a listed word inside another word", () => {
    expect(isListed("button")).toBe(false);
    expect(isListed("scunthorpe")).toBe(false);
  });
});
