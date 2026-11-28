// Puzzle fixtures for the database tests: the fixture's day on a clock (src/test/answer-fixture.ts) on the local stack, and
// answers a player can type. Shared by the run and board tests.
import type { ClockPuzzle } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import { getPool } from "@/lib/db";
import { FIXTURE_ALIASES, FIXTURE_NAMES, fixtureClockDay, isFixtureDay, loadFixtureBase, removeFixtureBase } from "./answer-fixture";

const created: string[] = [];
let approvedAt: string | null = null;

// Loads the fixture base once per test file; every fixture day is approved as of then.
export async function ensureFixtureBase(): Promise<void> {
  approvedAt ??= await loadFixtureBase(getPool());
}

// The fixture day on a clock under a date. ensureFixtureBase must have run.
export function fixture(date: string): ClockPuzzle {
  if (!approvedAt) throw new Error("fixture(): call ensureFixtureBase() first");
  return fixtureClockDay(date, approvedAt);
}

// Uses the fixture day already published for a date, or adds it (removed again by removeFixtures). A real day
// under that date is refused: the tests would play it, and the helpers below know only the fixture's names.
export async function ensurePuzzle(date: string): Promise<ClockPuzzle> {
  await ensureFixtureBase();
  const db = getPool();
  const { rows } = await db.query<{ content: ClockPuzzle }>("select content from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, date]);
  if (rows.length) {
    if (!isFixtureDay(rows[0].content)) throw new Error(`${date} has a real puzzle; the database tests need it free for the fixture day`);
    return rows[0].content;
  }
  await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, date, fixture(date)]);
  created.push(date);
  return fixture(date);
}

// Takes out the fixture days this file added, then the fixture base if it loaded it, so the local base holds no
// fixture rows once the suite is done (13f-3b-2). Run after the runs that use them are deleted (a run references its
// puzzle) and with any day the file approved itself gone.
export async function removeFixtures(): Promise<void> {
  for (const date of created.splice(0)) {
    await getPool().query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, date]);
  }
  if (approvedAt) {
    await removeFixtureBase(getPool());
    approvedAt = null;
  }
}

// A thing's main name in the fixture, as screens show it: in lowercase (human, 2026-10-27; src/game/payload.ts, thingNames).
export function nameOf(thingId: string): string {
  const name = FIXTURE_NAMES.get(thingId);
  if (!name) throw new Error(`${thingId} is not a fixture thing`);
  return name.toLowerCase();
}

// A name of the thing that a player can type: its first.
export function typedName(thingId: string): string {
  const names = FIXTURE_ALIASES.get(thingId);
  if (!names) throw new Error(`${thingId} is not a fixture thing`);
  return names[0];
}
