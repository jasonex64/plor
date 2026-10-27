// How many players gave each answer, on the result screen, against the local stack (run with `npm run test:db`;
// docs/milestones/M11-home-screen.md, 11a, H5). Today's answers are written directly inside a transaction that is
// rolled back, with the answer triggers off while they're inserted (as ledger.db.test.ts does), and read back through
// todaysState, as GET /api/run does.
import { afterAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { type ApprovedPuzzle } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import { fixtureDay, loadFixtureBase } from "@/test/answer-fixture";
import { safeEntry } from "@/test/puzzles";

// Answers are named from the base, so each test loads the fixture base inside its transaction.
const fixture = (date: string) => fixtureDay(date, `${date}T00:00:00Z`);
import { dayCounts } from "./ledger";
import { todaysState } from "./runs";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
afterAll(() => admin.end());

async function inRolledBackTransaction(fn: (client: PoolClient) => Promise<void>): Promise<void> {
  const client = await admin.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    await fn(client);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

async function newUser(client: PoolClient): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    "insert into auth.users (id, email) values (gen_random_uuid(), gen_random_uuid() || '@example.test') returning id",
  );
  return rows[0].id;
}

// A run on that day with these answers, each at that time (now by default).
async function run(
  client: PoolClient,
  userId: string,
  date: string,
  answers: { q: number; entry: string; matched: boolean; at?: string }[],
) {
  await client.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [userId, GAME_ID, date]);
  for (const a of answers) {
    await client.query(
      "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched, created_at) values ($1, $2, $3::date, $4, $5, $6, coalesce($7::timestamptz, now()))",
      [userId, GAME_ID, date, a.q, a.entry, a.matched, a.at ?? null],
    );
  }
}

describe("how many players gave each answer (H5)", () => {
  it("shows each answer's share once the run is over and enough players answered, and none before", async () => {
    await inRolledBackTransaction(async (client) => {
      await loadFixtureBase(client);
      const { rows } = await client.query<{ today: string }>("select private.today()::text as today");
      const today = rows[0].today;
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3) on conflict do nothing", [
        GAME_ID,
        today,
        fixture(today),
      ]);
      const { rows: content } = await client.query<{ content: ApprovedPuzzle }>(
        "select content from private.puzzle where game_id = $1 and puzzle_date = $2::date",
        [GAME_ID, today],
      );
      const puzzle = content[0].content;
      const safe = safeEntry(puzzle, 0);
      const host = puzzle.questions[0].host_answers[0];

      // A survives question 1 with the safe answer and is caught on question 2: A's run is over. B and C give the same
      // safe answer and wait at the reveal. So far 3 players answered question 1.
      const a = await newUser(client);
      await run(client, a, today, [
        { q: 0, entry: safe, matched: false },
        { q: 1, entry: puzzle.questions[1].host_answers[0], matched: true },
      ]);
      const b = await newUser(client);
      await run(client, b, today, [{ q: 0, entry: safe, matched: false }]);
      await run(client, await newUser(client), today, [{ q: 0, entry: safe, matched: false }]);
      // D is caught on question 1 by the host: the fourth player to answer it.
      const d = await newUser(client);
      await run(client, d, today, [{ q: 0, entry: host, matched: true }]);

      // 4 players answered question 1, one under the minimum (ANSWER_SHARE_MIN_PLAYERS, 5): no share yet.
      expect((await todaysState(client, a))!.answered.map((x) => x.share)).toEqual([null, null]);

      // A fifth player gives the safe answer: 4 of 5 gave A's, 1 of 5 gave D's. Question 2 has 1 player, under it.
      await run(client, await newUser(client), today, [{ q: 0, entry: safe, matched: false }]);
      const aState = (await todaysState(client, a))!;
      expect(aState.status).toBe("died");
      expect(aState.answered.map((x) => x.share)).toEqual([0.8, null]);
      expect((await todaysState(client, d))!.answered.map((x) => x.share)).toEqual([0.2]);
      // B's run is still going, so B sees no share.
      const bState = (await todaysState(client, b))!;
      expect(bState.status).toBe("in_progress");
      expect(bState.answered.map((x) => x.share)).toEqual([null]);
    });
  });

  it("counts a day's answers only before its midnight, as the final bonus does (M09 D8)", async () => {
    await inRolledBackTransaction(async (client) => {
      await loadFixtureBase(client);
      const day = "2001-02-03";
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [
        GAME_ID,
        day,
        fixture(day),
      ]);
      const entry = safeEntry(fixture(day), 0);
      await run(client, await newUser(client), day, [{ q: 0, entry, matched: false, at: `${day} 23:59:00-08` }]);
      await run(client, await newUser(client), day, [{ q: 0, entry, matched: false, at: "2001-02-04 00:01:00-08" }]);
      const question = (await dayCounts(client, [day])).get(day)!.get(0)!;
      expect(question.answered).toBe(1);
      expect(question.byEntry.get(entry)).toBe(1);
    });
  });
});
