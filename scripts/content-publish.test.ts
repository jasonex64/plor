import { describe, expect, it } from "vitest";
import { dateGaps } from "./content-publish";

describe("dateGaps", () => {
  it("accepts consecutive dates in any order, across a month end", () => {
    expect(dateGaps(["2026-11-01", "2026-10-31", "2026-10-30"])).toEqual([]);
  });

  it("names each gap", () => {
    expect(dateGaps(["2026-10-26", "2026-10-27", "2026-10-29"])).toEqual(["no puzzle between 2026-10-27 and 2026-10-29 (expected 2026-10-28)"]);
  });

  it("finds a duplicate date as a gap too", () => {
    expect(dateGaps(["2026-10-26", "2026-10-26"])).toHaveLength(1);
  });
});
