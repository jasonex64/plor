// The game's database work as plor_app really does it: its grants, its RLS policies, the triggers and the status
// view that run as the invoker, and the identity column on missed_answer. Locally the routes connect as postgres
// (ROADMAP), so this file switches to plor_app the same way src/lib/profile.db.test.ts does.
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { type ApprovedPuzzle } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import { fixtureDay, fixtureDraft, fixtureId, isFixtureDay, loadFixtureBase } from "@/test/answer-fixture";
import { safeEntry, typeableName } from "@/test/puzzles";
import { buildPuzzle } from "@/admin/puzzles";
import { dayLookup, draftLookup, type Lookup } from "./matching";
import { answer, openNext, startRun, testRun, todaysState } from "./runs";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });

afterAll(async () => {
  await admin.end();
});

// Runs fn as plor_app in a transaction that is always rolled back, with a fresh player and today's puzzle.
async function asPlorApp(fn: (client: PoolClient, userId: string, puzzle: ApprovedPuzzle) => Promise<void>, { admin: isAdmin = false } = {}): Promise<void> {
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
    if (isAdmin) await client.query("insert into private.admin (user_id) values ($1)", [userId]);
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

  // A test run (docs/milestones/M14-14b-11-test-runs.md, criterion 1) through plor_app's grants: full runs of today's
  // day, an upcoming one and a draft, to their result, which reads the day's counts, and nothing written. The counts are
  // read as the test's own role, since plor_app may not read every one of these tables.
  it("plays full test runs of today, an upcoming day and a draft, as an admin, and writes nothing", async () => {
    await asPlorApp(
      async (client, userId, puzzle) => {
        const TABLES = ["puzzle", "run", "run_event", "question_open", "missed_answer", "miss_review", "points_ledger", "thing_alias", "category_extra"];
        const counts = async () => {
          await client.query("reset role");
          const { rows } = await client.query<{ n: number[] }>(`select array[${TABLES.map((t) => `(select count(*)::int from private.${t})`).join(", ")}] as n`);
          await client.query("set local role plor_app");
          return rows[0].n;
        };
        // An upcoming day, added as the test's own role, as asPlorApp adds today's.
        await client.query("reset role");
        const { rows } = await client.query<{ ahead: string; approved_at: string }>(
          "select (private.today() + 425)::text as ahead, (select content ->> 'approved_at' from private.puzzle where game_id = $1 and puzzle_date = private.today()) as approved_at",
          [GAME_ID],
        );
        const upcoming = fixtureDay(rows[0].ahead, rows[0].approved_at);
        await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, upcoming.date, upcoming]);
        await client.query("set local role plor_app");

        const before = await counts();
        // One familiar answer per question that the Wind doesn't catch, past the stolen letters: the whole climb.
        const climb = async (p: ApprovedPuzzle, lookup: Lookup) => {
          const texts = p.questions.map((_, i) => typeableName(p, i, safeEntry(p, i))!);
          return (await testRun(client, p, lookup, { texts: texts.slice(0, -1), open: true, timedOut: false, text: texts[texts.length - 1] })).run;
        };
        for (const p of [puzzle, upcoming]) {
          const run = await climb(p, dayLookup(client, p));
          expect(run.status).toBe("survived");
          expect(run.answered).toHaveLength(p.questions.length);
        }
        const built = await buildPuzzle(client, userId, fixtureDraft(puzzle.date));
        if (!("built" in built)) throw new Error(`the fixture draft is refused: ${built.problems.join("; ")}`);
        expect((await climb(built.built, draftLookup(client, userId, built.built))).status).toBe("survived");
        // And a draft's host catches, as approval would build it.
        const bear = { texts: [], open: true, timedOut: false, text: typeableName(puzzle, 0, fixtureId(0, "bear"))! };
        expect((await testRun(client, built.built, draftLookup(client, userId, built.built), bear)).run.status).toBe("died");
        expect(await counts()).toEqual(before);
      },
      { admin: true },
    );
  });
});
