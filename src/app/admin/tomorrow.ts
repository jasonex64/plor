// Whether tomorrow (Pacific: the day after the server's today, private.today()) has a puzzle, for the admin's warning
// (docs/milestones/M14-14b-6-feel-and-polish.md, design 7, 14b-6f): approved, drafted but not approved, or missing.
import type { DayView } from "@/admin/puzzles";
import { shiftDay } from "../day-text";

export type Tomorrow = { date: string; state: "approved" | "drafted" | "missing" };

export function tomorrowOf(today: string, days: DayView[]): Tomorrow {
  const date = shiftDay(today, 1);
  const day = days.find((d) => d.date === date);
  return { date, state: day?.live ? "approved" : day?.draft ? "drafted" : "missing" };
}

// The warning's two lines, saying which case it is and what to do (answers 27 and 28), or null when tomorrow is
// approved.
export function warningOf(tomorrow: Tomorrow): { what: string; todo: string } | null {
  if (tomorrow.state === "approved") return null;
  return tomorrow.state === "drafted"
    ? { what: "Tomorrow isn't approved", todo: "Approve it before midnight Pacific" }
    : { what: "Tomorrow has no puzzle", todo: "Draft it before midnight Pacific" };
}
