// The friends leaderboard against the local stack (run with `npm run test:db`; docs/milestones/M09-points-and-leaderboard.md,
// 9b; weekly since docs/milestones/M10-groups.md, 10a). Real players sign in; yesterday's runs are written directly
// (yesterday can't be played now), answered at its noon, as an answer after its midnight counts nothing (M16 16e-3a). The days
// are the fixture's day on a clock, which scores each answer by its tier (docs/milestones/M23-23c-the-run-on-a-clock.md): an uncommon
// answer 25 points, a rare one 50.
// Yesterday falls in this week or, on a Monday, in last week, so those totals are read from yesterday's week. A is the
// viewer; B and E are A's friends; C is no one's friend but F's; D is B's friend but not A's.
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { GAME_ID } from "@/platform/game";
import { weekStart } from "@/friends/leaderboard";
import { getPool } from "@/lib/db";
import { writeClockRun, type ClockGiven } from "@/test/clock-runs";
import { answerTodaysRun, startTodaysRun } from "@/test/clock-routes";
import { fixtureId } from "@/test/answer-fixture";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as leaderboardRoute } from "./route";
import { localStack } from "../../../../scripts/slot.ts";

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
const admin = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 1 });
// The week holding yesterday, and the other one.
let yWeek: "thisWeek" | "lastWeek";
let otherWeek: "thisWeek" | "lastWeek";

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const leaderboard = () => call(leaderboardRoute(apiRequest("/api/leaderboard?game=offbeat", { method: "GET" })));
type Entry = { username: string; name: string; points: number; you: boolean; daily: number[] };
// The standings of yesterday's week.
const standings = async (): Promise<Entry[]> => (await leaderboard()).body[yWeek].entries;
// Each week's days run Monday to Sunday (14b-14, docs/milestones/M14-14b-14-leaderboard-graph.md): a date's place in
// its week, the days of a week that are over (all of last week's, this week's before today), and a player's points on
// each of them, here only yesterday's.
const dayIndex = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
const over = (week: "thisWeek" | "lastWeek") => (week === "lastWeek" ? 7 : dayIndex(today));
const daily = (week: "thisWeek" | "lastWeek", yesterdays: number) =>
  Array.from({ length: over(week) }, (_, i) => (week === yWeek && i === dayIndex(yesterday) ? yesterdays : 0));
const ledgerRows = async (ids: string[]) =>
  (await getPool().query("select user_id from private.points_ledger where user_id = any($1::uuid[])", [ids])).rows.length;

// An uncommon answer of the fixture's animals (25 points) and a rare one (50), given at yesterday's noon.
const UNCOMMON: ClockGiven = { question: 0, entry: fixtureId(0, "cat"), tier: "uncommon", points: 25, when: "noon" };
const RARE: ClockGiven = { question: 0, entry: fixtureId(0, "horde"), tier: "rare", points: 50, when: "noon" };
// Yesterday's run, written directly.
const playedYesterday = (p: Player, answers: ClockGiven[]) => writeClockRun(admin, p.userId, yesterday, answers);

beforeAll(async () => {
  useLocalStack();
  const { rows } = await getPool().query<{ today: string; yesterday: string }>(
    "select private.today()::text as today, (private.today() - 1)::text as yesterday",
  );
  ({ today, yesterday } = rows[0]);
  yWeek = weekStart(yesterday) === weekStart(today) ? "thisWeek" : "lastWeek";
  otherWeek = yWeek === "thisWeek" ? "lastWeek" : "thisWeek";
  await ensurePuzzle(today);
  await ensurePuzzle(yesterday);
});

afterAll(async () => {
  // Deleting the auth users cascades to profiles, friendships, runs and ledger rows; then the fixture puzzles go.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeFixtures();
  await getPool().end();
  await admin.end();
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
    // Accounts from before last week: a friends board lists a player only from the week they signed up (M19 19c).
    await getPool().query("update private.profile set created_at = now() - interval '14 days' where user_id = any($1::uuid[])", [
      keys.map((k) => players[k].userId),
    ]);
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
    // Yesterday: A gives an uncommon answer (25), B that and a rare one (75), C and E an uncommon one (25); D didn't play.
    await playedYesterday(players.a, [UNCOMMON]);
    await playedYesterday(players.b, [UNCOMMON, RARE]);
    await playedYesterday(players.c, [UNCOMMON]);
    await playedYesterday(players.e, [UNCOMMON]);
  });

  it("A plays today and gives an uncommon answer, which can't count before the day closes (D9)", async () => {
    useSession(players.a.session);
    expect((await startTodaysRun()).status).toBe(200);
    expect((await answerTodaysRun(0, "cat")).body.run.points).toBe(25);
  });

  it("shows A and A's friends, highest total first and ties by name, settling their closed days first (D3, D4)", async () => {
    useSession(players.a.session);
    expect(await ledgerRows([players.a.userId, players.b.userId, players.e.userId])).toBe(0);
    const r = await leaderboard();
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    const [b, a, e] = [75, 25, 25];
    expect(r.body[yWeek].entries).toEqual([
      { username: players.b.username, name: players.b.username, points: b, you: false, daily: daily(yWeek, b) },
      // A and E tie, with the same answers: by name, and "la…" comes before "le…".
      { username: players.a.username, name: players.a.username, points: a, you: true, daily: daily(yWeek, a) },
      { username: players.e.username, name: players.e.username, points: e, you: false, daily: daily(yWeek, e) },
    ]);
    // How many of each week's days are over, and none that A is still playing.
    expect([r.body.thisWeek.days, r.body.lastWeek.days]).toEqual([over("thisWeek"), 7]);
    expect([r.body.thisWeek.hidden, r.body.lastWeek.hidden]).toEqual([[], []]);
    // The other week has the same players, all on 0.
    expect(r.body[otherWeek].entries.map((x: Entry) => [x.username, x.points])).toEqual([
      [players.a.username, 0],
      [players.b.username, 0],
      [players.e.username, 0],
    ]);
    expect(r.body[otherWeek].entries.map((x: Entry) => x.daily)).toEqual([0, 1, 2].map(() => daily(otherWeek, 0)));
    // Settled: A's, B's and E's runs from yesterday, and C's too, though not shown, as a day's place needs every player
    // (M16 16e-3b, answer 27); A's run today isn't finished or closed.
    expect(await ledgerRows([players.a.userId, players.b.userId, players.e.userId])).toBe(3);
    expect(await ledgerRows([players.c.userId])).toBe(1);
    // Again: nothing new, the same totals.
    expect(await leaderboard()).toEqual(r);
    expect(await ledgerRows([players.a.userId, players.b.userId, players.e.userId])).toBe(3);
  });

  it("shows each viewer their own friends: B sees A and D, not E; a friend with no points shows 0", async () => {
    useSession(players.b.session);
    const [b, a] = [75, 25];
    expect(await standings()).toEqual([
      { username: players.b.username, name: players.b.username, points: b, you: true, daily: daily(yWeek, b) },
      { username: players.a.username, name: players.a.username, points: a, you: false, daily: daily(yWeek, a) },
      { username: players.d.username, name: players.d.username, points: 0, you: false, daily: daily(yWeek, 0) },
    ]);
  });

  it("leaves a closed day out of every total while the viewer's own run that day is still going (D5)", async () => {
    // D started yesterday's run and gave an answer, and its clock is still running: a run can be finished after midnight
    // (DECISIONS.md, Game 1: Timer). B's yesterday points would tell D how far B got. The run starts an hour from now, so its
    // clock outlasts the test.
    await writeClockRun(admin, players.d.userId, yesterday, [UNCOMMON], { startedAt: "statement_timestamp() + interval '1 hour'" });
    useSession(players.d.session);
    expect((await standings()).map((x) => [x.username, x.points])).toEqual([
      [players.b.username, 0],
      [players.d.username, 0],
    ]);
    // Yesterday is marked as the one D is still playing, and it adds nothing to anyone's days (14b-14, answer 28).
    const hiding = (await leaderboard()).body[yWeek];
    expect(hiding.hidden).toEqual([dayIndex(yesterday)]);
    expect(hiding.entries.map((x: Entry) => x.daily)).toEqual([daily(yWeek, 0), daily(yWeek, 0)]);
    // D gives a rare answer now, after yesterday's midnight, and Finishes: once D's run is over, yesterday counts again, D's run
    // with what it scored by that midnight, the uncommon answer's 25 and not the rare one's 50 (M16 16e-3a, answer 35).
    const client = await admin.connect();
    try {
      await client.query("begin");
      await client.query("set local session_replication_role = replica");
      await client.query(
        `insert into private.clock_answer (user_id, game_id, puzzle_date, question_idx, entry_id, tier, added_ms, points, created_at)
         values ($1, $2, $3::date, 0, $4, 'rare', 1000, 50, statement_timestamp())`,
        [players.d.userId, GAME_ID, yesterday, RARE.entry],
      );
      await client.query("insert into private.clock_finish (user_id, game_id, puzzle_date, finished_at) values ($1, $2, $3::date, statement_timestamp())", [
        players.d.userId,
        GAME_ID,
        yesterday,
      ]);
      await client.query("commit");
    } finally {
      client.release();
    }
    const standing = await standings();
    const [b, d] = [75, 25];
    expect(standing.map((x) => [x.username, x.points, x.daily])).toEqual([
      [players.b.username, b, daily(yWeek, b)],
      [players.d.username, d, daily(yWeek, d)],
    ]);
    expect((await leaderboard()).body[yWeek].hidden).toEqual([]);
  });

  it("shows and orders by the display name when one is set", async () => {
    await getPool().query("update private.profile set display_name = 'Zed' where user_id = $1", [players.a.userId]);
    useSession(players.a.session);
    // A, now Zed, sorts after E in their tie.
    const [b, e, a] = [75, 25, 25];
    expect((await standings()).map((x) => [x.name, x.points])).toEqual([
      [players.b.username, b],
      [players.e.username, e],
      ["Zed", a],
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
    // F's days: last Monday 10 and last Sunday 100, and this Monday 1000 once it's over.
    const f = (week: "thisWeek" | "lastWeek") => r[week].entries.find((x: Entry) => x.username === players.f.username).daily;
    expect(f("lastWeek")).toEqual([10, 0, 0, 0, 0, 0, 100]);
    expect(f("thisWeek")).toEqual(Array.from({ length: over("thisWeek") }, (_, i) => (i === 0 ? 1000 : 0)));
  });

  // M19 19c: F signs up today, after last week ended: last week's board leaves F out, this week's lists F.
  it("leaves a player who signed up this week off last week's board, and keeps them on this week's", async () => {
    await getPool().query("update private.profile set created_at = now() where user_id = $1", [players.f.userId]);
    useSession(players.c.session);
    const r = (await leaderboard()).body;
    expect(r.lastWeek.entries.map((x: Entry) => x.username)).toEqual([players.c.username]);
    expect(r.thisWeek.entries.map((x: Entry) => x.username).sort()).toEqual([players.c.username, players.f.username].sort());
    // F's own board has no last week to show F on either.
    useSession(players.f.session);
    expect((await leaderboard()).body.lastWeek.entries.map((x: Entry) => x.username)).toEqual([players.c.username]);
  });
});
