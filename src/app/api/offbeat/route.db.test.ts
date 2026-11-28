// Offbeat's game screen against the local stack (run with `npm run test:db`; docs/milestones/M14-14a-2b-game-screen.md,
// criteria 4 and 5). P has played on five past days of the fixture's day on a clock, written directly with the answer triggers
// switched off (session_replication_role, as src/game/ledger.db.test.ts does) since their answers need times in the past; Q left
// yesterday's run going; N never played. T is today. P's days, by hand:
//   T-8  ledger 1000
//   T-5  ledger 125
//   T-3  ledger 400
//   T-2  no answer and no ledger row: the route settles it, at 0 points
//   T-1  ledger 25
// So the streak is 5 (T-4, T-6 and T-7 have no puzzle, which neither counts nor breaks it, and P hasn't played today),
// the best 1000, the average points a day (1000 + 125 + 400 + 0 + 25) / 5 = 310 (23f-2, answer 66), and the points of
// the last 7 days, T-6 to T: –, 125, –, 400, 0, 25, – (no ledger row, no points).
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { GAME_ID } from "@/platform/game";
import { getStats, getYesterday, readStats } from "@/game/offbeat";
import { settleRuns } from "@/game/ledger";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { fixtureClockDay, fixtureId } from "@/test/answer-fixture";
import { ensurePuzzle, fixture, nameOf, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as offbeatRoute } from "./route";
import { localStack } from "../../../../scripts/slot.ts";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, userId: "", session: new Map<string, string>() });
const [P, Q, N] = [player("op"), player("oq"), player("on")];
// The local superuser, which may switch the triggers off; the routes connect as postgres locally (ROADMAP).
const admin = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 1 });
// T-k, from private.today().
const day: Record<number, string> = {};
// Today's puzzle carries a marker no other day has, so the route's answer can be searched for it.
const TODAY_MARK = `today-${RUN}`;

async function call() {
  const response = await offbeatRoute(apiRequest("/api/offbeat", { method: "GET" }));
  return { status: response.status, body: await response.json() };
}

// A run on a past day, started at its noon, with these animals given at question 1, a second apart, each a common answer for 10
// points. still: the run's clock starts an hour from now, so the run is still going.
async function pastRun(client: PoolClient, userId: string, date: string, slugs: string[], still = false) {
  const noon = `(($3::date + time '12:00') at time zone 'America/Los_Angeles')`;
  await client.query(`insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, ${still ? "statement_timestamp() + interval '1 hour'" : noon})`, [
    userId,
    GAME_ID,
    date,
  ]);
  for (const [i, slug] of slugs.entries()) {
    await client.query(
      `insert into private.clock_answer (user_id, game_id, puzzle_date, question_idx, entry_id, tier, added_ms, points, created_at)
       values ($1, $2, $3::date, 0, $4, 'common', 3000, 10, ${noon} + $5::int * interval '1 second')`,
      [userId, GAME_ID, date, fixtureId(0, slug), i],
    );
  }
}

async function ledger(client: PoolClient, userId: string, date: string, points: number) {
  await client.query("insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, $2, $3::date, $4, 0)", [
    userId,
    GAME_ID,
    date,
    points,
  ]);
}

beforeAll(useLocalStack);

afterAll(async () => {
  // Deleting the auth users cascades to their runs, answers and ledger rows; then the fixture puzzles go.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().query("delete from private.puzzle where game_id = $1 and content ->> 'mark' = $2", [GAME_ID, TODAY_MARK]);
  await removeFixtures();
  await getPool().end();
  await admin.end();
});

describe("Offbeat's game screen", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in three players and writes P's and Q's past days", async () => {
    for (const p of [P, Q, N]) {
      p.session = (await signIn(p.email)).session;
      const r = await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } }));
      expect(r.status).toBe(201);
      const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [p.email]);
      p.userId = rows[0].id;
    }
    const { rows } = await getPool().query<{ k: number; date: string }>("select k, (private.today() - k)::text as date from generate_series(0, 8) k");
    for (const r of rows) day[r.k] = r.date;

    // The days without a puzzle must be free of one: a puzzle there would count in the streak or break it.
    const { rows: taken } = await getPool().query("select puzzle_date::text from private.puzzle where game_id = $1 and puzzle_date = any($2::date[])", [
      GAME_ID,
      [day[4], day[6], day[7]],
    ]);
    expect(taken).toEqual([]);
    for (const k of [8, 5, 3, 2, 1]) await ensurePuzzle(day[k]);
    // Today's, with the marker in its prompts. A real day under today is refused, as for the other database tests.
    const today = fixture(day[0]);
    const marked = { ...today, mark: TODAY_MARK, questions: today.questions.map((q) => ({ ...q, prompt: `${q.prompt} ${TODAY_MARK}` })) };
    const { rowCount } = await getPool().query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3) on conflict do nothing", [
      GAME_ID,
      day[0],
      marked,
    ]);
    expect(rowCount, "today must be free for the fixture day").toBe(1);

    const client = await admin.connect();
    try {
      await client.query("begin");
      await client.query("set local session_replication_role = replica");
      await pastRun(client, P.userId, day[8], ["dog", "cat", "fish"]);
      await ledger(client, P.userId, day[8], 1000);
      await pastRun(client, P.userId, day[5], ["dog"]);
      await ledger(client, P.userId, day[5], 125);
      await pastRun(client, P.userId, day[3], ["dog", "cat"]);
      await ledger(client, P.userId, day[3], 400);
      await pastRun(client, P.userId, day[2], []);
      await pastRun(client, P.userId, day[1], ["dog"]);
      await ledger(client, P.userId, day[1], 25);
      // Q gave one answer yesterday and the clock is still running: the run is still in progress.
      await pastRun(client, Q.userId, day[1], ["dog"], true);
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  });

  it("gives P's streak, best score, average points a day and points of the last 7 days, settling the closed day first (criterion 4; 23f-2)", async () => {
    useSession(P.session);
    const r = await call();
    expect(r.status).toBe(200);
    expect(r.body.stats).toEqual({
      streak: 5,
      best: 1000,
      average: 310,
      days: [6, 5, 4, 3, 2, 1, 0].map((k, i) => ({ date: day[k], points: [null, 125, null, 400, 0, 25, null][i] })),
    });
    // Answer 66: no count of questions survived, and no full runs.
    expect(JSON.stringify(r.body.stats)).not.toMatch(/survived|fullRuns|full_runs/);
    const { rows } = await getPool().query("select points from private.points_ledger where user_id = $1 and puzzle_date = $2::date", [P.userId, day[2]]);
    expect(rows).toEqual([{ points: 0 }]);
  });

  // The Me tab reads its day once and passes it to every read (docs/milestones/M14-14b-2c-review-items.md, item 19): as
  // of T-3 the streak counts back from there (T-3, T-5, T-8) and the chart ends there.
  it("reads the stats as of the day it's given, not today", async () => {
    const stats = await readStats(getPool(), P.userId, day[3]);
    expect(stats.streak).toBe(3);
    expect(stats.days).toHaveLength(7);
    expect(stats.days[6]).toEqual({ date: day[3], points: 400 });
  });

  // getMe settles against the day it read (item 19, the 14b-2c-2 review): a run is settled only once its day is
  // before that one. T-2's row is removed, in a rolled-back transaction, so it's waiting to be settled again.
  it("settles only the runs closed by the day it's given", async () => {
    await inRolledBack(async (client) => {
      await client.query("set local session_replication_role = replica");
      await client.query("delete from private.points_ledger where user_id = $1 and puzzle_date = $2::date", [P.userId, day[2]]);
      await client.query("set local session_replication_role = origin");
      const row = async () => (await client.query("select points from private.points_ledger where user_id = $1 and puzzle_date = $2::date", [P.userId, day[2]])).rows;
      await settleRuns(client, day[2]);
      expect(await row()).toEqual([]);
      await settleRuns(client, day[1]);
      expect(await row()).toEqual([{ points: 0 }]);
    });
  });

  it("gives a player who didn't play empty stats, and yesterday's questions with no counts while too few players answered them", async () => {
    useSession(N.session);
    const r = await call();
    expect(r.body.stats).toEqual({ streak: 0, best: null, average: null, days: [6, 5, 4, 3, 2, 1, 0].map((k) => ({ date: day[k], points: null })) });
    expect(r.body.yesterday.state).toBe("clock");
    expect(r.body.yesterday.questions.map((q: { counts: unknown }) => q.counts)).toEqual([null, null, null]);
    // Nothing of today's puzzle.
    expect(JSON.stringify(r.body)).not.toContain(TODAY_MARK);
  });

  it("hides yesterday's answers from a player whose own run that day is still going (human, 2026-10-25)", async () => {
    useSession(Q.session);
    const r = await call();
    expect(r.body.yesterday).toEqual({ date: day[1], state: "in_play" });
    // Yesterday is closed, so the run's row is settled as it stood at midnight, finished or not (ledger.ts).
    const { rows } = await getPool().query("select points from private.points_ledger where user_id = $1 and puzzle_date = $2::date", [Q.userId, day[1]]);
    expect(rows).toHaveLength(1);
    expect(r.body.stats.days[5]).toEqual({ date: day[1], points: rows[0].points });
  });

  // Runs reference their puzzle, so yesterday's goes with them, in a transaction that is rolled back.
  it("says so when yesterday had no puzzle", async () => {
    await inRolledBack(async (client) => {
      await client.query("set local session_replication_role = replica");
      for (const table of ["clock_answer", "clock_finish", "question_open", "points_ledger", "run", "puzzle"]) {
        await client.query(`delete from private.${table} where game_id = $1 and puzzle_date = $2::date`, [GAME_ID, day[1]]);
      }
      await client.query("set local session_replication_role = origin");
      expect(await getYesterday(client, N.userId)).toEqual({ date: day[1], state: "none" });
    });
  });

  // M23 23f-2, answer 68: per question the answers most players gave and the rarest, with
  // how many players gave each, from signed-in players' answers before the day's midnight, shown once at least
  // ANSWER_SHARE_MIN_PLAYERS (5) players gave one on that question. The route returns getYesterday's value as it is. Yesterday's
  // day is swapped for a clock day in a transaction that is rolled back, with six players' answers written directly:
  //   Q1: 6 players: dog 6, cat 4, bear 3, fish 2, and one each of horse, aardvark and horde. Top: dog, cat, bear. Rarest: the
  //       three of 1 player by name (aardvark, horde, horse); fish (2) is in neither.
  //   Q2: 4 players: too few, so no answers.
  //   Q3: 5 players (and a sixth who answered after midnight, who doesn't count): red 5, blue 2, green 1, black 1 after midnight.
  //       Top: red, blue, green; no rarest, as every answer is in the top.
  // Every one of the six also gave "polar bear" today (T), which no part of the answer may hold.
  it("gives a clock day's top and rarest answers per question with their players, none under the minimum, and nothing of today", async () => {
    await inRolledBack(async (client) => {
      const noon = (date: string) => `(('${date}'::date + time '12:00') at time zone 'America/Los_Angeles')`;
      const nextMorning = `(('${day[1]}'::date + 1 + time '00:05') at time zone 'America/Los_Angeles')`;
      await client.query("set local session_replication_role = replica");
      for (const table of ["clock_answer", "clock_finish", "question_open", "points_ledger", "run", "puzzle"]) {
        await client.query(`delete from private.${table} where game_id = $1 and puzzle_date = $2::date`, [GAME_ID, day[1]]);
      }
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [
        GAME_ID,
        day[1],
        fixtureClockDay(day[1], `${day[1]}T00:00:00Z`),
      ]);
      const id = fixtureId;
      const users: string[] = [];
      for (let i = 0; i < 6; i++) {
        const { rows } = await client.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), gen_random_uuid() || '@example.test') returning id");
        users.push(rows[0].id);
        for (const date of [day[1], day[0]]) {
          await client.query(`insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, ${noon(date)})`, [rows[0].id, GAME_ID, date]);
        }
      }
      const give = async (user: number, date: string, q: number, entry: string, at = noon(date)) =>
        client.query(
          `insert into private.clock_answer (user_id, game_id, puzzle_date, question_idx, entry_id, tier, added_ms, points, created_at)
           values ($1, $2, $3::date, $4, $5, 'common', 3000, 10, ${at})`,
          [users[user], GAME_ID, date, q, entry],
        );
      const q0: [string, number][] = [["dog", 6], ["cat", 4], ["bear", 3], ["fish", 2], ["horse", 1], ["aardvark-genus", 1], ["horde", 1]];
      // Each answer is given by its first n players, so player 0 gave all seven and player 5 gave dog alone.
      for (const [slug, n] of q0) for (let u = 0; u < n; u++) await give(u, day[1], 0, id(0, slug));
      for (let u = 0; u < 4; u++) await give(u, day[1], 1, id(1, "apple"));
      for (const [slug, n] of [["red", 5], ["blue", 2], ["green", 1]] as [string, number][]) for (let u = 0; u < n; u++) await give(u, day[1], 2, id(2, slug));
      await give(5, day[1], 2, id(2, "black"), nextMorning);
      for (let u = 0; u < 6; u++) await give(u, day[0], 0, id(0, "polar-bear"));
      await client.query("set local session_replication_role = origin");
      await client.query("set local role plor_app");

      const p = fixtureClockDay(day[1], `${day[1]}T00:00:00Z`);
      const counted = (q: number, slug: string, players: number) => ({ answer: { id: id(q, slug), name: nameOf(id(q, slug)) }, players });
      expect(await getYesterday(client, N.userId)).toEqual({
        date: day[1],
        state: "clock",
        questions: [
          {
            index: 0,
            prompt: p.questions[0].prompt,
            counts: {
              top: [counted(0, "dog", 6), counted(0, "cat", 4), counted(0, "bear", 3)],
              rarest: [counted(0, "aardvark-genus", 1), counted(0, "horde", 1), counted(0, "horse", 1)],
            },
          },
          { index: 1, prompt: p.questions[1].prompt, counts: null },
          { index: 2, prompt: p.questions[2].prompt, counts: { top: [counted(2, "red", 5), counted(2, "blue", 2), counted(2, "green", 1)], rarest: [] } },
        ],
      });
      expect(JSON.stringify(await getYesterday(client, N.userId))).not.toContain(id(0, "polar-bear"));
    });
  });

  // The route connects as postgres locally; as plor_app in production. Its grants must cover all of the above, the
  // settling included (no grant change: the ticket's security change).
  it("works as plor_app", async () => {
    await inRolledBack(async (client) => {
      // T-2's row again unsettled, so plor_app settles it.
      await client.query("set local session_replication_role = replica");
      await client.query("delete from private.points_ledger where user_id = $1 and puzzle_date = $2::date", [P.userId, day[2]]);
      await client.query("set local session_replication_role = origin");
      await client.query("set local role plor_app");
      expect(await getStats(client, P.userId)).toMatchObject({ streak: 5, best: 1000, average: 310 });
      expect((await getYesterday(client, P.userId)).state).toBe("clock");
      const { rows } = await client.query("select points from private.points_ledger where user_id = $1 and puzzle_date = $2::date", [P.userId, day[2]]);
      expect(rows).toEqual([{ points: 0 }]);
    });
  });
});

async function inRolledBack(fn: (client: PoolClient) => Promise<void>): Promise<void> {
  const client = await admin.connect();
  try {
    await client.query("begin");
    await fn(client);
  } finally {
    await client.query("rollback");
    client.release();
  }
}
