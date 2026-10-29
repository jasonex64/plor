// Tomorrow's puzzle for the admin's warning (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6f; criterion 7).
import { describe, expect, it } from "vitest";
import type { DayView } from "@/admin/puzzles";
import { tomorrowOf, warningOf } from "./tomorrow";

const day = (date: string, draft: boolean, live: boolean): DayView => ({ date, draft: draft ? [] : null, live: live ? [] : null, started: false });

describe("tomorrowOf and warningOf", () => {
  it("finds no warning when tomorrow is approved, across a month's end", () => {
    const tomorrow = tomorrowOf("2026-10-31", [day("2026-10-31", true, true), day("2026-11-01", true, true)]);
    expect(tomorrow).toEqual({ date: "2026-11-01", state: "approved" });
    expect(warningOf(tomorrow)).toBeNull();
  });

  it("says to approve a drafted tomorrow", () => {
    expect(warningOf(tomorrowOf("2026-10-29", [day("2026-10-30", true, false)]))).toEqual({
      what: "Tomorrow isn't approved",
      todo: "Approve it before midnight Pacific",
    });
  });

  it("says to draft a missing tomorrow, whatever later days hold", () => {
    expect(warningOf(tomorrowOf("2026-10-29", [day("2026-10-29", true, true), day("2026-10-31", true, true)]))).toEqual({
      what: "Tomorrow has no puzzle",
      todo: "Draft it before midnight Pacific",
    });
  });
});
