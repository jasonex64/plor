// Game 2's weekly boards against the local stack (`npm run test:db`; docs/milestones/M16-16e-points-and-boards.md,
// 16e-2): a board names its game, and game 2's adds up each day's place among every player that day. Yesterday's runs
// are written directly, as yesterday can't be played now, and the board's read settles them. A is the viewer and B A's
// friend; C and D are strangers who played too, so they count in the places but aren't on A's board. C is in A's group
// only from today.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { weekStart } from "@/friends/leaderboard";
import { getPool } from "@/lib/db";
import { SUBSTRINGS_ID } from "@/platform/game";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { GET as groupBoard } from "../groups/leaderboard/route";
import { GET as friendsBoard } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, userId: "" });
const [A, B, C, D] = ["ga", "gb", "gc", "gd"].map(player);
let yesterday = "";
let week: "thisWeek" | "lastWeek" = "thisWeek";
let club = "";

async function call(route: (r: Request) => Promise<Response>, path: string) {
  const response = await route(apiRequest(path, { method: "GET" }));
  return { status: response.status, body: await response.json() };
}
type Entry = { username: string; points: number; daily: number[] };
const standings = (body: Record<string, { entries: Entry[] }>) => body[week].entries.map((e) => [e.username, e.points]);

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  const { rows } = await db.query<{ today: string; yesterday: string }>("select private.today()::text as today, (private.today() - 1)::text as yesterday");
  yesterday = rows[0].yesterday;
  week = weekStart(yesterday) === weekStart(rows[0].today) ? "thisWeek" : "lastWeek";
  // A place counts the whole day, so the day must be this test's own: an existing day fails the insert.
  await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [SUBSTRINGS_ID, yesterday, { format: 1, game_id: SUBSTRINGS_ID, date: yesterday, rounds: ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"], bonus_letter: "j" }]);
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [SUBSTRINGS_ID, yesterday]);
  await db.end();
});

describe("game 2's boards", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in four players who all played yesterday", async () => {
    const db = getPool();
    for (const p of [A, B, C, D]) {
      await signIn(p.email);
      await db.query("insert into private.profile (user_id, username) select id, $2 from auth.users where email = $1 ", [p.email, p.username]);
      p.userId = (await db.query<{ id: string }>("select id from auth.users where email = $1", [p.email])).rows[0].id;
    }
    await db.query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [A.userId, B.userId]);
    // Totals by the scoring function: A 20 + 45 = 65; B 50 + 75 = 125; C 95 + 115 + 120 for j = 330; D no word, 0.
    for (const [p, word] of [[A, "abc"], [B, "abcdefg"], [C, "abcdefghij"], [D, null]] as const) {
      await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [p.userId, SUBSTRINGS_ID, yesterday]);
      if (word) await db.query("insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word) values ($1, $2, $3::date, 0, $4, $4)", [p.userId, SUBSTRINGS_ID, yesterday, word]);
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

  it("refuses a board that doesn't name its game", async () => {
    for (const path of ["/api/leaderboard", "/api/leaderboard?game=chess"]) expect(await call(friendsBoard, path)).toEqual({ status: 400, body: { ok: false, error: "unknown_game" } });
    expect((await call(groupBoard, `/api/groups/leaderboard?id=${club}`)).body.error).toBe("unknown_game");
  });

  it("adds up places among every player of the day, showing only the viewer's circle", async () => {
    const { body } = await call(friendsBoard, "/api/leaderboard?game=substrings");
    // Of the three others, A beat D, and B beat A and D.
    expect(standings(body)).toEqual([
      [B.username, 66.7],
      [A.username, 33.3],
    ]);
    // Settling took the whole day, strangers too.
    const { rows } = await getPool().query("select user_id from private.points_ledger where game_id = $1 and puzzle_date = $2::date and user_id = any($3::uuid[])", [SUBSTRINGS_ID, yesterday, [C.userId, D.userId]]);
    expect(rows).toHaveLength(2);
  });

  it("counts a group member's places from the day they joined", async () => {
    const { body } = await call(groupBoard, `/api/groups/leaderboard?id=${club}&game=substrings`);
    expect(standings(body)).toEqual([
      [A.username, 33.3],
      [C.username, 0],
    ]);
  });

  it("keeps game 1's board to game 1", async () => {
    const { body } = await call(friendsBoard, "/api/leaderboard?game=offbeat");
    expect(standings(body)).toEqual([
      [A.username, 0],
      [B.username, 0],
    ]);
  });
});
