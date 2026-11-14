// Guest answers in the rarity counts and Insights, against the local stack (run with `npm run test:db`;
// docs/milestones/M18-guest-play.md, 18b). Each test runs as plor_app in a transaction that is always rolled back, so
// the guest tally's real rows are never changed, and reads the counts before and after: the hypothesis is that they
// move by exactly the guest answers. The test's own role adds the day's puzzle (plor_app can't write it).
import { randomBytes, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { type ApprovedPuzzle } from "@/content/puzzle";
import { dayInsights } from "@/insights/queries";
import { hashKey } from "@/lib/auth-limits";
import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import { fixtureDay, isFixtureDay, loadFixtureBase } from "@/test/answer-fixture";
import { hostName, safeEntry } from "@/test/puzzles";
import { searchAnswers } from "./answers";
import { dayCounts, pooledCounts } from "./ledger";
import { answer, startRun } from "./runs";

const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
afterAll(() => admin.end());

type Day = { client: PoolClient; today: string; puzzle: ApprovedPuzzle; userId: string };

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
    const userId = randomUUID();
    await client.query("insert into auth.users (id, email) values ($1, $2)", [userId, `${userId}@example.test`]);
    await client.query("set local role plor_app");
    await fn({ client, today, puzzle, userId });
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

describe("guests in the answer search", () => {
  it("counts guests with the players who gave an answer, once enough answered", async () => {
    await asPlorApp(async ({ client, today, puzzle, userId }) => {
      const host = puzzle.questions[0].host_answers[0];
      // A player catches the host on question 1: their run is over, so they may search that question's answers.
      await startRun(client, userId);
      expect((await answer(client, userId, 0, hostName(puzzle, 0))).run.status).toBe("died");
      const found = async () => (await searchAnswers(client, userId, today, 0, "")).map((a) => a.players);
      // One player answered: under the minimum, no count.
      expect(await found()).toEqual([null]);
      for (let i = 0; i < 4; i++) {
        const token = newToken();
        await startGuest(client, token, today);
        await answerGuest(client, token, today, 0, host, true);
      }
      // Five answers in all, one a player's: the minimum is met by the sum, and the count is theirs together.
      expect(await found()).toEqual([5]);
    });
  });
});

describe("a game 2 guest run as plor_app", () => {
  it("plays through the guest judge and examples, and is over when round 2's clock runs out", async () => {
    await asPlorApp(async ({ client }) => {
      // The test's own role adds what plor_app can't write: a day of two rounds and two words that fit them.
      await client.query("reset role");
      const { rows } = await client.query<{ day: string }>("select (private.today() + 455)::text as day");
      const day = rows[0].day;
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [
        SUBSTRINGS_ID,
        day,
        { format: 1, game_id: SUBSTRINGS_ID, date: day, rounds: ["ck", "ro"], bonus_letter: "f" },
      ]);
      await client.query(
        "insert into private.dictionary_word (word_key, spelling, plain, everyday) values ('zqckq', 'zqckq', 'zqckq', false), ('zqrok', 'zqrok', 'zqrok', false) on conflict do nothing",
      );
      await client.query("set local role plor_app");
      const token = newToken();
      await client.query("insert into private.guest_run (token_hash, game_id, puzzle_date) values ($1, $2, $3::date)", [token, SUBSTRINGS_ID, day]);
      const judge = async (word: string) =>
        (await client.query<{ r: { outcome: string; word?: string } }>("select private.guest_judge_word($1, $2::date, $3, $3, $3) as r", [token, day, word])).rows[0].r;
      expect(await judge("zqckq")).toEqual({ outcome: "accepted", word: "zqckq" });
      await client.query("insert into private.guest_question_open (token_hash, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, 1)", [token, SUBSTRINGS_ID, day]);
      expect((await judge("zzzzz")).outcome).toBe("not_a_word");
      expect((await judge("zqrok")).outcome).toBe("locked");
      // plor_app can neither write the words nor read the rejections: only the judge does.
      await client.query("savepoint direct");
      await expect(
        client.query("insert into private.guest_round_word (token_hash, game_id, puzzle_date, round_idx, word_key, word) values ($1, $2, $3::date, 1, 'a', 'a')", [token, SUBSTRINGS_ID, day]),
      ).rejects.toThrow(/permission denied/);
      await client.query("rollback to savepoint direct");
      await client.query("savepoint reject");
      await expect(client.query("select count(*) from private.guest_round_reject")).rejects.toThrow(/permission denied/);
      await client.query("rollback to savepoint reject");
      // Round 2's clock then runs out (the test's own role moves it back), which ends the run.
      await client.query("reset role");
      await client.query("update private.guest_question_open set opened_at = opened_at - interval '21 seconds' where token_hash = $1", [token]);
      await client.query("set local role plor_app");
      expect((await client.query("select private.guest_round_examples($1, $2::date)", [token, day])).rows).toBeDefined();
    });
  });
});

describe("clearing guest runs", () => {
  it("leaves no row with the hash after purge_guest_days, keeps a finished run of today, and leaves the tally", async () => {
    await asPlorApp(async ({ client, today, puzzle }) => {
      const entry = safeEntry(puzzle, 0);
      const caught = newToken();
      await startGuest(client, caught, today);
      await answerGuest(client, caught, today, 0, puzzle.questions[0].host_answers[0], true);
      expect(await rowsWith(client, caught)).toBe(2);

      // A run still going.
      const going = newToken();
      await startGuest(client, going, today);
      await answerGuest(client, going, today, 0, entry, false);
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
      expect(await rowsWith(client, caught)).toBe(2);
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
