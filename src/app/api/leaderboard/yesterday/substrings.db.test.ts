// Yesterday's standings for each game against the local stack (`npm run test:db`;
// docs/milestones/M16-16f-the-shared-pieces.md, 16f-6; the human's answer 20): Today's leaderboard card switches between
// Offbeat, Fragments and Overall, so the route names its game. Fragments' yesterday is each player's points that day (the
// human, 2026-11-17, issue #265), and Overall's adds the par scores of the games that have a par for that day, which is
// Fragments' against 1,500 alone while Offbeat has none (M23 23f-2, answer 60), as the weekly boards do
// (src/app/api/leaderboard/substrings.db.test.ts; docs/milestones/M15-15i-par-scores.md).
// Yesterday's runs are written directly, as it can't be played now. A is the viewer and B A's friend; C and D are
// strangers who played too, so they aren't on A's board. C is in A's group only from today.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getPool } from "@/lib/db";
import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as yesterdayRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, userId: "" });
const [A, B, C, D] = ["ya", "yb", "yc", "yd"].map(player);
let yesterday = "";
let before = "";
let club = "";

async function call(path: string) {
  const response = await yesterdayRoute(apiRequest(path, { method: "GET" }));
  return { status: response.status, body: await response.json() };
}
type Entry = { username: string; points: number; you: boolean };
const standings = async (path: string) => (await call(path)).body.day.entries.map((e: Entry) => [e.username, e.points, e.you]);
const fragmentsDay = (date: string) => ({ format: 1, game_id: SUBSTRINGS_ID, date, rounds: ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"], bonus_letter: "j" });

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  const { rows } = await db.query<{ yesterday: string; before: string }>("select (private.today() - 1)::text as yesterday, (private.today() - 2)::text as before");
  ({ yesterday, before } = rows[0]);
  // These Fragments days are this test's own: an existing one fails the insert.
  for (const date of [yesterday, before]) {
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [SUBSTRINGS_ID, date, fragmentsDay(date)]);
  }
  await ensurePuzzle(yesterday);
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = any($2::date[])", [SUBSTRINGS_ID, [yesterday, before]]);
  await removeFixtures();
  await db.end();
});

describe("yesterday's standings for each game", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in four players who all played Fragments yesterday, and A and B played Offbeat", async () => {
    const db = getPool();
    for (const p of [A, B, C, D]) {
      await signIn(p.email);
      await db.query("insert into private.profile (user_id, username) select id, $2 from auth.users where email = $1", [p.email, p.username]);
      p.userId = (await db.query<{ id: string }>("select id from auth.users where email = $1", [p.email])).rows[0].id;
    }
    // Accounts from before yesterday: a friends board lists a player only from the day they signed up (M19 19c).
    await db.query("update private.profile set created_at = now() - interval '14 days' where user_id = any($1::uuid[])", [[A, B, C, D].map((p) => p.userId)]);
    await db.query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [A.userId, B.userId]);
    // Totals by the scoring function: A 20 + 45 = 65; B 50 + 75 = 125; C 95 + 115 + 120 for j = 330; D no word, 0.
    for (const [p, word] of [[A, "abc"], [B, "abcdefg"], [C, "abcdefghij"], [D, null]] as const) {
      await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [p.userId, SUBSTRINGS_ID, yesterday]);
      if (word) await db.query("insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word) values ($1, $2, $3::date, 0, $4, $4)", [p.userId, SUBSTRINGS_ID, yesterday, word]);
    }
    // The day before: B alone played, points there which aren't yesterday's.
    await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [B.userId, SUBSTRINGS_ID, before]);
    await db.query("insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word) values ($1, $2, $3::date, 0, 'abc', 'abc')", [B.userId, SUBSTRINGS_ID, before]);
    // Offbeat yesterday: A 100 and B 200, and nobody else played. Their runs began long ago, so neither is
    // still going (a viewer's own run still going leaves yesterday's points out: M09 D5).
    for (const [p, points] of [[A, 100], [B, 200]] as const) {
      await db.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, now() - interval '2 days')", [p.userId, GAME_ID, yesterday]);
      await db.query("insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, $2, $3::date, $4, 0)", [p.userId, GAME_ID, yesterday, points]);
    }
    // The creator must be a member by the statement's end, so the group and its members go in together.
    club = (
      await db.query<{ id: string }>(
        `with g as (insert into private.player_group (name, creator_id, invite_code) values ('Club', $1, $3) returning id),
              m as (insert into private.group_member (group_id, user_id, joined_at)
                    select g.id, $1, now() - interval '15 days' from g union all select g.id, $2, now() from g)
         select id from g`,
        [A.userId, C.userId, RUN.padEnd(10, "x").slice(0, 10)],
      )
    ).rows[0].id;
    useSession((await signIn(A.email)).session);
  });

  it("refuses a request that doesn't name a game, or names another", async () => {
    for (const path of ["/api/leaderboard/yesterday", "/api/leaderboard/yesterday?game=chess"]) {
      expect(await call(path)).toEqual({ status: 400, body: { ok: false, error: "unknown_game" } });
    }
  });

  it("gives Fragments' yesterday as each player's points that day", async () => {
    const { status, body } = await call("/api/leaderboard/yesterday?game=substrings");
    expect(status).toBe(200);
    expect(body.day.date).toBe(yesterday);
    // Nothing in a row but who and their points: B's 125 and A's 65.
    for (const e of body.day.entries) expect(Object.keys(e).sort()).toEqual(["name", "points", "username", "you"]);
    expect(await standings("/api/leaderboard/yesterday?game=substrings")).toEqual([
      [B.username, 125, false],
      [A.username, 65, true],
    ]);
    // Settling took the whole day, strangers too.
    const { rows } = await getPool().query("select user_id from private.points_ledger where game_id = $1 and puzzle_date = $2::date and user_id = any($3::uuid[])", [SUBSTRINGS_ID, yesterday, [C.userId, D.userId]]);
    expect(rows).toHaveLength(2);
  });

  it("counts a group member's points from the day they joined, so C's yesterday is 0", async () => {
    expect(await standings(`/api/leaderboard/yesterday?game=substrings&group=${club}`)).toEqual([
      [A.username, 65, true],
      [C.username, 0, false],
    ]);
  });

  it("keeps Offbeat's yesterday to Offbeat's points", async () => {
    expect(await standings("/api/leaderboard/yesterday?game=offbeat")).toEqual([
      [B.username, 200, false],
      [A.username, 100, true],
    ]);
  });

  it("counts only Fragments' par score for yesterday on the overall board, Offbeat having no par", async () => {
    // Fragments: B 8.3, A 4.3. Offbeat's points are written all the same, and add nothing.
    expect(await standings("/api/leaderboard/yesterday?game=overall")).toEqual([
      [B.username, 8.3, false],
      [A.username, 4.3, true],
    ]);
  });
});
