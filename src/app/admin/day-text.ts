// A day as the admin pages write it, "Wed 28 Oct" (round 10), read in UTC so a date can't shift by a day.
export const dayText = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
