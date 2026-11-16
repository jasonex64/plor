// The overall board against the local stack (`npm run test:db`; docs/milestones/M16-16e-points-and-boards.md, 16e-3b,
// answers 2, 29 to 33 and 38; docs/milestones/M15-15i-par-scores.md): each day's par score in each game, the day's
// points against the game's par out of 100, added up (Sum) and averaged over the game-days played (Average). Three
// closed days of last week are this test's own in both games; the runs and their ledger rows are written directly, as
// those days can't be played now.
//
// A is the viewer; B and C are A's friends, C playing game 1 alone; S is a stranger; G is in A's group from Tuesday.
// Par scores by hand, points ÷ par × 100, game 1's par 1,250 and game 2's 1,500:
// - Monday, game 1: C 1300, A 1000, S 750, B 500: C 100 (over the par), A 80, S 60, B 40.
// - Monday, game 2: G 1200, B 900, S 600, A 300: G 80, B 60, S 40, A 20.
// - Tuesday, game 1: B 1000, G 625, A 250: B 80, G 50, A 20.
// - Tuesday, game 2: A 1410, G 1350, B 150: A 94, G 90, close as their points are, B 10.
// - Wednesday, in the last test: game 1, B 10 and A's run still going, settled at 0; game 2, B 50 alone, 3.3, not 100.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { weekStart } from "@/friends/leaderboard";
import { getPool } from "@/lib/db";
import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import { fixtureDay } from "@/test/answer-fixture";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { GET as groupBoard } from "../groups/leaderboard/route";
import { GET as friendsBoard } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, userId: "" });
const [A, B, C, S, G] = ["oa", "ob", "oc", "os", "og"].map(player);
let monday = "";
let tuesday = "";
let wednesday = "";
let club = "";

async function call(route: (r: Request) => Promise<Response>, path: string) {
  const response = await route(apiRequest(path, { method: "GET" }));
  return { status: response.status, body: await response.json() };
}
type Entry = { username: string; points: number; average: number };
const lastWeek = (body: { lastWeek: { entries: Entry[] } }) => body.lastWeek.entries.map((e) => [e.username, e.points, e.average]);
const noon = (date: string) => `${date} 12:00:00 America/Los_Angeles`;

// A run of that game on that day and its ledger row, as settling would have written it. It started at the day's noon,
// so a game 1 run's first question has long run out of time: a run started now would still be going, and would hide
// its day from its player (answer 32).
async function scored(p: { userId: string }, game: string, date: string, points: number) {
  const db = getPool();
  await db.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, $4::timestamptz)", [
    p.userId,
    game,
    date,
    noon(date),
  ]);
  await db.query("insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, $2, $3::date, $4, 0)", [
    p.userId,
    game,
    date,
    points,
  ]);
}

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  const { rows } = await db.query<{ today: string }>("select private.today()::text as today");
  const lastMonday = new Date(`${weekStart(rows[0].today)}T00:00:00Z`);
  lastMonday.setUTCDate(lastMonday.getUTCDate() - 7);
  monday = lastMonday.toISOString().slice(0, 10);
  lastMonday.setUTCDate(lastMonday.getUTCDate() + 1);
  tuesday = lastMonday.toISOString().slice(0, 10);
  lastMonday.setUTCDate(lastMonday.getUTCDate() + 1);
  wednesday = lastMonday.toISOString().slice(0, 10);
  // The days are this test's own: an existing day fails the insert.
  for (const date of [monday, tuesday, wednesday]) {
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, date, fixtureDay(date, `${date}T00:00:00Z`)]);
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [
      SUBSTRINGS_ID,
      date,
      { format: 1, game_id: SUBSTRINGS_ID, date, rounds: ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"], bonus_letter: "j" },
    ]);
  }
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.query("delete from private.puzzle where game_id = any($1) and puzzle_date = any($2::date[])", [[GAME_ID, SUBSTRINGS_ID], [monday, tuesday, wednesday]]);
  await db.end();
});

describe("the overall board", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in five players and writes last Monday's and Tuesday's runs in both games", async () => {
    const db = getPool();
    for (const p of [A, B, C, S, G]) {
      await signIn(p.email);
      // Signed up before last week: a friends board lists only players whose account was made by the week's end (M19 19c).
      await db.query(
        "insert into private.profile (user_id, username, created_at) select id, $2, now() - interval '14 days' from auth.users where email = $1",
        [p.email, p.username],
      );
      p.userId = (await db.query<{ id: string }>("select id from auth.users where email = $1", [p.email])).rows[0].id;
    }
    for (const friend of [B, C]) {
      await db.query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [A.userId, friend.userId]);
    }
    for (const [p, points] of [[C, 1300], [A, 1000], [S, 750], [B, 500]] as const) await scored(p, GAME_ID, monday, points);
    for (const [p, points] of [[G, 1200], [B, 900], [S, 600], [A, 300]] as const) await scored(p, SUBSTRINGS_ID, monday, points);
    for (const [p, points] of [[B, 1000], [G, 625], [A, 250]] as const) await scored(p, GAME_ID, tuesday, points);
    for (const [p, points] of [[A, 1410], [G, 1350], [B, 150]] as const) await scored(p, SUBSTRINGS_ID, tuesday, points);
    // G joins A's group at Tuesday's noon. The creator must be a member by the statement's end, so the group and its
    // members go in together.
    club = (
      await db.query<{ id: string }>(
        `with g as (insert into private.player_group (name, creator_id, invite_code) values ('Club', $1, $3) returning id),
              m as (insert into private.group_member (group_id, user_id, joined_at)
                    select g.id, $1, now() - interval '30 days' from g union all select g.id, $2, $4::timestamptz from g)
         select id from g`,
        [A.userId, G.userId, RUN.padEnd(10, "y").slice(0, 10), noon(tuesday)],
      )
    ).rows[0].id;
    useSession((await signIn(A.email)).session);
  });

  it("adds up each player's par scores in both games, and averages them over the game-days played", async () => {
    const r = await call(friendsBoard, "/api/leaderboard?game=overall");
    expect(r.status).toBe(200);
    // Nothing but who, the Sum and the Average: no score of anyone's, no days.
    expect(Object.keys(r.body).sort()).toEqual(["lastWeek", "ok", "thisWeek"]);
    expect(Object.keys(r.body.lastWeek).sort()).toEqual(["entries", "from"]);
    for (const e of r.body.lastWeek.entries) expect(Object.keys(e).sort()).toEqual(["average", "name", "points", "username", "you"]);
    // Ranked by Sum. A: 80 + 20 + 20 + 94 = 214 over 4 game-days, 53.5. B: 40 + 60 + 80 + 10 = 190 over 4, 47.5.
    // C played game 1 on Monday alone: 100 over 1, 100. S, a stranger, isn't on A's board.
    expect(lastWeek(r.body)).toEqual([
      [A.username, 214, 53.5],
      [B.username, 190, 47.5],
      [C.username, 100, 100],
    ]);
    expect(r.body.lastWeek.from).toBe(monday);
    // This week has nothing yet from these players.
    expect(r.body.thisWeek.entries.map((e: Entry) => [e.points, e.average])).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
  });

  it("counts a group member's par scores in both games from the day they joined", async () => {
    // G's Monday, 80 in game 2, came before G joined: Tuesday's 50 + 90 = 140 over 2 game-days, 70.
    expect(lastWeek((await call(groupBoard, `/api/groups/leaderboard?id=${club}&game=overall`)).body)).toEqual([
      [A.username, 214, 53.5],
      [G.username, 140, 70],
    ]);
  });

  it("leaves out every game 1 score of a day the viewer is still playing, and keeps game 2's", async () => {
    // Wednesday: B played both games. A started Wednesday's game 1 just now, as if resumed: its first question's 20
    // seconds have only begun, so it's still going.
    await scored(B, GAME_ID, wednesday, 10);
    await scored(B, SUBSTRINGS_ID, wednesday, 50);
    await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [A.userId, GAME_ID, wednesday]);
    // The read settles A's run at 0 (answer 38); B's game 1 score, 0.8, is left out, like A's own 0. B's game 2 score
    // counts, 3.3 for a day played alone: 190 + 3.3 = 193.3 over 5 game-days, 38.7. Counting game 1 too would give B
    // 194.1 over 6 and A 214 over 5, 42.8.
    expect(lastWeek((await call(friendsBoard, "/api/leaderboard?game=overall")).body)).toEqual([
      [A.username, 214, 53.5],
      [B.username, 193.3, 38.7],
      [C.username, 100, 100],
    ]);
    const { rows } = await getPool().query("select points from private.points_ledger where user_id = $1 and game_id = $2 and puzzle_date = $3::date", [
      A.userId,
      GAME_ID,
      wednesday,
    ]);
    expect(rows).toEqual([{ points: 0 }]);
  });
});
