// Settling runs into the points ledger against the local stack (run with `npm run test:db`;
// docs/milestones/M09-points-and-leaderboard.md, 9a). A closed past day is built inside a transaction that is rolled
// back: its answers need times in the past, which the answer triggers refuse, so they're switched off
// (session_replication_role) only while the fixture is inserted. Settling then runs as plor_app with them back on.
// Both need the local superuser, as in src/game/runs.plor-app.db.test.ts. Expected points are worked by hand from the
// ticket's formula (N1–N5).
import { afterAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { GAME_ID } from "@/content/puzzle";
import { fixture } from "@/test/puzzles";
import { settleRuns } from "./ledger";

// A closed day, in Pacific time (PST in February).
const DAY = "2001-02-03";
const at = (time: string) => `${DAY} ${time}-08`;
const afterMidnight = (time: string) => `2001-02-04 ${time}-08`;
// A second closed day, with different counts: only A answers there.
const DAY2 = "2001-02-05";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
afterAll(() => admin.end());

async function inRolledBackTransaction(fn: (client: PoolClient) => Promise<void>): Promise<void> {
  const client = await admin.connect();
  try {
    await client.query("begin");
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

type Answer = { q: number; entry: string; matched?: boolean; at: string };
async function run(client: PoolClient, userId: string, date: string, startedAt: string, answers: Answer[], opened?: { q: number; at: string }) {
  await client.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, $4)", [userId, GAME_ID, date, startedAt]);
  for (const a of answers) {
    await client.query(
      "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched, created_at) values ($1, $2, $3::date, $4, $5, $6, $7)",
      [userId, GAME_ID, date, a.q, a.entry, a.matched ?? false, a.at],
    );
  }
  if (opened) {
    await client.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx, opened_at) values ($1, $2, $3::date, $4, $5)", [
      userId,
      GAME_ID,
      date,
      opened.q,
      opened.at,
    ]);
  }
}

describe("settling runs into the points ledger", () => {
  it("writes one row per finished run of a closed day, with that day's ladder and final rarity bonus, and nothing twice", async () => {
    await inRolledBackTransaction(async (client) => {
      await client.query("set local session_replication_role = replica");
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, DAY, fixture(DAY)]);
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, DAY2, fixture(DAY2)]);
      const { rows: todayRows } = await client.query<{ today: string }>("select private.today()::text as today");
      const today = todayRows[0].today;
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3) on conflict do nothing", [
        GAME_ID,
        today,
        fixture(today),
      ]);

      const [a, b, c, d, e, f] = [await newUser(client), await newUser(client), await newUser(client), await newUser(client), await newUser(client), await newUser(client)];
      // A: dog (host bank), california (host bank), watch-a-movie (host bank), then caught by "a".
      await run(client, a, DAY, at("20:00:00"), [
        { q: 0, entry: "dog", at: at("20:00:05") },
        { q: 1, entry: "california", at: at("20:00:30") },
        { q: 2, entry: "watch-a-movie", at: at("20:01:00") },
        { q: 3, entry: "a", matched: true, at: at("20:01:30") },
      ]);
      // A plays the second day too: dog again, then caught by texas.
      await run(client, a, DAY2, `${DAY2} 20:00:00-08`, [
        { q: 0, entry: "dog", at: `${DAY2} 20:00:05-08` },
        { q: 1, entry: "texas", matched: true, at: `${DAY2} 20:00:30-08` },
      ]);
      // B survives all seven.
      await run(client, b, DAY, at("20:00:00"), [
        { q: 0, entry: "anteater", at: at("20:00:05") },
        { q: 1, entry: "alabama", at: at("20:00:30") },
        { q: 2, entry: "cook", at: at("20:01:00") },
        { q: 3, entry: "b", at: at("20:01:30") },
        { q: 4, entry: "epsilon", at: at("20:02:00") },
        { q: 5, entry: "baked-eggs", at: at("20:02:30") },
        { q: 6, entry: "gemini", at: at("20:03:00") },
      ]);
      // C: aardvark, ohio (host bank), then runs out of time on question 3 (opened, never answered).
      await run(client, c, DAY, at("20:00:00"), [{ q: 0, entry: "aardvark", at: at("20:00:05") }, { q: 1, entry: "ohio", at: at("20:00:30") }], {
        q: 2,
        at: at("20:00:40"),
      });
      // D waits at the reveal after question 2, so its run is still in progress.
      await run(client, d, DAY, at("20:00:00"), [{ q: 0, entry: "antelope", at: at("20:00:05") }, { q: 1, entry: "florida", at: at("20:00:30") }]);
      // E starts before midnight and finishes after it: alpaca before, florida after, then caught after.
      await run(client, e, DAY, at("23:59:40"), [
        { q: 0, entry: "alpaca", at: at("23:59:50") },
        { q: 1, entry: "florida", at: afterMidnight("00:00:10") },
        { q: 2, entry: "read-a-book", matched: true, at: afterMidnight("00:00:40") },
      ]);
      // F is caught today: finished, but its day isn't closed.
      await run(client, f, today, new Date().toISOString(), []);
      await client.query(
        "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 0, $4, true)",
        [f, GAME_ID, today, fixture(today).questions[0].host_answers[0]],
      );
      // 15 more players answer question 1 and wait at its reveal: 7 say dog, 8 give answers nobody else gave. So 20
      // players answered question 1: 8 dog, and 1 each of aardvark, alpaca, anteater and antelope.
      const others = fixture(DAY)
        .questions[0].entries.map((x) => x.id)
        .filter((id) => !fixture(DAY).questions[0].host_bank.includes(id) && !["aardvark", "alpaca", "anteater", "antelope"].includes(id))
        .slice(0, 8);
      for (const entry of [...Array(7).fill("dog"), ...others]) {
        await run(client, await newUser(client), DAY, at("21:00:00"), [{ q: 0, entry, at: at("21:00:05") }]);
      }
      await client.query("set local session_replication_role = origin");

      // As the app: settle the six players.
      await client.query("set local role plor_app");
      expect(await settleRuns(client, [a, b, c, d, e, f])).toBe(5);
      const ledger = "select user_id, puzzle_date::text as date, points, bonus from private.points_ledger where user_id = any($1::uuid[]) order by user_id, puzzle_date";
      const { rows } = await client.query<{ user_id: string; date: string; points: number; bonus: number }>(ledger, [[a, b, c, d, e, f]]);
      const row = (id: string, date = DAY) => rows.find((r) => r.user_id === id && r.date === date);
      // A: ladder 25 + 50 + 75 = 150. Dog's share is (10 × 1/12 + 8) / 30 = 29.4%, so 0; california and
      // watch-a-movie were answered by fewer than 5 players (4 and 2), so their expected 1/12 counts: 14 and 21.
      expect(row(a)).toMatchObject({ points: 185, bonus: 35 });
      // A's second day is scored with that day's counts: only A answered dog there, fewer than 5, so dog's expected
      // 1/12 counts: 25 + 7. Mixing the days' counts would make it 0, as on the first day.
      expect(row(a, DAY2)).toMatchObject({ points: 32, bonus: 7 });
      // C: 25 + 50 = 75. Aardvark's share is (10 × 0.5/220 + 1) / 30 = 3.41%, so 10; ohio 14.
      expect(row(c)).toMatchObject({ points: 99, bonus: 24 });
      // E: 25 + 50 = 75 (the late answer counts on the ladder, D1). Alpaca, before midnight: 10. Florida, after: 0 (D8).
      expect(row(e)).toMatchObject({ points: 85, bonus: 10 });
      // B: the full ladder, 1000, plus a bonus.
      expect(row(b)!.points - row(b)!.bonus).toBe(1000);
      expect(row(b)!.bonus).toBeGreaterThan(0);
      // D is still in progress; F's day isn't closed.
      expect(row(d)).toBeUndefined();
      expect(row(f)).toBeUndefined();

      // Settling again writes nothing and changes nothing.
      expect(await settleRuns(client, [a, b, c, d, e, f])).toBe(0);
      const { rows: again } = await client.query(ledger, [[a, b, c, d, e, f]]);
      expect(again).toEqual(rows);
    });
  });

  it("does nothing for players with no finished runs on a closed day", async () => {
    await inRolledBackTransaction(async (client) => {
      const nobody = await newUser(client);
      await client.query("set local role plor_app");
      expect(await settleRuns(client, [nobody])).toBe(0);
      expect(await settleRuns(client, [])).toBe(0);
    });
  });
});
