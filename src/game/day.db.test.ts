// private.today() and private.day_of() around midnight in America/Los_Angeles (docs/milestones/M00-data-design.md
// §8; M02 ticket). The instants come from the IANA tz database as Node's ICU ships it, not from hand arithmetic,
// and the database's own tz data must agree (ROADMAP: verify Supabase has current tzdata). Needs the local stack.
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { LOCAL_DATABASE_URL } from "@/test/local-stack";

const ZONE = "America/Los_Angeles"; // DECISIONS.md: Day boundary (human, 2026-10-17)
// Development started with M00 on 2026-10-17; the last published puzzle is 2026-11-08 (M02 ticket, Numbers).
const FIRST = "2026-10-17";
const LAST = "2026-11-08";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const db = new Pool({ connectionString: LOCAL_DATABASE_URL, max: 1 });
afterAll(async () => {
  await db.end();
});

const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const offsetName = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, timeZoneName: "longOffset" });
const dateAt = (ms: number) => localDate.format(new Date(ms));
const offsetAt = (ms: number) => offsetName.formatToParts(new Date(ms)).find((p) => p.type === "timeZoneName")!.value;

// The first millisecond whose local date is `day`, found by bisection over a two-day window around it.
function midnight(day: string): number {
  let lo = Date.parse(`${day}T00:00:00Z`) - DAY;
  let hi = Date.parse(`${day}T00:00:00Z`) + DAY;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (dateAt(mid) >= day) hi = mid;
    else lo = mid;
  }
  return hi;
}

function nextDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + DAY).toISOString().slice(0, 10);
}

// Days in the window whose offset differs at their start and their end: the DST transitions.
function transitions(): string[] {
  const found: string[] = [];
  for (let day = FIRST; day <= LAST; day = nextDay(day)) {
    if (offsetAt(midnight(day)) !== offsetAt(midnight(nextDay(day)) - 1)) found.push(day);
  }
  return found;
}

async function dayOf(ms: number): Promise<string> {
  const { rows } = await db.query<{ day: string }>("select private.day_of($1::timestamptz)::text as day", [new Date(ms).toISOString()]);
  return rows[0].day;
}

describe("the game day", () => {
  const changes = transitions();

  it("finds the DST change in the window from the tz data: 2026-11-01, the playtest's last day", () => {
    // ROADMAP: "Add the 2026-11-01 DST transition to the private.today() tests".
    expect(changes).toEqual(["2026-11-01"]);
  });

  // An ordinary day (the playtest's first), and the start and end of every transition day, whose length is not 24 h.
  const boundaries = [...new Set(["2026-10-26", ...changes, ...changes.map(nextDay)])];
  it.each(boundaries)("turns over at midnight %s Pacific: the millisecond before is the day before", async (day) => {
    const start = midnight(day);
    expect(await dayOf(start - 1)).toBe(new Date(Date.parse(`${day}T00:00:00Z`) - DAY).toISOString().slice(0, 10));
    expect(await dayOf(start)).toBe(day);
  });

  // M00 data design §8: "the day after a DST change is 23 or 25 hours long"; in the fall it is 25.
  it("has a 25-hour day when DST ends", () => {
    for (const day of changes) expect(midnight(nextDay(day)) - midnight(day)).toBe(25 * HOUR);
  });

  // supabase/tests/game.test.sql repeats these instants so the staging database's tz data is checked too.
  it("puts the 2026-11-01 day at the instants game.test.sql checks", () => {
    expect(new Date(midnight("2026-11-01")).toISOString()).toBe("2026-11-01T07:00:00.000Z");
    expect(new Date(midnight("2026-11-02")).toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });

  it("is what today() returns now", async () => {
    const { rows } = await db.query<{ today: string }>("select private.today()::text as today");
    expect(rows[0].today).toBe(dateAt(Date.now()));
  });
});
