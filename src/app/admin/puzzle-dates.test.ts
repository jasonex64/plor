import { describe, expect, it } from "vitest";
import { slotDates } from "./puzzle-dates";

describe("slotDates", () => {
  it("lists a date once when both games have it, and each game's own dates, oldest first", () => {
    expect(slotDates(["2026-11-18", "2026-11-17"], ["2026-11-19", "2026-11-18"], null)).toEqual(["2026-11-17", "2026-11-18", "2026-11-19"]);
  });

  it("adds tomorrow's empty slot among them, and lists a date only Fragments has", () => {
    expect(slotDates(["2026-11-17"], ["2026-11-20"], "2026-11-16")).toEqual(["2026-11-16", "2026-11-17", "2026-11-20"]);
  });

  it("is empty when neither game has a day and tomorrow isn't empty", () => {
    expect(slotDates([], [], null)).toEqual([]);
  });
});
