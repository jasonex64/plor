// The Me tab's stats against the local stack (run with `npm run test:db`; docs/milestones/M14-14a-3a-me.md, criteria
// 1-5; docs/milestones/M14-14a-3b-settings.md, criterion 8). Past days are written directly with the answer triggers
// switched off (session_replication_role), as src/app/api/offbeat/route.db.test.ts does, on the fixture's days on a clock. T is
// today. Puzzle days: T-12, T-11, T-10, T-9, T-8, T-5, T-3, T-2, T-1 and T (T-4, T-6 and T-7 have none). By hand:
//   P: runs on T-8 (ledger 1000), T-5 (125), T-3 (400), T-2 (no answer: settled to 0 by the route), T-1 (25) and T, one answer given
//      and still going. Points 1000 + 125 + 400 + 0 + 25 = 1550; 6 days played (a run started on T-8, T-5, T-3, T-2, T-1 and T: 16f-1,
//      "Started counts"); best 1000; average points a day 1550 / 5 = 310 (23f-2, answer 66). Streak and longest streak: T-9 wasn't
//      played, then T-8 to T all were, 6 puzzle days.
//   L: started T-12, T-11, T-10 and T-1 and answered nothing: longest streak 3, streak 1 (T-9 unplayed; T not played yet, so it counts
//      back from T-1).
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { GAME_ID } from "@/platform/game";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { fixtureId } from "@/test/answer-fixture";
import { ensurePuzzle, fixture, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as meRoute } from "./route";
import { localStack } from "../../../../scripts/slot.ts";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, userId: "", session: new Map<string, string>() });
const [P, L, N] = [player("mp"), player("ml"), player("mn")];
const admin = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 1 });
// T-k, from private.today().
const day: Record<number, string> = {};
const TODAY_MARK = `today-${RUN}`;

async function call() {
  const response = await meRoute(apiRequest("/api/me", { method: "GET" }));
  return { status: response.status, body: await response.json() };
}

const noon = `(($3::date + time '12:00') at time zone 'America/Los_Angeles')`;
// A run started at the day's noon, with these animals given at question 1, a second apart, each a common answer for 10 points.
async function pastRun(client: PoolClient, userId: string, date: string, slugs: string[]) {
  await client.query(`insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, ${noon})`, [userId, GAME_ID, date]);
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
  // Deleting the auth users cascades to their profiles, runs, answers and ledger rows; then the fixture puzzles go.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().query("delete from private.puzzle where game_id = $1 and content ->> 'mark' = $2", [GAME_ID, TODAY_MARK]);
  await removeFixtures();
  await getPool().end();
  await admin.end();
});

describe("the Me tab's stats", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in P and L, and writes the days", async () => {
    for (const p of [P, L]) {
      p.session = (await signIn(p.email)).session;
      const r = await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } }));
      expect(r.status).toBe(201);
      const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [p.email]);
      p.userId = rows[0].id;
    }
    const { rows } = await getPool().query<{ k: number; date: string }>("select k, (private.today() - k)::text as date from generate_series(0, 12) k");
    for (const r of rows) day[r.k] = r.date;
    // The days without a puzzle must be free of one: a puzzle there would count in a streak or break it.
    const { rows: taken } = await getPool().query("select puzzle_date::text from private.puzzle where game_id = $1 and puzzle_date = any($2::date[])", [
      GAME_ID,
      [day[4], day[6], day[7]],
    ]);
    expect(taken).toEqual([]);
    for (const k of [12, 11, 10, 9, 8, 5, 3, 2, 1]) await ensurePuzzle(day[k]);
    const today = fixture(day[0]);
    const { rowCount } = await getPool().query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3) on conflict do nothing", [
      GAME_ID,
      day[0],
      { ...today, mark: TODAY_MARK },
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
      await pastRun(client, P.userId, day[0], ["dog"]);
      for (const k of [12, 11, 10, 1]) await pastRun(client, L.userId, day[k], []);
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  });

  it("gives P's header, totals and Offbeat card (criteria 1, 3 and 5)", async () => {
    useSession(P.session);
    const r = await call();
    expect(r.status).toBe(200);
    expect(r.body.me).toMatchObject({
      username: P.username,
      since: day[0],
      totals: { points: 1550, daysPlayed: 6, streak: 6, longestStreak: 6 },
      offbeat: { best: 1000, average: 310 },
    });
    // Answer 66: no "full runs" and no questions survived.
    expect(JSON.stringify(r.body.me)).not.toMatch(/survived|fullRuns|full_runs|rarest/);
  });

  it("gives this month's days with whether a run was started that day, today's unfinished one too (criterion 2; 16f-1)", async () => {
    useSession(P.session);
    const { me } = (await call()).body;
    const played = new Set([day[8], day[5], day[3], day[2], day[1], day[0]]);
    // Each closed day's points, for the calendar's text alternative: today's run has no ledger row yet, so none.
    const points = new Map([
      [day[8], 1000],
      [day[5], 125],
      [day[3], 400],
      [day[2], 0],
      [day[1], 25],
    ]);
    const month = day[0].slice(0, 7);
    const { rows } = await getPool().query<{ d: string }>(
      "select generate_series(date_trunc('month', private.today()), date_trunc('month', private.today()) + interval '1 month - 1 day', interval '1 day')::date::text as d",
    );
    expect(me.month.today).toBe(day[0]);
    expect(me.month.days).toEqual(rows.map((r) => ({ date: r.d, played: played.has(r.d), points: points.get(r.d) ?? null })));
    expect(me.month.days.every((d: { date: string }) => d.date.startsWith(month))).toBe(true);
  });

  it("gives L's longest streak apart from the current one", async () => {
    useSession(L.session);
    const { me } = (await call()).body;
    expect(me.totals).toMatchObject({ streak: 1, longestStreak: 3 });
  });

  // Signed in, but no username picked yet: refused as the other routes refuse it, not a 500.
  it("refuses a player with no profile yet", async () => {
    N.session = (await signIn(N.email)).session;
    useSession(N.session);
    expect(await call()).toEqual({ status: 409, body: { ok: false, error: "no_profile" } });
  });

  it("works as plor_app", async () => {
    const client = await admin.connect();
    try {
      await client.query("begin");
      await client.query("set local role plor_app");
      const { getMe } = await import("@/game/me");
      expect((await getMe(client, P.userId)).totals.points).toBe(1550);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});
