// A run on a clock as plor_app really does it (docs/milestones/M23-23c-the-run-on-a-clock.md): its grants, its RLS policies,
// the triggers that judge every move and the status view, for a player and for a guest. Locally the routes connect as
// postgres (ROADMAP), so this file switches to plor_app as runs.plor-app.db.test.ts does. Every test is rolled back but the
// two-connections one, which needs rows both connections see and removes them again. The database's own rules are in
// supabase/tests/clock_run.test.sql; this file asks that the TypeScript says them right.
import { randomBytes, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import type { ClockPuzzle } from "@/content/puzzle";
import type { ClockState } from "./clock-state";
import { hashKey } from "@/lib/auth-limits";
import { GAME_ID } from "@/platform/game";
import { fixtureClockDay, fixtureDay, fixtureId, isFixtureDay, loadFixtureBase, removeFixtureBase } from "@/test/answer-fixture";
import { answerClockRun, clockState, finishClockRun, isClockRun, nextClockRun, startClock } from "./clock-runs";
import { answerGuestClock, finishGuestClock, guestClockState, isClockGuestRun, nextGuestClock, startGuestClockRun } from "./guest-clock-runs";
import { localStack } from "../../scripts/slot.ts";

const admin = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 4 });
afterAll(() => admin.end());

type Day = { client: PoolClient; today: string; day: ClockPuzzle };

// Runs fn as plor_app in a transaction that is always rolled back, on a day on a clock that replaces today's fixture day.
async function onClockDay(fn: (d: Day) => Promise<void>): Promise<void> {
  const client = await admin.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ today: string; content: ClockPuzzle | null }>(
      "select private.today()::text as today, (select content from private.puzzle where game_id = $1 and puzzle_date = private.today()) as content",
      [GAME_ID],
    );
    const { today, content } = rows[0];
    if (content && !isFixtureDay(content)) throw new Error(`${today} has a real puzzle; this test needs it free for the fixture day`);
    await client.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
    const day = fixtureClockDay(today, await loadFixtureBase(client));
    await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, today, day]);
    await client.query("set local role plor_app");
    await fn({ client, today, day });
  } finally {
    await client.query("rollback");
    client.release();
  }
}

async function newPlayer(client: PoolClient): Promise<string> {
  const userId = randomUUID();
  await client.query("reset role");
  await client.query("insert into auth.users (id, email) values ($1, $2)", [userId, `${userId}@example.test`]);
  await client.query("set local role plor_app");
  return userId;
}

// Time passing: the run started this long ago (as the owner; plor_app may not change a run).
async function startedAgo(client: PoolClient, table: "run" | "guest_run", column: "user_id" | "token_hash", key: string, gone: string): Promise<void> {
  await client.query("reset role");
  await client.query(`update private.${table} set started_at = started_at - $2::interval where ${column} = $1`, [key, gone]);
  await client.query("set local role plor_app");
}

// A move the database refuses aborts the test's transaction, so it runs under a savepoint the refusal rolls back to.
async function refused<T>(client: PoolClient, move: () => Promise<T>): Promise<T> {
  await client.query("savepoint refused");
  try {
    return await move();
  } catch (err) {
    await client.query("rollback to savepoint refused");
    throw err;
  }
}

// The same state read again: only the time to the reset has moved.
const sameRun = (run: ClockState) => ({ ...run, msToReset: expect.any(Number) });

const name = (slug: string, q: number) => fixtureId(q, slug);
const missesOf = async (client: PoolClient, userId: string) =>
  (await client.query<{ n: number }>("select count(*)::int as n from private.missed_answer where user_id = $1", [userId])).rows[0].n;

describe("a player's run on a clock as plor_app", () => {
  it("starts with 20 seconds, adds each tier's time less 5% an answer, ignores repeats and misses, never goes back, and Finish ends it", async () => {
    await onClockDay(async ({ client }) => {
      const userId = await newPlayer(client);
      expect(await isClockRun(client, userId)).toBe(true);
      expect(await clockState(client, userId)).toMatchObject({ format: 4, status: "not_started", question: null, answers: [], missed: null });

      const started = await startClock(client, userId);
      expect(started).toMatchObject({ status: "in_progress", total: 3, question: { index: 0, prompt: "Name an animal" }, points: 0, missed: null });
      expect(started.msLeft).toBeGreaterThan(19000);
      expect(started.msLeft).toBeLessThanOrEqual(20000);
      // The state holds no later prompt and no answer, before or after the player's own.
      expect(JSON.stringify(started)).not.toMatch(/fruit|color|fish|horse/);

      // A common, an uncommon and a rare answer: 3 s, 5 s and 8 s, 5% less for each answer the run already holds; 10, 25 and 50.
      const dog = await answerClockRun(client, userId, 0, "Dog");
      expect(dog).toMatchObject({ notInList: false, repeat: false });
      expect(dog.run.answers).toEqual([{ index: 0, answer: { id: name("dog", 0), name: "dog" }, tier: "common", addedMs: 3000, points: 10 }]);
      expect(dog.run.msLeft).toBeGreaterThan(22000);
      expect(dog.run.msLeft).toBeLessThanOrEqual(23000);

      const cat = await answerClockRun(client, userId, 0, "cat");
      expect(cat.run.answers[1]).toMatchObject({ tier: "uncommon", addedMs: 4750, points: 25 });
      const horde = await answerClockRun(client, userId, 0, "horde");
      expect(horde.run.answers[2]).toMatchObject({ tier: "rare", addedMs: 7220, points: 50 });
      expect(horde.run.points).toBe(85);

      // A repeat changes neither the clock nor the score.
      const again = await answerClockRun(client, userId, 0, "dog");
      expect(again).toMatchObject({ notInList: false, repeat: true });
      expect(again.run.answers).toEqual(horde.run.answers);
      expect(again.run.points).toBe(85);
      expect(again.run.msLeft).toBeLessThanOrEqual(horde.run.msLeft!);

      // Text that names nothing changes neither, and is logged as a miss.
      const before = await missesOf(client, userId);
      const nothing = await answerClockRun(client, userId, 0, "zzz qqq");
      expect(nothing).toMatchObject({ notInList: true, repeat: false });
      expect(nothing.run.answers).toEqual(horde.run.answers);
      expect(await missesOf(client, userId)).toBe(before + 1);

      // Only the open question takes answers; Finish waits for the last one.
      await expect(refused(client, () => answerClockRun(client, userId, 1, "apple"))).rejects.toMatchObject({ code: "not_open", status: 409 });
      await expect(refused(client, () => finishClockRun(client, userId))).rejects.toMatchObject({ code: "not_last_question", status: 409 });

      // Next opens the question after the one the tab shows; again, it changes nothing; a tab that is behind is told so, below.
      expect((await nextClockRun(client, userId, 0)).question).toEqual({ index: 1, prompt: "Name a fruit" });
      expect((await nextClockRun(client, userId, 0)).question).toEqual({ index: 1, prompt: "Name a fruit" });
      await expect(refused(client, () => answerClockRun(client, userId, 0, "bear"))).rejects.toMatchObject({ code: "not_open", status: 409 });
      expect((await answerClockRun(client, userId, 1, "apple")).run.answers[3]).toMatchObject({ index: 1, tier: "common", addedMs: Math.round(3000 * 0.95 ** 3) });

      // Never past the third question.
      expect((await nextClockRun(client, userId, 1)).question?.index).toBe(2);
      await expect(refused(client, () => nextClockRun(client, userId, 2))).rejects.toMatchObject({ code: "run_over", status: 409 });
      await expect(refused(client, () => nextClockRun(client, userId, 0))).rejects.toMatchObject({ code: "out_of_order", status: 409 });
      await answerClockRun(client, userId, 2, "red");

      // Finish ends the run at once, with the score as it stands, and says what the player didn't give.
      const done = await finishClockRun(client, userId);
      expect(done).toMatchObject({ status: "over", question: null, msLeft: null, points: 85 + 10 + 10 });
      expect(done.missed![0]).toEqual({
        index: 0,
        prompt: "Name an animal",
        answers: [
          { id: name("bear", 0), name: "bear", tier: "common" },
          { id: name("fish", 0), name: "fish", tier: "uncommon" },
          { id: name("horse", 0), name: "horse", tier: "uncommon" },
        ],
      });
      // A second Finish returns the state; an answer or a Next after it is the end of the run.
      expect(await finishClockRun(client, userId)).toEqual(sameRun(done));
      expect((await answerClockRun(client, userId, 2, "blue")).run).toEqual(sameRun(done));
      await expect(refused(client, () => nextClockRun(client, userId, 1))).rejects.toMatchObject({ code: "run_over", status: 409 });
      expect(await clockState(client, userId)).toEqual(sameRun(done));
    });
  });

  it("returns the end of the run for an answer after the clock passed zero, whatever it says, and counts the time answers added", async () => {
    await onClockDay(async ({ client }) => {
      const userId = await newPlayer(client);
      await startClock(client, userId);
      await answerClockRun(client, userId, 0, "dog");
      // 20 s + 3 s of the answer: 21 s gone leaves 2 s, so the run is live and takes one more answer, which adds 4.75 s.
      await startedAgo(client, "run", "user_id", userId, "21 seconds");
      expect((await answerClockRun(client, userId, 0, "cat")).run).toMatchObject({ status: "in_progress", points: 35 });
      // 7.75 s of ends the clock at 27.75 s; 8 more gone passes it.
      await startedAgo(client, "run", "user_id", userId, "8 seconds");
      const before = await missesOf(client, userId);
      const late = await answerClockRun(client, userId, 0, "horde");
      expect(late).toMatchObject({ notInList: false, repeat: false, run: { status: "over", points: 35, msLeft: null, question: null } });
      expect(late.run.answers).toHaveLength(2);
      // Text that names nothing is not a miss once the run is over.
      expect((await answerClockRun(client, userId, 0, "zzz qqq")).notInList).toBe(false);
      expect(await missesOf(client, userId)).toBe(before);
    });
  });

  it("is not a clock run on a day of the old format", async () => {
    await onClockDay(async ({ client, today }) => {
      const userId = await newPlayer(client);
      await client.query("reset role");
      await client.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, today, fixtureDay(today, new Date().toISOString())]);
      await client.query("set local role plor_app");
      expect(await isClockRun(client, userId)).toBe(false);
    });
  });
});

const newHash = () => hashKey(randomBytes(20).toString("base64url"));

describe("a guest's run on a clock as plor_app", () => {
  it("plays the same run: start, answers, a repeat, Next, Finish, then over", async () => {
    await onClockDay(async ({ client }) => {
      const hash = newHash();
      expect(await isClockGuestRun(client)).toBe(true);
      expect(await guestClockState(client, null)).toMatchObject({ format: 4, status: "not_started" });
      expect(await guestClockState(client, hash)).toMatchObject({ status: "not_started" });
      expect(await startGuestClockRun(client, hash)).toMatchObject({ status: "in_progress", question: { index: 0, prompt: "Name an animal" } });

      const dog = await answerGuestClock(client, hash, 0, "dog");
      expect(dog.run.answers).toEqual([{ index: 0, answer: { id: name("dog", 0), name: "dog" }, tier: "common", addedMs: 3000, points: 10 }]);
      expect(await answerGuestClock(client, hash, 0, "dog")).toMatchObject({ repeat: true, run: { points: 10 } });
      // A guest's miss is a free retry, stored nowhere.
      expect(await answerGuestClock(client, hash, 0, "zzz qqq")).toMatchObject({ notInList: true, repeat: false, run: { points: 10 } });
      await expect(refused(client, () => answerGuestClock(client, hash, 1, "apple"))).rejects.toMatchObject({ code: "not_open", status: 409 });
      await expect(refused(client, () => finishGuestClock(client, hash))).rejects.toMatchObject({ code: "not_last_question", status: 409 });

      expect((await nextGuestClock(client, hash, 0)).question?.index).toBe(1);
      expect((await nextGuestClock(client, hash, 1)).question?.index).toBe(2);
      await expect(refused(client, () => nextGuestClock(client, hash, 2))).rejects.toMatchObject({ code: "run_over", status: 409 });
      const done = await finishGuestClock(client, hash);
      expect(done).toMatchObject({ status: "over", question: null, points: 10 });
      expect(done.missed).toHaveLength(3);
      // A start on a run that is over shows it, and it stays until the day's purge.
      expect(await startGuestClockRun(client, hash)).toEqual(sameRun(done));
      expect((await answerGuestClock(client, hash, 2, "red")).run).toEqual(sameRun(done));
    });
  });

  it("ends when the clock passes zero", async () => {
    await onClockDay(async ({ client }) => {
      const hash = newHash();
      await startGuestClockRun(client, hash);
      await startedAgo(client, "guest_run", "token_hash", hash, "21 seconds");
      expect((await answerGuestClock(client, hash, 0, "dog")).run).toMatchObject({ status: "over", answers: [], msLeft: null });
    });
  });
});

// Two tabs of one player at the same moment: the second answer waits for the first, and then counts it. The rows have to be
// seen by both connections, so they are committed, on a day of their own, and removed at the end.
describe("two connections answering at once", () => {
  it("makes the second wait for the first, and gives it the time of the answer after", async () => {
    const userId = randomUUID();
    const client = await admin.connect();
    let date = "";
    try {
      date = (await client.query<{ d: string }>("select (private.today() + 431)::text as d")).rows[0].d;
      const base = await loadFixtureBase(client);
      await client.query("insert into auth.users (id, email) values ($1, $2)", [userId, `${userId}@example.test`]);
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, date, fixtureClockDay(date, base)]);
      await client.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [userId, GAME_ID, date]);

      const [a, b] = [await admin.connect(), await admin.connect()];
      try {
        await a.query("begin");
        await a.query("set local role plor_app");
        // A's answer holds the run's lock until it commits, and counts no answer before it.
        const first = await a.query<{ tier: string; added_ms: number }>(
          `insert into private.clock_answer (user_id, game_id, puzzle_date, question_idx, entry_id) values ($1, $2, $3::date, 0, $4) returning tier, added_ms`,
          [userId, GAME_ID, date, name("dog", 0)],
        );
        expect(first.rows[0]).toEqual({ tier: "common", added_ms: 3000 });
        const counted = 0;

        await b.query("set role plor_app");
        const { rows: pid } = await b.query<{ pid: number }>("select pg_backend_pid() as pid");
        let settled = false;
        const second = answerClockRun(b, userId, 0, "fish").finally(() => {
          settled = true;
        });
        await expect
          .poll(async () => (await client.query("select 1 from pg_stat_activity where pid = $1 and wait_event_type = 'Lock'", [pid[0].pid])).rowCount)
          .toBe(1);
        expect(settled).toBe(false);

        await a.query("commit");
        const result = await second;
        expect(result.run.answers.map((x) => [x.answer.name, x.addedMs])).toEqual([
          ["dog", 3000],
          ["fish", Math.round(5000 * 0.95 ** (counted + 1))],
        ]);
        const { rows } = await client.query<{ entry_id: string; added_ms: number }>(
          "select entry_id, added_ms from private.clock_answer where user_id = $1 order by created_at",
          [userId],
        );
        expect(rows).toEqual([
          { entry_id: name("dog", 0), added_ms: 3000 },
          { entry_id: name("fish", 0), added_ms: 4750 },
        ]);
      } finally {
        await a.query("rollback");
        await b.query("reset role");
        a.release();
        b.release();
      }
    } finally {
      // The run goes with its user; the day and the fixture base are ours alone.
      await client.query("delete from auth.users where id = $1", [userId]);
      await client.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, date]);
      await removeFixtureBase(client);
      client.release();
    }
  });
});
