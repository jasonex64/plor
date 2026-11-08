// Game 2's ledger rows and the end of a run's standing, against the local stack (`npm run test:db`;
// docs/milestones/M16-16e-points-and-boards.md, 16e-2). Each case builds its days in a transaction that is rolled back,
// with the round rules switched off while the fixture goes in, then runs as plor_app, as src/game/ledger.db.test.ts
// does. A run is finished when its round 7 opened long ago; one without has had only round 1.
import { afterAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { SUBSTRINGS_ID } from "@/platform/game";
import { settleSubstringRuns, standingToday } from "./substring-places";

const DAY = "2001-02-03";
const ROUNDS = ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"];

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

const asPlorApp = (client: PoolClient) => client.query("set local session_replication_role = origin; set local role plor_app");

async function day(client: PoolClient, date: string) {
  await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [SUBSTRINGS_ID, date, { format: 1, game_id: SUBSTRINGS_ID, date, rounds: ROUNDS, bonus_letter: "j" }]);
}

// A player's run on a day with these words, one a round from round 1, finished or not.
async function run(client: PoolClient, date: string, words: string[], finished: boolean): Promise<string> {
  const { rows } = await client.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), gen_random_uuid() || '@example.test') returning id");
  const id = rows[0].id;
  await client.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, $3::date)", [id, SUBSTRINGS_ID, date]);
  for (const [i, word] of words.entries()) {
    await client.query("insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word) values ($1, $2, $3::date, $4, $5, $5)", [id, SUBSTRINGS_ID, date, i, word]);
  }
  if (finished) await finish(client, id, date);
  return id;
}

const finish = (client: PoolClient, id: string, date: string) =>
  client.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx, opened_at) values ($1, $2, $3::date, 6, $3::date)", [id, SUBSTRINGS_ID, date]);

const befriend = (client: PoolClient, a: string, b: string) =>
  client.query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [a, b]);

const ledgerOf = async (client: PoolClient, id: string) =>
  (await client.query<{ points: number; bonus: number; date: string }>("select points, bonus, puzzle_date::text as date from private.points_ledger where user_id = $1 and game_id = $2", [id, SUBSTRINGS_ID])).rows;

describe("settling game 2 runs", () => {
  it("gives a closed day's finished and unfinished runs their totals once, and leaves today's", async () => {
    await inRolledBackTransaction(async (client) => {
      await day(client, DAY);
      // 50 + 50 for the words, 120 for j, and 14 different letters, 200.
      const finished = await run(client, DAY, ["abcdefg", "hijklmn"], true);
      // 20 for the word, and 3 different letters: 350 × 1.15^-15 is 43.0, so 45.
      const left = await run(client, DAY, ["abc"], false);
      const today = (await client.query<{ d: string }>("select private.today()::text as d")).rows[0].d;
      await day(client, today);
      const playing = await run(client, today, ["abcdefg"], true);
      await asPlorApp(client);

      await settleSubstringRuns(client);
      expect(await ledgerOf(client, finished)).toEqual([{ points: 420, bonus: 0, date: DAY }]);
      expect(await ledgerOf(client, left)).toEqual([{ points: 65, bonus: 0, date: DAY }]);
      expect(await ledgerOf(client, playing)).toEqual([]);

      await settleSubstringRuns(client);
      expect(await ledgerOf(client, finished)).toHaveLength(1);
      expect(await ledgerOf(client, left)).toHaveLength(1);
    });
  });
});

describe("a finished run's standing so far", () => {
  it("places it among the finished runs from 10 of them, a tie counting half, and ranks it among finished friends", async () => {
    await inRolledBackTransaction(async (client) => {
      await day(client, DAY);
      // One word each of 3 to 11 letters, all one letter, so each scores its word's points and 35. The viewer's 7
      // letters tie the 7-letter run.
      const others = new Map<number, string>();
      for (const length of [3, 4, 5, 6, 7, 8, 9, 10]) others.set(length, await run(client, DAY, ["a".repeat(length)], true));
      const late = await run(client, DAY, ["a".repeat(11)], false);
      const unfinished = await run(client, DAY, ["a".repeat(18)], false);
      const viewer = await run(client, DAY, ["b".repeat(7)], true);
      await befriend(client, viewer, others.get(10)!);
      await befriend(client, viewer, unfinished);
      await asPlorApp(client);

      // 9 finished: no percent yet. The friend with 10 letters is ahead; the unfinished one doesn't count.
      expect(await standingToday(client, viewer, DAY)).toEqual({ percent: null, friends: { rank: 2, of: 2 } });

      await client.query("reset role; set local session_replication_role = replica");
      await finish(client, late, DAY);
      await asPlorApp(client);
      // 10 finished: 4 below, 1 tied, of 9 others.
      expect(await standingToday(client, viewer, DAY)).toEqual({ percent: 50, friends: { rank: 2, of: 2 } });
    });
  });

  it("gives no friend rank until a friend has finished", async () => {
    await inRolledBackTransaction(async (client) => {
      await day(client, DAY);
      const viewer = await run(client, DAY, ["abc"], true);
      const friend = await run(client, DAY, ["abcd"], false);
      await befriend(client, viewer, friend);
      await asPlorApp(client);
      expect(await standingToday(client, viewer, DAY)).toEqual({ percent: null, friends: null });
    });
  });
});
