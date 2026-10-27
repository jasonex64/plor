// The game's database work as plor_app really does it: its grants, its RLS policies, the triggers and the status
// view that run as the invoker, and the identity column on missed_answer. Locally the routes connect as postgres
// (ROADMAP), so this file switches to plor_app the same way src/lib/profile.db.test.ts does.
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { type ApprovedPuzzle } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import { fixtureDay, isFixtureDay, loadFixtureBase } from "@/test/answer-fixture";
import { safeEntry, typeableName } from "@/test/puzzles";
import { answer, openNext, startRun, todaysState } from "./runs";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });

afterAll(async () => {
  await admin.end();
});

// Runs fn as plor_app in a transaction that is always rolled back, with a fresh player and today's puzzle.
async function asPlorApp(fn: (client: PoolClient, userId: string, puzzle: ApprovedPuzzle) => Promise<void>): Promise<void> {
  const client = await admin.connect();
  try {
    await client.query("begin");
    const userId = randomUUID();
    await client.query("insert into auth.users (id, email) values ($1, $2)", [userId, `${userId}@example.test`]);
    const { rows } = await client.query<{ today: string; content: ApprovedPuzzle | null }>(
      "select private.today()::text as today, (select content from private.puzzle where game_id = $1 and puzzle_date = private.today()) as content",
      [GAME_ID],
    );
    let puzzle = rows[0].content;
    if (puzzle && !isFixtureDay(puzzle)) throw new Error(`${rows[0].today} has a real puzzle; this test needs it free for the fixture day`);
    if (!puzzle) {
      puzzle = fixtureDay(rows[0].today, await loadFixtureBase(client));
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, rows[0].today, puzzle]);
    }
    await client.query("set local role plor_app");
    await fn(client, userId, puzzle);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

describe("a run as plor_app", () => {
  it("starts, answers, opens the next question, logs a miss and reads the state", async () => {
    await asPlorApp(async (client, userId, puzzle) => {
      expect((await todaysState(client, userId))!.status).toBe("not_started");
      expect((await startRun(client, userId)).status).toBe("in_progress");
      const after = await answer(client, userId, 0, typeableName(puzzle, 0, safeEntry(puzzle, 0))!);
      expect(after.run.answered).toHaveLength(1);
      expect((await openNext(client, userId)).question?.index).toBe(1);
      expect((await answer(client, userId, 1, "zzz zzz")).notInList).toBe(true);
      expect((await todaysState(client, userId))!.question?.index).toBe(1);
    });
  });

  it("cannot change or remove what it wrote", async () => {
    await asPlorApp(async (client, userId) => {
      await startRun(client, userId);
      await expect(client.query("update private.run set started_at = now() where user_id = $1", [userId])).rejects.toThrow(/permission denied/);
    });
  });
});
