// The streak's rank at each boundary (docs/milestones/M14-14b-2a-streak-ranks.md, criterion 2), and the days /streak
// lists for each.
import { describe, expect, it } from "vitest";
import { RANKS, rankDays, rankFor } from "./ranks";

describe("the streak's rank", () => {
  it.each([
    [0, "Seed"],
    [1, "Daisy"],
    [4, "Daisy"],
    [5, "Morning glory"],
    [14, "Morning glory"],
    [15, "Hibiscus"],
    [29, "Hibiscus"],
    [30, "Lotus"],
    [89, "Lotus"],
    [90, "Sakura"],
    [400, "Sakura"],
  ])("at %i days is %s", (days, name) => {
    expect(rankFor(days).name).toBe(name);
  });

  it("lists each rank's days for /streak", () => {
    expect(RANKS.map(rankDays)).toEqual(["0 days", "1–4 days", "5–14 days", "15–29 days", "30–89 days", "90 days and up"]);
  });
});
