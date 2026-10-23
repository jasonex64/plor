// Which week a day belongs to (docs/milestones/M10-groups.md, 10a): weeks run Monday to Sunday by puzzle day
// (ROADMAP "Design review", 2), so Sunday is the last day of its week, not the first.
import { describe, expect, it } from "vitest";
import { weekStart } from "./leaderboard";

describe("weekStart", () => {
  it.each([
    ["2026-10-25", "2026-10-19"], // a Sunday ends the week that began the Monday before
    ["2026-10-26", "2026-10-26"], // a Monday starts its own week
    ["2026-10-31", "2026-10-26"], // a Saturday
    ["2026-11-01", "2026-10-26"], // the Sunday the clocks go back, a 25-hour day in Pacific time
    ["2027-01-01", "2026-12-28"], // across a year
    ["2028-03-01", "2028-02-28"], // across a leap day
  ])("puts %s in the week from %s", (day, monday) => {
    expect(weekStart(day)).toBe(monday);
  });
});
