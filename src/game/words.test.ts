// The three tiers' edges (docs/milestones/M14-14c-1-name-and-words.md, criterion 3): stops 2, 3, 5 and 6.
import { describe, expect, it } from "vitest";
import { caughtText, gotPastText, timedOutText, tierOf } from "./words";

describe("the tiers (stops 1-2, 3-5, 6-7)", () => {
  it("puts each edge stop in its tier", () => {
    expect([1, 2, 3, 5, 6, 7].map(tierOf)).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("names getting past a stop by its tier", () => {
    expect([2, 3, 5, 6].map(gotPastText)).toEqual(["Steady!", "Holding on!", "Holding on!", "Still standing!"]);
  });

  it("names a catch by its tier, with the stop", () => {
    expect([2, 3, 5, 6].map(caughtText)).toEqual(["tipped over at stop 2", "tumbled at stop 3", "tumbled at stop 5", "sent flying at stop 6"]);
  });

  it("names a timeout by its tier, with the stop", () => {
    expect([2, 3, 5, 6].map(timedOutText)).toEqual(["dozed off at stop 2", "stalled at stop 3", "stalled at stop 5", "frozen solid at stop 6"]);
  });
});
