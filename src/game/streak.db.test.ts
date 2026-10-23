// The streak of days played against the local stack (run with `npm run test:db`; docs/milestones/M11-home-screen.md,
// 11a, H4). The days around today are built inside a transaction that is rolled back, as in ledger.db.test.ts: puzzles
// on today and the six days before it except one, and runs written directly, unanswered, so each run is unfinished and
// still counts (H4 (a)). The day without a puzzle is cleared inside the transaction, so the test doesn't depend on
// which days the local database has.
import { afterAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { GAME_ID } from "@/content/puzzle";
import { fixture } from "@/test/puzzles";
import { getStreak } from "./streak";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
afterAll(() => admin.end());

describe("the streak of days played", () => {
  it("counts days with a run back from today, or from yesterday before today's run, skipping days with no puzzle (H4)", async () => {
    const client: PoolClient = await admin.connect();
    try {
      await client.query("begin");
      await client.query("set local session_replication_role = replica");
      const { rows } = await client.query<{ day: string }>(
        "select (private.today() - n)::text as day from generate_series(0, 6) as n order by n",
      );
      // day(0) is today, day(n) n days before it.
      const day = (n: number) => rows[n].day;
      for (const n of [0, 1, 2, 3, 4, 6]) {
        await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3) on conflict do nothing", [
          GAME_ID,
          day(n),
          fixture(day(n)),
        ]);
      }
      // Five days ago there is no puzzle, so nobody could play it.
      await client.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, day(5)]);

      async function player(days: number[]): Promise<string> {
        const { rows: user } = await client.query<{ id: string }>(
          "insert into auth.users (id, email) values (gen_random_uuid(), gen_random_uuid() || '@example.test') returning id",
        );
        for (const n of days) {
          await client.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [
            user[0].id,
            GAME_ID,
            day(n),
          ]);
        }
        return user[0].id;
      }

      // Every day with a puzzle, today included: the day with none doesn't break it.
      expect(await getStreak(client, await player([0, 1, 2, 3, 4, 6]))).toBe(6);
      // The same, before playing today: it counts from yesterday, so it hasn't dropped to 0.
      expect(await getStreak(client, await player([1, 2, 3, 4, 6]))).toBe(5);
      // Yesterday and the day before, then a missed day with a puzzle.
      expect(await getStreak(client, await player([1, 2]))).toBe(2);
      // Today, but not yesterday: the streak starts again.
      expect(await getStreak(client, await player([0, 2]))).toBe(1);
      expect(await getStreak(client, await player([]))).toBe(0);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});
