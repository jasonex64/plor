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

// A day on a clock holds its draft and live under `clock` (src/admin/puzzles.ts), so the warning must read them there too.
describe("tomorrowOf for a day on a clock", () => {
  const clockDay = (date: string, draft: boolean, live: boolean): DayView => ({
    date,
    draft: null,
    live: null,
    started: false,
    clock: { draft: draft ? { picks: [], questions: [], menu: [] } : null, live: live ? [] : null },
  });

  it("finds an approved and a drafted tomorrow, as for a day of seven questions", () => {
    expect(tomorrowOf("2026-12-01", [clockDay("2026-12-02", true, true)]).state).toBe("approved");
    expect(tomorrowOf("2026-12-01", [clockDay("2026-12-02", true, false)]).state).toBe("drafted");
  });
});
