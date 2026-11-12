// A game 1 guest run as plor_app really does it: its grants, its RLS policies, the triggers and the status view that run
// as the invoker, and the two delete functions (docs/milestones/M18-guest-play.md, 18c). Locally the routes connect as
// postgres (ROADMAP), so this file switches to plor_app as runs.plor-app.db.test.ts does. Every test is rolled back.
import { randomBytes } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { type ApprovedPuzzle } from "@/content/puzzle";
import { hashKey } from "@/lib/auth-limits";
import { GAME_ID } from "@/platform/game";
import { fixtureDay, isFixtureDay, loadFixtureBase } from "@/test/answer-fixture";
import { hostName, safeEntries, typeableName } from "@/test/puzzles";
import { answerGuest, guestTodaysState, openNextGuest, startGuestRun } from "./guest-runs";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
afterAll(() => admin.end());

type Day = { client: PoolClient; today: string; puzzle: ApprovedPuzzle };

async function asPlorApp(fn: (day: Day) => Promise<void>): Promise<void> {
  const client = await admin.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ today: string; content: ApprovedPuzzle | null }>(
      "select private.today()::text as today, (select content from private.puzzle where game_id = $1 and puzzle_date = private.today()) as content",
      [GAME_ID],
    );
    const { today } = rows[0];
    let puzzle = rows[0].content;
    if (puzzle && !isFixtureDay(puzzle)) throw new Error(`${today} has a real puzzle; this test needs it free for the fixture day`);
    if (!puzzle) {
      puzzle = fixtureDay(today, await loadFixtureBase(client));
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, today, puzzle]);
    }
    await client.query("set local role plor_app");
    await fn({ client, today, puzzle });
  } finally {
    await client.query("rollback");
    client.release();
  }
}

const newHash = () => hashKey(randomBytes(20).toString("base64url"));

async function runsOf(client: PoolClient, hash: string): Promise<number> {
  return (await client.query<{ n: number }>("select count(*)::int as n from private.guest_run where token_hash = $1", [hash])).rows[0].n;
}

describe("a guest run as plor_app", () => {
  it("plays all seven questions, is ended with the last answer, and a retry then finds no run", async () => {
    await asPlorApp(async ({ client, puzzle }) => {
      const hash = newHash();
      expect((await guestTodaysState(client, hash))!.status).toBe("not_started");
      expect((await startGuestRun(client, hash)).status).toBe("in_progress");
      const name = (i: number) => typeableName(puzzle, i, safeEntries(puzzle, i)[0])!;
      for (let i = 0; i < puzzle.questions.length - 1; i++) {
        if (i > 0) expect((await openNextGuest(client, hash)).question?.index).toBe(i);
        expect((await answerGuest(client, hash, i, name(i))).run.answered).toHaveLength(i + 1);
      }
      const last = puzzle.questions.length - 1;
      await openNextGuest(client, hash);
      const done = await answerGuest(client, hash, last, name(last));
      expect(done.run).toMatchObject({ status: "survived", question: null });
      expect(done.run.answered).toHaveLength(puzzle.questions.length);
      expect(await runsOf(client, hash)).toBe(0);
      await expect(answerGuest(client, hash, last, name(last))).rejects.toMatchObject({ code: "run_over", status: 409 });
      await expect(openNextGuest(client, hash)).rejects.toMatchObject({ code: "run_over", status: 409 });
    });
  });

  it("ends a caught run with the answer that caught it", async () => {
    await asPlorApp(async ({ client, puzzle }) => {
      const hash = newHash();
      await startGuestRun(client, hash);
      const caught = await answerGuest(client, hash, 0, hostName(puzzle, 0));
      expect(caught.run.status).toBe("died");
      expect(await runsOf(client, hash)).toBe(0);
    });
  });

  it("deletes the runs of a closed day at the next start, and no run of today", async () => {
    await asPlorApp(async ({ client, puzzle }) => {
      const yesterday = (await client.query<{ d: string }>("select (private.today() - 1)::text as d")).rows[0].d;
      await client.query("reset role");
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3) on conflict do nothing", [
        GAME_ID,
        yesterday,
        { ...puzzle, date: yesterday },
      ]);
      const old = newHash();
      await client.query("insert into private.guest_run (token_hash, game_id, puzzle_date) values ($1, $2, $3::date)", [old, GAME_ID, yesterday]);
      await client.query("set local role plor_app");
      expect(await runsOf(client, old)).toBe(1);
      const open = newHash();
      await startGuestRun(client, open);
      expect(await runsOf(client, old)).toBe(0);
      expect(await runsOf(client, open)).toBe(1);
    });
  });
});
