// Today's puzzle for the e2e tests that play: the fixture day (src/test/answer-fixture.ts), added under today's date
// with its answer database, and removed again by removePuzzle. Shared by live-board.e2e.ts and groups.e2e.ts.
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";
import { FIXTURE, fixtureDay, isFixtureDay, loadFixtureBase } from "../src/test/answer-fixture";

// created: the date of the fixture this added, if it added one.
export type TodayPuzzle = { hostAnswer: string; safeAnswer: string; created: string | null };

export async function todayPuzzle(db: Pool): Promise<TodayPuzzle> {
  const { rows } = await db.query<{ today: string; content: { questions: { category: string }[] } | null }>(
    "select private.today()::text as today, (select content from private.puzzle where game_id = 'offbeat' and puzzle_date = private.today()) as content",
  );
  const { today, content } = rows[0];
  if (content && !isFixtureDay(content)) throw new Error(`${today} has a real puzzle; the e2e tests need it free for the fixture day`);
  let created: string | null = null;
  if (!content) {
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [today, fixtureDay(today, await loadFixtureBase(db))]);
    created = today;
  }
  // Question 1 steals no letter (schedule A): its host answer is "bear", and "dog" is in the host bank but not caught.
  const q = FIXTURE[0];
  return { hostAnswer: q.members[q.host[0]].names[0], safeAnswer: q.members.dog.names[0], created };
}

// Run after the players are deleted (a run references its puzzle).
export async function removePuzzle(db: Pool, puzzle: TodayPuzzle): Promise<void> {
  if (puzzle.created) await db.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [puzzle.created]);
}

// Tomorrow (private.today() + 1) and the admin's warning for it (src/app/admin/tomorrow.ts). The repo's drafted days in
// content/offbeat/ run ahead of the calendar from the beta's first batch on, so on some dates tomorrow is drafted and on
// others it has nothing; the tests expect whichever holds (the human, 2026-11-16: "Expect what's there").
export type TomorrowWarning = { date: string; drafted: boolean; what: string; todo: string };

export async function tomorrowWarning(db: Pool): Promise<TomorrowWarning> {
  const { rows } = await db.query<{ tomorrow: string }>("select (private.today() + 1)::text as tomorrow");
  const date = rows[0].tomorrow;
  const drafted = existsSync(join(process.cwd(), "content", "offbeat", `${date}.json`));
  return drafted
    ? { date, drafted, what: "Tomorrow isn't approved", todo: "Approve it before midnight Pacific" }
    : { date, drafted, what: "Tomorrow has no puzzle", todo: "Draft it before midnight Pacific" };
}
