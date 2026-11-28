// Settling runs into the points ledger against the local stack (run with `npm run test:db`;
// docs/milestones/M09-points-and-leaderboard.md, 9a). A closed past day is built inside a transaction that is rolled
// back: its answers need times in the past, which the answer triggers refuse, so they're switched off
// (session_replication_role) only while the fixture is inserted. Settling then runs as plor_app with them back on.
// Both need the local superuser. The days are the fixture's day on a clock (src/test/answer-fixture.ts).
import { afterAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { GAME_ID } from "@/platform/game";
import { fixtureClockDay, fixtureId } from "@/test/answer-fixture";
import { settleRuns } from "./ledger";
import { localStack } from "../../scripts/slot.ts";

// A closed day, in Pacific time (PST in February).
const DAY = "2001-02-03";
const at = (time: string) => `${DAY} ${time}-08`;
const afterMidnight = (time: string) => `2001-02-04 ${time}-08`;
// A fixture thing by question and slug.
const t = (q: number, slug: string) => fixtureId(q, slug);

const admin = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 1 });
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

describe("settling runs into the points ledger", () => {
  // M23 23c: a day on a clock scores by tier with no bonus, and an answer given after the day's midnight earns nothing.
  it("writes a closed day's row as the points of the answers given before midnight, with no bonus, and nothing twice", async () => {
    await inRolledBackTransaction(async (client) => {
      await client.query("set local session_replication_role = replica");
      const clockDay = fixtureClockDay(DAY, `${DAY}T00:00:00Z`);
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, DAY, clockDay]);
      const [a, b] = [await newUser(client), await newUser(client)];
      for (const user of [a, b]) {
        await client.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, $4)", [user, GAME_ID, DAY, at("23:59:00")]);
      }
      // A: a common and an uncommon answer before midnight, a rare one after it. B gave none.
      const given: [string, string, number, string][] = [
        [t(0, "dog"), "common", 10, at("23:59:10")],
        [t(0, "cat"), "uncommon", 25, at("23:59:30")],
        [t(0, "horde"), "rare", 50, afterMidnight("00:00:10")],
      ];
      for (const [entry, tier, points, when] of given) {
        await client.query(
          `insert into private.clock_answer (user_id, game_id, puzzle_date, question_idx, entry_id, tier, added_ms, points, created_at)
           values ($1, $2, $3::date, 0, $4, $5, 3000, $6, $7)`,
          [a, GAME_ID, DAY, entry, tier, points, when],
        );
      }
      await client.query("set local session_replication_role = origin");
      await client.query("set local role plor_app");
      await settleRuns(client);
      const { rows } = await client.query<{ user_id: string; points: number; bonus: number }>(
        "select user_id, points, bonus from private.points_ledger where user_id = any($1::uuid[])",
        [[a, b]],
      );
      expect(rows.sort((x, y) => y.points - x.points)).toEqual([
        { user_id: a, points: 35, bonus: 0 },
        { user_id: b, points: 0, bonus: 0 },
      ]);
      // Settling again writes nothing and changes nothing.
      expect(await settleRuns(client)).toBe(0);
      const { rows: again } = await client.query("select user_id, points, bonus from private.points_ledger where user_id = any($1::uuid[])", [[a, b]]);
      expect(again.sort((x, y) => y.points - x.points)).toEqual(rows.sort((x, y) => y.points - x.points));
    });
  });

  it("gives no row to a player with no runs on a closed day", async () => {
    await inRolledBackTransaction(async (client) => {
      const nobody = await newUser(client);
      await client.query("set local role plor_app");
      await settleRuns(client);
      expect((await client.query("select from private.points_ledger where user_id = $1", [nobody])).rows).toEqual([]);
    });
  });
});
