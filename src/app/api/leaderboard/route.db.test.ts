// The friends leaderboard against the local stack (run with `npm run test:db`; docs/milestones/M09-points-and-leaderboard.md,
// 9b; weekly since docs/milestones/M10-groups.md, 10a). Real players sign in; yesterday's runs are written directly
// (yesterday can't be played now) and, answered today, earn no rarity bonus (D8), so each total is its ladder.
// Yesterday falls in this week or, on a Monday, in last week, so those totals are read from yesterday's week. A is the
// viewer; B and E are A's friends; C is no one's friend but F's; D is B's friend but not A's.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as nextRoute } from "@/app/api/run/next/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { type ApprovedPuzzle } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import { weekStart } from "@/friends/leaderboard";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, removeFixtures, safeEntry, typeableName } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as leaderboardRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
type Player = { username: string; userId: string; session: Map<string, string> };
const keys = ["a", "b", "c", "d", "e", "f"] as const;
const players = Object.fromEntries(keys.map((k) => [k, { username: `l${k}${RUN}`, userId: "", session: new Map() }])) as Record<
  (typeof keys)[number],
  Player
>;
let today = "";
let yesterday = "";
let puzzle: ApprovedPuzzle;
let puzzleYesterday: ApprovedPuzzle;
// The week holding yesterday, and the other one.
let yWeek: "thisWeek" | "lastWeek";
let otherWeek: "thisWeek" | "lastWeek";

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const leaderboard = () => call(leaderboardRoute(apiRequest("/api/leaderboard", { method: "GET" })));
type Entry = { username: string; name: string; points: number; you: boolean };
// The standings of yesterday's week.
const standings = async (): Promise<Entry[]> => (await leaderboard()).body[yWeek].entries;
const ledgerRows = async (ids: string[]) =>
  (await getPool().query("select user_id from private.points_ledger where user_id = any($1::uuid[])", [ids])).rows.length;

// Yesterday's run, written directly: safe answers to the first `survived` questions, then caught on the next. Its
// ladder is the sum of POINTS_PER_QUESTION for the safe ones; answered today, it earns no bonus.
async function playedYesterday(p: Player, survived: number) {
  const db = getPool();
  await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [p.userId, GAME_ID, yesterday]);
  for (let i = 0; i <= survived; i++) {
    if (i > 0) {
      await db.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, $4)", [
        p.userId,
        GAME_ID,
        yesterday,
        i,
      ]);
    }
    const caught = i === survived;
    await db.query(
      "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, $4, $5, $6)",
      [p.userId, GAME_ID, yesterday, i, caught ? puzzleYesterday.questions[i].host_answers[0] : safeEntry(puzzleYesterday, i), caught],
    );
  }
}

beforeAll(async () => {
  useLocalStack();
  const { rows } = await getPool().query<{ today: string; yesterday: string }>(
    "select private.today()::text as today, (private.today() - 1)::text as yesterday",
  );
  ({ today, yesterday } = rows[0]);
  yWeek = weekStart(yesterday) === weekStart(today) ? "thisWeek" : "lastWeek";
  otherWeek = yWeek === "thisWeek" ? "lastWeek" : "thisWeek";
  puzzle = await ensurePuzzle(today);
  puzzleYesterday = await ensurePuzzle(yesterday);
});

afterAll(async () => {
  // Deleting the auth users cascades to profiles, friendships, runs and ledger rows; then the fixture puzzles go.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeFixtures();
  await getPool().end();
});

describe("the friends leaderboard", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in six players: A's friends are B and E, B's are A and D, C's is F", async () => {
    for (const key of keys) {
      const p = players[key];
      p.session = (await signIn(`${RUN}-${key}@example.test`)).session;
      expect((await call(createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } })))).status).toBe(201);
      const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${key}@example.test`]);
      p.userId = rows[0].id;
    }
    for (const [x, y] of [
      [players.a, players.b],
      [players.a, players.e],
      [players.b, players.d],
      [players.c, players.f],
    ]) {
      await getPool().query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [
        x.userId,
        y.userId,
      ]);
    }
    // Yesterday: A survives 1 (25), B 2 (75), C 1 (25), E 1 (25); D didn't play.
    await playedYesterday(players.a, 1);
    await playedYesterday(players.b, 2);
    await playedYesterday(players.c, 1);
    await playedYesterday(players.e, 1);
  });

  it("A plays today and survives question 1, which can't count before the day closes (D9)", async () => {
    useSession(players.a.session);
    expect((await call(startRoute(apiRequest("/api/run/start", { method: "POST" })))).status).toBe(200);
    const typed = typeableName(puzzle, 0, safeEntry(puzzle, 0))!;
    expect((await call(answerRoute(apiRequest("/api/run/answer", { method: "POST", body: { index: 0, text: typed } })))).body.run.points).toBe(25);
    expect((await call(nextRoute(apiRequest("/api/run/next", { method: "POST" })))).status).toBe(200);
  });

  it("shows A and A's friends, highest total first and ties by name, settling their closed days first (D3, D4)", async () => {
    useSession(players.a.session);
    expect(await ledgerRows([players.a.userId, players.b.userId, players.e.userId])).toBe(0);
    const r = await leaderboard();
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body[yWeek].entries).toEqual([
      { username: players.b.username, name: players.b.username, points: 75, you: false },
      // A and E tie on 25: by name, and "la…" comes before "le…".
      { username: players.a.username, name: players.a.username, points: 25, you: true },
      { username: players.e.username, name: players.e.username, points: 25, you: false },
    ]);
    // The other week has the same players, all on 0.
    expect(r.body[otherWeek].entries.map((x: Entry) => [x.username, x.points])).toEqual([
      [players.a.username, 0],
      [players.b.username, 0],
      [players.e.username, 0],
    ]);
    // Settled: A's, B's and E's runs from yesterday; C, not shown, isn't; A's run today isn't finished or closed.
    expect(await ledgerRows([players.a.userId, players.b.userId, players.e.userId])).toBe(3);
    expect(await ledgerRows([players.c.userId])).toBe(0);
    // Again: nothing new, the same totals.
    expect(await leaderboard()).toEqual(r);
    expect(await ledgerRows([players.a.userId, players.b.userId, players.e.userId])).toBe(3);
  });

  it("shows each viewer their own friends: B sees A and D, not E; a friend with no points shows 0", async () => {
    useSession(players.b.session);
    expect(await standings()).toEqual([
      { username: players.b.username, name: players.b.username, points: 75, you: true },
      { username: players.a.username, name: players.a.username, points: 25, you: false },
      { username: players.d.username, name: players.d.username, points: 0, you: false },
    ]);
  });

  it("leaves a closed day out of every total while the viewer's own run that day is still going (D5)", async () => {
    // D started yesterday's run, answered question 1 and still waits at its reveal: a run can be finished after
    // midnight (DECISIONS.md, Game 1: Timer). B's yesterday points would tell D how far B got.
    const db = getPool();
    await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [players.d.userId, GAME_ID, yesterday]);
    await db.query(
      "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 0, $4, false)",
      [players.d.userId, GAME_ID, yesterday, safeEntry(puzzleYesterday, 0)],
    );
    useSession(players.d.session);
    expect((await standings()).map((x) => [x.username, x.points])).toEqual([
      [players.b.username, 0],
      [players.d.username, 0],
    ]);
    // Once D is caught on question 2, yesterday counts again, D's run included.
    await db.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, 1)", [
      players.d.userId,
      GAME_ID,
      yesterday,
    ]);
    await db.query(
      "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 1, $4, true)",
      [players.d.userId, GAME_ID, yesterday, puzzleYesterday.questions[1].host_answers[0]],
    );
    expect((await standings()).map((x) => [x.username, x.points])).toEqual([
      [players.b.username, 75],
      [players.d.username, 25],
    ]);
  });

  it("shows and orders by the display name when one is set", async () => {
    await getPool().query("update private.profile set display_name = 'Zed' where user_id = $1", [players.a.userId]);
    useSession(players.a.session);
    // A, now Zed, sorts after E in their tie.
    expect((await standings()).map((x) => [x.name, x.points])).toEqual([
      [players.b.username, 75],
      [players.e.username, 25],
      ["Zed", 25],
    ]);
  });

  it("sums each week from its Monday, with Sunday's points under last week and older weeks left out (W1)", async () => {
    // F's runs and ledger rows are written directly on days around the two weeks, so each total says which days it
    // took: two weeks back's Sunday 1, last Monday 10, last Sunday 100, this Monday 1000.
    const thisMonday = weekStart(today);
    const day = (n: number) => {
      const d = new Date(`${thisMonday}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const db = getPool();
    for (const [date, points] of [
      [day(-8), 1],
      [day(-7), 10],
      [day(-1), 100],
      [day(0), 1000],
    ] as const) {
      await ensurePuzzle(date);
      await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [players.f.userId, GAME_ID, date]);
      await db.query("insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, $2, $3::date, $4, 0)", [
        players.f.userId,
        GAME_ID,
        date,
        points,
      ]);
    }
    useSession(players.c.session);
    const r = (await leaderboard()).body;
    expect(r.thisWeek.from).toBe(thisMonday);
    expect(r.lastWeek.from).toBe(day(-7));
    // C's own 25 from yesterday sits in yesterday's week.
    const c = (week: "thisWeek" | "lastWeek") => (week === yWeek ? 25 : 0);
    expect(r.thisWeek.entries.map((x: Entry) => [x.username, x.points])).toEqual(
      [
        [players.f.username, 1000],
        [players.c.username, c("thisWeek")],
      ].sort((x, y) => (y[1] as number) - (x[1] as number)),
    );
    expect(r.lastWeek.entries.map((x: Entry) => [x.username, x.points])).toEqual(
      [
        [players.f.username, 110],
        [players.c.username, c("lastWeek")],
      ].sort((x, y) => (y[1] as number) - (x[1] as number)),
    );
  });
});
