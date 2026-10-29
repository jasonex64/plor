// Dates and times as the pages write them, one way each (docs/milestones/M14-14b-2c-review-items.md, ROADMAP's repeated-formatting item, 14b-2c-4).

// A calendar day, "Wed 28 Oct" (round 10; L25's dated Yesterday), read in UTC so a date can't shift by a day.
export const dayText = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

// The calendar day a number of days before or after a YYYY-MM-DD date.
export function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// A moment, "26 Oct, 14:05", in the reader's own time zone: when a comment was reported or a decision made.
export const whenText = (at: string) => new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
