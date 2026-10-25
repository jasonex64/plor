// The Me tab's stats against the local stack (run with `npm run test:db`; docs/milestones/M14-14a-3a-me.md, criteria
// 1-5; docs/milestones/M14-14a-3b-settings.md, criterion 8). Past days are written directly with the answer triggers switched off (session_replication_role), as
// src/app/api/offbeat/route.db.test.ts does. T is today. Puzzle days: T-12, T-11, T-10, T-9, T-8, T-5, T-3, T-2, T-1
// and T (T-4, T-6 and T-7 have none). By hand:
//   P: T-8 survived all 7 (ledger 1000); T-5 caught on question 3 (2 survived, 125); T-3 time ran out on question 5
//      (4, 400); T-2 caught on question 1 (0, settled to 0 by the route); T-1 caught on question 2 (1, 25); T one safe
//      answer, waiting at the reveal (in progress). Points 1000 + 125 + 400 + 0 + 25 = 1550; 5 days played (finished
//      runs); 1 full climb; best 1000; average (7 + 2 + 4 + 0 + 1) / 5 = 2.8. Streak and longest streak: T-9 wasn't
//      played, then T-8 to T all were, 6 puzzle days.
//   L: started T-12, T-11, T-10 and T-1 and answered nothing (each timed out): longest streak 3, streak 1 (T-9
//      unplayed; T not played yet, so it counts back from T-1).
//   O1-O5: answered question 1 only, on some of P's days, so P's answers there have shares:
//      T-5: P's answer, O1-O4 another: 1 of 5 → 0.2
//      T-3: P's answer and O1, O2 the same, O3-O5 another: 3 of 6 → 0.5
//      T-2: P's catch (the host's answer), O1-O4 the same: 5 of 5 → 1, and caught, so left out
//      T-1: O1-O5 also answered questions 1 and 2. Question 1: P's answer and theirs the same, 6 of 6 → 1. Question 2:
//           P's catch, theirs another: 1 of 6 → 0.17, the rarest, but caught, so left out (human, 2026-10-25: "Leave
//           caught out (Recommended)")
//      T-8: only P and O1 answered: under ANSWER_SHARE_MIN_PLAYERS, left out
//      T:   P's answer, O1-O4 another: 0.2 and the latest day, so first if today weren't left out
//   P's rarest answers: T-5's (0.2), T-3's (0.5), T-1's question 1 (1).
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { GAME_ID, type ApprovedPuzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, fixture, nameOf, removeCreatedPuzzles, safeEntries, safeEntry } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as meRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, userId: "", session: new Map<string, string>() });
const [P, L, N] = [player("mp"), player("ml"), player("mn")];
const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
// T-k, from private.today().
const day: Record<number, string> = {};
const TODAY_MARK = `today-${RUN}`;
const puzzles: Record<number, ApprovedPuzzle> = {};

async function call() {
  const response = await meRoute(apiRequest("/api/me", { method: "GET" }));
  return { status: response.status, body: await response.json() };
}

const noon = `(($3::date + time '12:00') at time zone 'America/Los_Angeles')`;
type Answer = { entry: string; matched?: boolean };
async function pastRun(client: PoolClient, userId: string, date: string, answers: Answer[], opened?: number) {
  await client.query(`insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, ${noon})`, [userId, GAME_ID, date]);
  for (const [i, a] of answers.entries()) {
    await client.query(
      `insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched, created_at)
       values ($1, $2, $3::date, $4::int, $5, $6, ${noon} + $4::int * interval '1 second')`,
      [userId, GAME_ID, date, i, a.entry, a.matched ?? false],
    );
  }
  if (opened !== undefined) {
    await client.query(
      `insert into private.question_open (user_id, game_id, puzzle_date, question_idx, opened_at) values ($1, $2, $3::date, $4, ${noon} + interval '1 hour')`,
      [userId, GAME_ID, date, opened],
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

function answers(p: ApprovedPuzzle, safe: number, caught: boolean): Answer[] {
  const list: Answer[] = Array.from({ length: safe }, (_, i) => ({ entry: safeEntry(p, i) }));
  if (caught) list.push({ entry: p.questions[safe].host_answers[0], matched: true });
  return list;
}

beforeAll(useLocalStack);

afterAll(async () => {
  // Deleting the auth users cascades to their profiles, runs, answers and ledger rows; then the fixture puzzles go.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().query("delete from private.puzzle where game_id = $1 and content ->> 'mark' = $2", [GAME_ID, TODAY_MARK]);
  await removeCreatedPuzzles();
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
    for (const k of [12, 11, 10, 9, 8, 5, 3, 2, 1]) puzzles[k] = await ensurePuzzle(day[k]);
    const today = fixture(day[0]);
    puzzles[0] = today;
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
      const others: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const { rows: made } = await client.query<{ id: string }>(
          "insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id",
          [`${RUN}-o${i}@example.test`],
        );
        others.push(made[0].id);
      }
      const [o1, o2, o3, o4, o5] = others;
      await pastRun(client, P.userId, day[8], answers(puzzles[8], 7, false));
      await ledger(client, P.userId, day[8], 1000);
      await pastRun(client, P.userId, day[5], answers(puzzles[5], 2, true));
      await ledger(client, P.userId, day[5], 125);
      await pastRun(client, P.userId, day[3], answers(puzzles[3], 4, false), 4);
      await ledger(client, P.userId, day[3], 400);
      await pastRun(client, P.userId, day[2], answers(puzzles[2], 0, true));
      await pastRun(client, P.userId, day[1], answers(puzzles[1], 1, true));
      await ledger(client, P.userId, day[1], 25);
      await pastRun(client, P.userId, day[0], answers(puzzles[0], 1, false));
      for (const k of [12, 11, 10, 1]) await pastRun(client, L.userId, day[k], []);

      const [mine, other] = safeEntries(puzzles[5], 0);
      for (const o of [o1, o2, o3, o4]) await pastRun(client, o, day[5], [{ entry: other }]);
      for (const o of [o1, o2]) await pastRun(client, o, day[3], [{ entry: mine }]);
      for (const o of [o3, o4, o5]) await pastRun(client, o, day[3], [{ entry: other }]);
      for (const o of [o1, o2, o3, o4]) await pastRun(client, o, day[2], [{ entry: puzzles[2].questions[0].host_answers[0], matched: true }]);
      await pastRun(client, o1, day[8], [{ entry: other }]);
      for (const o of others) await pastRun(client, o, day[1], [{ entry: safeEntry(puzzles[1], 0) }, { entry: safeEntry(puzzles[1], 1) }]);
      for (const o of [o1, o2, o3, o4]) await pastRun(client, o, day[0], [{ entry: other }]);
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
      totals: { points: 1550, daysPlayed: 5, streak: 6, longestStreak: 6 },
      offbeat: { best: 1000, average: 2.8, fullClimbs: 1 },
    });
  });

  it("gives this month's days with the questions survived on finished runs, today's unfinished one as none (criterion 2)", async () => {
    useSession(P.session);
    const { me } = (await call()).body;
    const survived = new Map([
      [day[8], 7],
      [day[5], 2],
      [day[3], 4],
      [day[2], 0],
      [day[1], 1],
    ]);
    const month = day[0].slice(0, 7);
    const { rows } = await getPool().query<{ d: string }>(
      "select generate_series(date_trunc('month', private.today()), date_trunc('month', private.today()) + interval '1 month - 1 day', interval '1 day')::date::text as d",
    );
    expect(me.month.today).toBe(day[0]);
    expect(me.month.days).toEqual(rows.map((r) => ({ date: r.d, survived: survived.get(r.d) ?? null })));
    expect(me.month.days.every((d: { date: string }) => d.date.startsWith(month))).toBe(true);
  });

  it("gives P's 3 rarest answers that survived, from closed days with enough players, lowest share first (criterion 4)", async () => {
    useSession(P.session);
    const { me } = (await call()).body;
    const [p5, p3, p1] = [puzzles[5], puzzles[3], puzzles[1]];
    const answer = (id: string) => ({ id, name: nameOf(id) });
    expect(me.rarest).toEqual([
      { answer: answer(safeEntry(p5, 0)), prompt: p5.questions[0].prompt, date: day[5], share: 0.2 },
      { answer: answer(safeEntry(p3, 0)), prompt: p3.questions[0].prompt, date: day[3], share: 0.5 },
      { answer: answer(safeEntry(p1, 0)), prompt: p1.questions[0].prompt, date: day[1], share: 1 },
    ]);
  });

  it("gives L's longest streak apart from the current one, and no rarest answers", async () => {
    useSession(L.session);
    const { me } = (await call()).body;
    expect(me.totals).toMatchObject({ streak: 1, longestStreak: 3 });
    expect(me.rarest).toEqual([]);
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
