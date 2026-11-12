// Guest answers in the rarity counts and Insights, against the local stack (run with `npm run test:db`;
// docs/milestones/M18-guest-play.md, 18b). Each test runs as plor_app in a transaction that is always rolled back, so
// the guest tally's real rows are never changed, and reads the counts before and after: the hypothesis is that they
// move by exactly the guest answers. The test's own role adds the day's puzzle (plor_app can't write it).
import { randomBytes } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { type ApprovedPuzzle } from "@/content/puzzle";
import { dayInsights } from "@/insights/queries";
import { hashKey } from "@/lib/auth-limits";
import { GAME_ID } from "@/platform/game";
import { fixtureDay, isFixtureDay, loadFixtureBase } from "@/test/answer-fixture";
import { safeEntry } from "@/test/puzzles";
import { dayCounts, pooledCounts } from "./ledger";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
afterAll(() => admin.end());

type Day = { client: PoolClient; today: string; puzzle: ApprovedPuzzle };

// Runs fn as plor_app, with today's puzzle (the fixture day when today has none).
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

const newToken = () => hashKey(randomBytes(20).toString("base64url"));

async function startGuest(client: PoolClient, token: string, date: string): Promise<void> {
  await client.query("insert into private.guest_run (token_hash, game_id, puzzle_date) values ($1, $2, $3::date)", [token, GAME_ID, date]);
}
async function answerGuest(client: PoolClient, token: string, date: string, idx: number, entry: string, matched: boolean): Promise<void> {
  await client.query(
    "insert into private.guest_run_event (token_hash, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, $4, $5, $6)",
    [token, GAME_ID, date, idx, entry, matched],
  );
}
// How many rows, in every guest table, carry this hash.
async function rowsWith(client: PoolClient, token: string): Promise<number> {
  const tables = ["guest_run", "guest_run_event", "guest_question_open", "guest_round_word"];
  const { rows } = await client.query<{ n: number }>(
    `select (${tables.map((t) => `(select count(*) from private.${t} where token_hash = $1)`).join(" + ")})::int as n`,
    [token],
  );
  return rows[0].n;
}
async function tallyTotal(client: PoolClient): Promise<number> {
  const { rows } = await client.query<{ n: number }>("select coalesce(sum(n), 0)::int as n from private.guest_tally");
  return rows[0].n;
}

describe("guests in the rarity counts", () => {
  it("moves pooledCounts and dayCounts by exactly five guest answers to one entry, and a retried answer counts once", async () => {
    await asPlorApp(async ({ client, today, puzzle }) => {
      const entry = safeEntry(puzzle, 0);
      const pooledBefore = (await pooledCounts(client, puzzle, true)).get(0);
      const provisionalBefore = (await pooledCounts(client, puzzle, false)).get(0);
      const dayBefore = (await dayCounts(client, [today])).get(today)!.get(0);
      const tokens = Array.from({ length: 5 }, newToken);
      for (const token of tokens) {
        await startGuest(client, token, today);
        await answerGuest(client, token, today, 0, entry, false);
      }
      const pooledAfter = (await pooledCounts(client, puzzle, true)).get(0)!;
      const dayAfter = (await dayCounts(client, [today])).get(today)!.get(0)!;
      expect(pooledAfter.answered - (pooledBefore?.answered ?? 0)).toBe(5);
      expect(pooledAfter.byEntry.get(entry)! - (pooledBefore?.byEntry.get(entry) ?? 0)).toBe(5);
      expect(dayAfter.answered - (dayBefore?.answered ?? 0)).toBe(5);
      expect(dayAfter.byEntry.get(entry)! - (dayBefore?.byEntry.get(entry) ?? 0)).toBe(5);

      // The provisional bonus leaves the day out (withDay false), as for players: today's guest answers aren't in it.
      expect((await pooledCounts(client, puzzle, false)).get(0)).toEqual(provisionalBefore);

      // A retry: the order rule refuses the second answer to question 1 (the event's primary key would as well), and the
      // tally doesn't move. The savepoint keeps the transaction open after the refusal.
      const total = await tallyTotal(client);
      await client.query("savepoint retry");
      await expect(answerGuest(client, tokens[0], today, 0, entry, false)).rejects.toMatchObject({ code: "OB002" });
      await client.query("rollback to savepoint retry");
      expect(await tallyTotal(client)).toBe(total);
    });
  });

  it("leaves the tally unchanged for an answer after its day's midnight, and adds exactly one before it", async () => {
    await asPlorApp(async ({ client, today, puzzle }) => {
      const entry = safeEntry(puzzle, 0);
      const yesterday = (await client.query<{ d: string }>("select (private.today() - 1)::text as d")).rows[0].d;
      // plor_app can't write puzzles: the test's own role adds yesterday's day, which has closed.
      await client.query("reset role");
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3) on conflict do nothing", [
        GAME_ID,
        yesterday,
        { ...puzzle, date: yesterday },
      ]);
      await client.query("set local role plor_app");
      const before = await tallyTotal(client);
      const late = newToken();
      await startGuest(client, late, yesterday);
      await answerGuest(client, late, yesterday, 0, entry, false);
      expect(await tallyTotal(client)).toBe(before);
      const open = newToken();
      await startGuest(client, open, today);
      await answerGuest(client, open, today, 0, entry, false);
      expect(await tallyTotal(client)).toBe(before + 1);
    });
  });
});

describe("ending a guest run", () => {
  it("leaves no row with the hash after end_guest_run or purge_guest_days, and leaves the tally", async () => {
    await asPlorApp(async ({ client, today, puzzle }) => {
      const entry = safeEntry(puzzle, 0);
      const caught = newToken();
      await startGuest(client, caught, today);
      await answerGuest(client, caught, today, 0, puzzle.questions[0].host_answers[0], true);
      expect(await rowsWith(client, caught)).toBe(2);
      const before = await tallyTotal(client);
      await client.query("select private.end_guest_run($1, $2)", [caught, GAME_ID]);
      expect(await rowsWith(client, caught)).toBe(0);
      expect(await tallyTotal(client)).toBe(before);

      // A run still going is not ended by it.
      const going = newToken();
      await startGuest(client, going, today);
      await answerGuest(client, going, today, 0, entry, false);
      await client.query("savepoint going");
      await expect(client.query("select private.end_guest_run($1, $2)", [going, GAME_ID])).rejects.toMatchObject({ code: "OB015" });
      await client.query("rollback to savepoint going");
      expect(await rowsWith(client, going)).toBe(2);

      // A closed day's run goes at the purge, with its answers; today's stays.
      const yesterday = (await client.query<{ d: string }>("select (private.today() - 1)::text as d")).rows[0].d;
      await client.query("reset role");
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3) on conflict do nothing", [
        GAME_ID,
        yesterday,
        { ...puzzle, date: yesterday },
      ]);
      await client.query("set local role plor_app");
      const old = newToken();
      await startGuest(client, old, yesterday);
      await answerGuest(client, old, yesterday, 0, entry, false);
      const tally = await tallyTotal(client);
      await client.query("select private.purge_guest_days()");
      expect(await rowsWith(client, old)).toBe(0);
      expect(await rowsWith(client, going)).toBe(2);
      expect(await tallyTotal(client)).toBe(tally);
    });
  });
});

describe("Insights with guests", () => {
  it("adds guest answers, catches and top answers by exactly their counts and leaves misses alone", async () => {
    await asPlorApp(async ({ client, today, puzzle }) => {
      const host = puzzle.questions[0].host_answers[0];
      const other = safeEntry(puzzle, 0);
      const before = (await dayInsights(client, today)).questions[0];
      // Three guests catch, four give another answer.
      for (let i = 0; i < 7; i++) {
        const token = newToken();
        await startGuest(client, token, today);
        await answerGuest(client, token, today, 0, i < 3 ? host : other, i < 3);
      }
      const after = (await dayInsights(client, today)).questions[0];
      expect(after.answered - before.answered).toBe(7);
      expect(after.caught - before.caught).toBe(3);
      expect(after.catchRate).toBeCloseTo(after.caught / after.answered, 10);
      const count = (q: typeof before, id: string) => q.topAnswers.find((a) => a.answer.id === id)?.count ?? 0;
      expect(count(after, host) - count(before, host)).toBe(3);
      expect(count(after, other) - count(before, other)).toBe(4);
      expect(after.misses).toEqual(before.misses);
    });
  });
});
