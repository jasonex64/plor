// Offbeat's game screen against the local stack (run with `npm run test:db`; docs/milestones/M14-14a-2b-game-screen.md,
// criteria 4 and 5). P has played on five past days, written directly with the answer triggers switched off
// (session_replication_role, as src/game/ledger.db.test.ts does) since their answers need times in the past; Q left
// yesterday's run at a reveal; N never played. T is today. P's days, by hand:
//   T-8  survived all 7 (7 survived), ledger 1000
//   T-5  caught on question 3 (2 survived), ledger 125
//   T-3  time ran out on question 5 (4 survived), ledger 400
//   T-2  caught on question 1 (0 survived), no ledger row: the route settles it, at 0 points (ladder 0, no bonus)
//   T-1  caught on question 2 (1 survived), ledger 25
// So the streak is 5 (T-4, T-6 and T-7 have no puzzle, which neither counts nor breaks it, and P hasn't played today),
// the best 1000, the average (7 + 2 + 4 + 0 + 1) / 5 = 2.8, and the last 7 days, T-6 to T: –, 2, –, 4, 0, 1, –.
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { GAME_ID, type ApprovedPuzzle } from "@/content/puzzle";
import { getStats, getYesterday } from "@/game/offbeat";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, fixture, nameOf, removeCreatedPuzzles, safeEntry } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as offbeatRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, userId: "", session: new Map<string, string>() });
const [P, Q, N] = [player("op"), player("oq"), player("on")];
// The local superuser, which may switch the triggers off; the routes connect as postgres locally (ROADMAP).
const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
// T-k, from private.today().
const day: Record<number, string> = {};
// Today's puzzle carries a marker no other day has, so the route's answer can be searched for it.
const TODAY_MARK = `today-${RUN}`;

async function call() {
  const response = await offbeatRoute(apiRequest("/api/offbeat", { method: "GET" }));
  return { status: response.status, body: await response.json() };
}

// A run on a past day: its answers in order, safe unless caught, each at noon Pacific that day plus a second per
// question; opened is a later question opened (Next tapped) at that day's 1pm, long past its 20 seconds.
type Answer = { entry: string; matched?: boolean };
async function pastRun(client: PoolClient, userId: string, date: string, answers: Answer[], opened?: number) {
  const noon = `(($3::date + time '12:00') at time zone 'America/Los_Angeles')`;
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

// The first n questions answered safely, then (when caught) the host's answer to the next.
function answers(p: ApprovedPuzzle, safe: number, caught: boolean): Answer[] {
  const list: Answer[] = Array.from({ length: safe }, (_, i) => ({ entry: safeEntry(p, i) }));
  if (caught) list.push({ entry: p.questions[safe].host_answers[0], matched: true });
  return list;
}

beforeAll(useLocalStack);

afterAll(async () => {
  // Deleting the auth users cascades to their runs, answers and ledger rows; then the fixture puzzles go.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().query("delete from private.puzzle where game_id = $1 and content ->> 'mark' = $2", [GAME_ID, TODAY_MARK]);
  await removeCreatedPuzzles();
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
    const puzzles: Record<number, ApprovedPuzzle> = {};
    for (const k of [8, 5, 3, 2, 1]) puzzles[k] = await ensurePuzzle(day[k]);
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
      await pastRun(client, P.userId, day[8], answers(puzzles[8], 7, false));
      await ledger(client, P.userId, day[8], 1000);
      await pastRun(client, P.userId, day[5], answers(puzzles[5], 2, true));
      await ledger(client, P.userId, day[5], 125);
      await pastRun(client, P.userId, day[3], answers(puzzles[3], 4, false), 4);
      await ledger(client, P.userId, day[3], 400);
      await pastRun(client, P.userId, day[2], answers(puzzles[2], 0, true));
      await pastRun(client, P.userId, day[1], answers(puzzles[1], 1, true));
      await ledger(client, P.userId, day[1], 25);
      // Q answered yesterday's question 1 and never tapped Next: the run is still in progress.
      await pastRun(client, Q.userId, day[1], answers(puzzles[1], 1, false));
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  });

  it("gives P's streak, best score, average survived and last 7 days, settling the closed day first (criterion 4)", async () => {
    useSession(P.session);
    const r = await call();
    expect(r.status).toBe(200);
    expect(r.body.stats).toEqual({
      streak: 5,
      best: 1000,
      average: 2.8,
      days: [6, 5, 4, 3, 2, 1, 0].map((k, i) => ({ date: day[k], survived: [null, 2, null, 4, 0, 1, null][i] })),
    });
    const { rows } = await getPool().query("select points from private.points_ledger where user_id = $1 and puzzle_date = $2::date", [P.userId, day[2]]);
    expect(rows).toEqual([{ points: 0 }]);
  });

  it("gives yesterday's questions with the Wind's answers, and P's own answer and how it went (criterion 5)", async () => {
    useSession(P.session);
    const r = await call();
    const p = fixture(day[1]);
    expect(r.body.yesterday.date).toBe(day[1]);
    expect(r.body.yesterday.state).toBe("shown");
    expect(r.body.yesterday.questions).toEqual(
      p.questions.map((q, index) => ({
        index,
        prompt: q.prompt,
        hostAnswers: q.host_answers.map((id) => ({ id, name: nameOf(id) })),
        yours:
          index === 0
            ? { answer: { id: safeEntry(p, 0), name: nameOf(safeEntry(p, 0)) }, matched: false }
            : index === 1
              ? { answer: { id: q.host_answers[0], name: nameOf(q.host_answers[0]) }, matched: true }
              : null,
      })),
    );
    // Nothing of today's puzzle.
    expect(JSON.stringify(r.body)).not.toContain(TODAY_MARK);
  });

  it("gives a player who didn't play the Wind's answers alone, and empty stats", async () => {
    useSession(N.session);
    const r = await call();
    expect(r.body.stats).toEqual({ streak: 0, best: null, average: null, days: [6, 5, 4, 3, 2, 1, 0].map((k) => ({ date: day[k], survived: null })) });
    expect(r.body.yesterday.state).toBe("shown");
    expect(r.body.yesterday.questions.map((q: { yours: unknown }) => q.yours)).toEqual(Array(7).fill(null));
    expect(r.body.yesterday.questions[0].hostAnswers.length).toBeGreaterThan(0);
  });

  it("hides yesterday's answers from a player whose own run that day is still going (human, 2026-10-25)", async () => {
    useSession(Q.session);
    const r = await call();
    expect(r.body.yesterday).toEqual({ date: day[1], state: "in_play" });
    // A run not finished isn't counted: yesterday is a dash.
    expect(r.body.stats.days[5]).toEqual({ date: day[1], survived: null });
  });

  // Runs reference their puzzle, so yesterday's goes with them, in a transaction that is rolled back.
  it("says so when yesterday had no puzzle", async () => {
    await inRolledBack(async (client) => {
      await client.query("set local session_replication_role = replica");
      for (const table of ["run_event", "question_open", "points_ledger", "run", "puzzle"]) {
        await client.query(`delete from private.${table} where game_id = $1 and puzzle_date = $2::date`, [GAME_ID, day[1]]);
      }
      await client.query("set local session_replication_role = origin");
      expect(await getYesterday(client, N.userId)).toEqual({ date: day[1], state: "none" });
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
      expect(await getStats(client, P.userId)).toMatchObject({ streak: 5, best: 1000, average: 2.8 });
      expect((await getYesterday(client, P.userId)).state).toBe("shown");
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
