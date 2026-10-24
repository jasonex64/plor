// Settling runs into the points ledger against the local stack (run with `npm run test:db`;
// docs/milestones/M09-points-and-leaderboard.md, 9a). A closed past day is built inside a transaction that is rolled
// back: its answers need times in the past, which the answer triggers refuse, so they're switched off
// (session_replication_role) only while the fixture is inserted. Settling then runs as plor_app with them back on.
// Both need the local superuser, as in src/game/runs.plor-app.db.test.ts. Expected points are worked by hand from the
// ticket's formula (N1–N5) on the fixture day (src/test/answer-fixture.ts): each question has a host bank of 2; question
// 1 has 11 members, question 6 has 4, the others 5. Settling scores from the day's content alone, so the days here need
// no answer database.
import { afterAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { GAME_ID } from "@/content/puzzle";
import { fixtureDay, fixtureId } from "@/test/answer-fixture";
import { settleRuns } from "./ledger";

// A closed day, in Pacific time (PST in February).
const DAY = "2001-02-03";
const at = (time: string) => `${DAY} ${time}-08`;
const afterMidnight = (time: string) => `2001-02-04 ${time}-08`;
// A second closed day, with different counts: only A answers there.
const DAY2 = "2001-02-05";
const fixture = (date: string) => fixtureDay(date, `${date}T00:00:00Z`);
// A fixture thing by question and slug.
const t = (q: number, slug: string) => fixtureId(q, slug);

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
      // A: dog, banana and blue (all host bank), then caught by italy.
      await run(client, a, DAY, at("20:00:00"), [
        { q: 0, entry: t(0, "dog"), at: at("20:00:05") },
        { q: 1, entry: t(1, "banana"), at: at("20:00:30") },
        { q: 2, entry: t(2, "blue"), at: at("20:01:00") },
        { q: 3, entry: t(3, "italy"), matched: true, at: at("20:01:30") },
      ]);
      // A plays the second day too: cat, then caught by apple.
      await run(client, a, DAY2, `${DAY2} 20:00:00-08`, [
        { q: 0, entry: t(0, "cat"), at: `${DAY2} 20:00:05-08` },
        { q: 1, entry: t(1, "apple"), matched: true, at: `${DAY2} 20:00:30-08` },
      ]);
      // B survives all seven, never in the host bank.
      await run(client, b, DAY, at("20:00:00"), [
        { q: 0, entry: t(0, "cat"), at: at("20:00:05") },
        { q: 1, entry: t(1, "kiwi"), at: at("20:00:30") },
        { q: 2, entry: t(2, "green"), at: at("20:01:00") },
        { q: 3, entry: t(3, "france"), at: at("20:01:30") },
        { q: 4, entry: t(4, "lead"), at: at("20:02:00") },
        { q: 5, entry: t(5, "july"), at: at("20:02:30") },
        { q: 6, entry: t(6, "leg"), at: at("20:03:00") },
      ]);
      // C: aardvark, banana (host bank), then runs out of time on question 3 (opened, never answered).
      await run(client, c, DAY, at("20:00:00"), [{ q: 0, entry: t(0, "aardvark-genus"), at: at("20:00:05") }, { q: 1, entry: t(1, "banana"), at: at("20:00:30") }], {
        q: 2,
        at: at("20:00:40"),
      });
      // D waits at the reveal after question 2, so its run is still in progress.
      await run(client, d, DAY, at("20:00:00"), [{ q: 0, entry: t(0, "fish"), at: at("20:00:05") }, { q: 1, entry: t(1, "kiwi"), at: at("20:00:30") }]);
      // E starts before midnight and finishes after it: horse before, kiwi after, then caught by red after.
      await run(client, e, DAY, at("23:59:40"), [
        { q: 0, entry: t(0, "horse"), at: at("23:59:50") },
        { q: 1, entry: t(1, "kiwi"), at: afterMidnight("00:00:10") },
        { q: 2, entry: t(2, "red"), matched: true, at: afterMidnight("00:00:40") },
      ]);
      // F is caught today: finished, but its day isn't closed.
      await run(client, f, today, new Date().toISOString(), []);
      await client.query(
        "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 0, $4, true)",
        [f, GAME_ID, today, fixture(today).questions[0].host_answers[0]],
      );
      // 11 more players answer question 1 and wait at its reveal: 7 say dog, 4 give animals nobody else gave. So 16
      // players answered question 1 before midnight: 8 dog, and 1 each of cat, aardvark, fish, horse and those four.
      const others = ["aardvark-species", "american-robin", "european-robin", "horde"].map((slug) => t(0, slug));
      for (const entry of [...Array(7).fill(t(0, "dog")), ...others]) {
        await run(client, await newUser(client), DAY, at("21:00:00"), [{ q: 0, entry, at: at("21:00:05") }]);
      }
      await client.query("set local session_replication_role = origin");

      // As the app: settle the six players.
      await client.query("set local role plor_app");
      expect(await settleRuns(client, [a, b, c, d, e, f])).toBe(5);
      const ledger = "select user_id, puzzle_date::text as date, points, bonus from private.points_ledger where user_id = any($1::uuid[]) order by user_id, puzzle_date";
      const { rows } = await client.query<{ user_id: string; date: string; points: number; bonus: number }>(ledger, [[a, b, c, d, e, f]]);
      const row = (id: string, date = DAY) => rows.find((r) => r.user_id === id && r.date === date);
      // Question 1 has 16 players: dog's share is (10 × 0.25 + 8) / 26 = 40.4%, so 0; an animal one player gave is
      // (10 × 0.5/9 + 1) / 26 = 5.98%, so floor(12.5 × (1 − 5.98/20)) = 8. Question 2 has 4 players before midnight (E's
      // kiwi is after), fewer than 5, so the expectation alone counts: banana 0.25, so 0; kiwi 0.5/3, so 4.
      // A: ladder 25 + 50 + 75 = 150, and every answer was in the host bank: no bonus.
      expect(row(a)).toMatchObject({ points: 150, bonus: 0 });
      // A's second day is scored with that day's counts: only A answered, fewer than 5, so cat's expected 0.5/9 counts:
      // 25 + 9. Mixing the days' counts would make it 8, as on the first day.
      expect(row(a, DAY2)).toMatchObject({ points: 34, bonus: 9 });
      // C: 25 + 50 = 75, aardvark 8, banana 0.
      expect(row(c)).toMatchObject({ points: 83, bonus: 8 });
      // E: 25 + 50 = 75 (the late answer counts on the ladder, D1). Horse, before midnight: 8. Kiwi, after: 0 (D8).
      expect(row(e)).toMatchObject({ points: 83, bonus: 8 });
      // B: the full ladder, 1000, plus cat 8, kiwi 4, green 6, france 8, lead 12, july 0 (0.5/2 of 4 members), leg 29.
      expect(row(b)).toMatchObject({ points: 1067, bonus: 67 });
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
