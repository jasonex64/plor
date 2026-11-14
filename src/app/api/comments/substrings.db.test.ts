// Fragments' comments and reactions against the local stack (`npm run test:db`;
// docs/milestones/M16-16f-the-shared-pieces.md, 16f-3; human, 2026-11-13: "Each game its own", "Both, for both games"):
// each game's day has its own thread, friends' and each group's, opened for writing by finishing that game, and a
// reaction counts on the game it was made in. Offbeat is finished through its routes; Fragments is written directly
// with the round rules switched off, finished by a round 7 that opened an hour ago. A is the viewer and friends with
// B, C, X and Y; D is no one's friend; Club holds A and B. B and D finished both games, C only Offbeat, X only
// Fragments. Y finished both and is blocked by A, with the friendship left in place so only the block can hide Y.
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createGroup } from "@/app/api/groups/create/route";
import { GET as groupDetail } from "@/app/api/groups/detail/route";
import { POST as joinGroup } from "@/app/api/groups/join/route";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as reactRoute } from "@/app/api/reactions/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { type ApprovedPuzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import { runReactions } from "@/reactions/reactions";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, hostName, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { POST as deleteRoute } from "./delete/route";
import { POST as reportRoute } from "./report/route";
import { GET as threadRoute, POST as postRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, userId: "", session: new Map<string, string>() });
const [A, B, C, D, X, Y] = ["fa", "fb", "fc", "fd", "fx", "fy"].map(player);
const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
let today = "";
let yesterday = "";
let puzzle: ApprovedPuzzle;
let club = "";
const commentOf: Record<string, string> = {};

async function call(route: (r: Request) => Promise<Response>, path: string, method: "GET" | "POST", body?: unknown) {
  const response = await route(apiRequest(path, { method, body }));
  return { status: response.status, body: await response.json() };
}
const thread = (game: string, query = "") => call(threadRoute, `/api/comments?game=${game}${query}`, "GET");
const bodies = async (game: string, query = "") => ((await thread(game, query)).body.thread.comments ?? []).map((c: { body: string }) => c.body);
const post = (game: unknown, body: string, group?: string, date = today) => call(postRoute, "/api/comments", "POST", { game, date, body, group });
const react = (game: unknown, target: unknown, emoji: string) => call(reactRoute, "/api/reactions", "POST", { game, date: today, target, emoji });
const befriend = (x: { userId: string }, y: { userId: string }) =>
  getPool().query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [x.userId, y.userId]);

async function finishOffbeat() {
  expect((await call(startRoute, "/api/run/start", "POST")).status).toBe(200);
  expect((await call(answerRoute, "/api/run/answer", "POST", { index: 0, text: hostName(puzzle, 0) })).body.run.status).toBe("died");
}
async function finishFragments(p: { userId: string }, date = today) {
  const client = await admin.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    await client.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [p.userId, SUBSTRINGS_ID, date]);
    await client.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx, opened_at) values ($1, $2, $3::date, 6, now() - interval '1 hour')", [
      p.userId,
      SUBSTRINGS_ID,
      date,
    ]);
    await client.query("commit");
  } finally {
    client.release();
  }
}

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  const { rows } = await db.query<{ today: string; yesterday: string }>("select private.today()::text as today, (private.today() - 1)::text as yesterday");
  ({ today, yesterday } = rows[0]);
  puzzle = await ensurePuzzle(today);
  // These days must be this test's own: an existing Fragments day fails the insert.
  for (const date of [today, yesterday]) {
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
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = any($2::date[])", [SUBSTRINGS_ID, [today, yesterday]]);
  await removeFixtures();
  await db.end();
  await admin.end();
});

describe("Fragments' comments and reactions", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in six players, makes Club for A and B, and has each finish their games", async () => {
    for (const p of [A, B, C, D, X, Y]) {
      p.session = (await signIn(p.email)).session;
      expect((await call(createProfile, "/api/profile", "POST", { username: p.username })).status).toBe(201);
      p.userId = (await getPool().query<{ id: string }>("select id from auth.users where email = $1", [p.email])).rows[0].id;
    }
    for (const p of [B, C, X, Y]) await befriend(A, p);
    await getPool().query("insert into private.block (blocker, blocked) values ($1, $2)", [A.userId, Y.userId]);
    useSession(A.session);
    club = (await call(createGroup, "/api/groups/create", "POST", { name: "Club" })).body.group.id;
    const code = (await call(groupDetail, `/api/groups/detail?id=${club}`, "GET")).body.group.inviteCode;
    useSession(B.session);
    expect((await call(joinGroup, "/api/groups/join", "POST", { code })).status).toBe(200);
    // Offbeat for A, B, C, D, Y; Fragments for A, B, D, X, Y.
    // Not a loop: the linter reads useSession as a React hook.
    useSession(A.session);
    await finishOffbeat();
    useSession(B.session);
    await finishOffbeat();
    useSession(C.session);
    await finishOffbeat();
    useSession(D.session);
    await finishOffbeat();
    useSession(Y.session);
    await finishOffbeat();
    for (const p of [A, B, D, X, Y]) await finishFragments(p);
  });

  it("refuses a request that doesn't name its game, or names an unknown one", async () => {
    useSession(A.session);
    const unknown = { status: 400, body: { ok: false, error: "unknown_game" } };
    for (const game of [null, "chess", "overall"]) {
      expect(await call(threadRoute, game === null ? "/api/comments" : `/api/comments?game=${game}`, "GET")).toEqual(unknown);
      expect(await post(game ?? undefined, "no game")).toEqual(unknown);
      expect(await react(game ?? undefined, { type: "run", userId: B.userId }, "👍")).toEqual(unknown);
    }
  });

  it("keeps a Fragments comment out of Offbeat's thread, and the reverse, friends' and Club's", async () => {
    const both = async (tag: string) => {
      for (const game of [GAME_ID, SUBSTRINGS_ID]) {
        const made = await post(game, `${tag} on ${game}`);
        expect(made.status).toBe(201);
        commentOf[`${tag} ${game}`] = made.body.comment.id;
      }
    };
    useSession(B.session);
    await both("b");
    useSession(D.session);
    await both("d");
    useSession(Y.session);
    await both("y");
    useSession(B.session);
    for (const game of [GAME_ID, SUBSTRINGS_ID]) {
      const made = await post(game, `b club ${game}`, club);
      expect(made.status).toBe(201);
      commentOf[`b club ${game}`] = made.body.comment.id;
    }
    useSession(A.session);
    // Y is blocked and D a stranger: neither shows to A, in either game.
    expect(await bodies(GAME_ID)).toEqual([`b on ${GAME_ID}`]);
    expect(await bodies(SUBSTRINGS_ID)).toEqual([`b on ${SUBSTRINGS_ID}`]);
    expect(await bodies(GAME_ID, `&group=${club}`)).toEqual([`b club ${GAME_ID}`]);
    expect(await bodies(SUBSTRINGS_ID, `&group=${club}`)).toEqual([`b club ${SUBSTRINGS_ID}`]);
  });

  it("shows a stranger only their own", async () => {
    useSession(D.session);
    expect(await bodies(SUBSTRINGS_ID)).toEqual([`d on ${SUBSTRINGS_ID}`]);
    expect(await thread(SUBSTRINGS_ID, `&group=${club}`)).toEqual({ status: 404, body: { ok: false, error: "group_not_found" } });
  });

  it("opens each game's thread only for a player who finished that game, today", async () => {
    // C finished Offbeat only; X Fragments only.
    useSession(C.session);
    expect(await post(SUBSTRINGS_ID, "too early")).toEqual({ status: 409, body: { ok: false, error: "not_finished" } });
    expect((await thread(SUBSTRINGS_ID)).body.thread).toEqual({ date: today, canPost: false, comments: null });
    expect((await thread(GAME_ID)).body.thread).toMatchObject({ canPost: true });
    expect((await post(GAME_ID, "c on offbeat")).status).toBe(201);
    useSession(X.session);
    expect(await post(GAME_ID, "too early")).toEqual({ status: 409, body: { ok: false, error: "not_finished" } });
    expect((await thread(GAME_ID)).body.thread).toEqual({ date: today, canPost: false, comments: null });
    expect((await thread(SUBSTRINGS_ID)).body.thread).toMatchObject({ canPost: true });
    expect((await post(SUBSTRINGS_ID, "x on fragments")).status).toBe(201);
    // No comment text reaches a player who hasn't finished that game.
    useSession(C.session);
    expect(JSON.stringify(await thread(SUBSTRINGS_ID))).not.toContain("on fragments");
    expect(JSON.stringify(await thread(SUBSTRINGS_ID, `&group=${club}`))).not.toContain("club");
  });

  it("shows a past Fragments day read-only to a player who didn't play it, and hides it while their run there is going", async () => {
    await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [B.userId, SUBSTRINGS_ID, yesterday]);
    await getPool().query("insert into private.comment (user_id, game_id, puzzle_date, body) values ($1, $2, $3::date, 'yesterday on fragments')", [B.userId, SUBSTRINGS_ID, yesterday]);
    useSession(A.session);
    expect((await thread(SUBSTRINGS_ID, `&date=${yesterday}`)).body.thread).toMatchObject({ date: yesterday, canPost: false, comments: [{ body: "yesterday on fragments" }] });
    expect(await bodies(GAME_ID, `&date=${yesterday}`)).toEqual([]);
    await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [A.userId, SUBSTRINGS_ID, yesterday]);
    expect((await thread(SUBSTRINGS_ID, `&date=${yesterday}`)).body.thread).toEqual({ date: yesterday, canPost: false, comments: null });
    expect(await post(SUBSTRINGS_ID, "late", undefined, yesterday)).toEqual({ status: 409, body: { ok: false, error: "day_past" } });
  });

  it("lets a player react to a Fragments comment once they've finished Fragments, and counts it there only", async () => {
    useSession(C.session);
    expect(await react(SUBSTRINGS_ID, { type: "comment", id: commentOf[`b ${SUBSTRINGS_ID}`] }, "👍")).toEqual({ status: 409, body: { ok: false, error: "not_finished" } });
    useSession(A.session);
    // A comment is in one game: named under the other, it isn't there.
    expect(await react(GAME_ID, { type: "comment", id: commentOf[`b ${SUBSTRINGS_ID}`] }, "👍")).toEqual({ status: 404, body: { ok: false, error: "comment_not_found" } });
    expect((await react(SUBSTRINGS_ID, { type: "comment", id: commentOf[`b ${SUBSTRINGS_ID}`] }, "👍")).status).toBe(200);
    expect((await react(SUBSTRINGS_ID, { type: "comment", id: commentOf[`b club ${SUBSTRINGS_ID}`] }, "😂")).status).toBe(200);
    const fragments = (await thread(SUBSTRINGS_ID)).body.thread.comments;
    expect(fragments[0].reactions).toEqual({ counts: [{ emoji: "👍", count: 1 }], mine: "👍" });
    const offbeat = (await thread(GAME_ID)).body.thread.comments;
    expect(offbeat[0].reactions).toEqual({ counts: [], mine: null });
  });

  it("lets a player react to a friend's Fragments run under Offbeat's rules, and counts it on that game only", async () => {
    useSession(A.session);
    expect((await react(SUBSTRINGS_ID, { type: "run", userId: B.userId }, "👍")).status).toBe(200);
    expect((await react(GAME_ID, { type: "run", userId: B.userId }, "❤️")).status).toBe(200);
    const counts = async (game: typeof GAME_ID | typeof SUBSTRINGS_ID) => (await runReactions(getPool(), A.userId, game, today, [B.userId])).get(B.userId);
    expect(await counts(SUBSTRINGS_ID)).toEqual({ counts: [{ emoji: "👍", count: 1 }], mine: "👍" });
    expect(await counts(GAME_ID)).toEqual({ counts: [{ emoji: "❤️", count: 1 }], mine: "❤️" });
    // C has no Fragments run, a stranger isn't a friend, and a player who hasn't finished Fragments can't react.
    expect(await react(SUBSTRINGS_ID, { type: "run", userId: C.userId }, "👍")).toEqual({ status: 404, body: { ok: false, error: "run_not_found" } });
    expect(await react(SUBSTRINGS_ID, { type: "run", userId: D.userId }, "👍")).toEqual({ status: 404, body: { ok: false, error: "not_friends" } });
    useSession(C.session);
    expect(await react(SUBSTRINGS_ID, { type: "run", userId: B.userId }, "👍")).toEqual({ status: 409, body: { ok: false, error: "not_finished" } });
  });

  it("deletes your own Fragments comment, and reports a friend's if you can see it", async () => {
    useSession(C.session);
    // C can't see Fragments' thread today, so a report of a comment in it is the same 404 as a missing one.
    const notThere = { status: 404, body: { ok: false, error: "comment_not_found" } };
    expect(await call(reportRoute, "/api/comments/report", "POST", { id: commentOf[`b ${SUBSTRINGS_ID}`] })).toEqual(notThere);
    useSession(A.session);
    expect(await call(reportRoute, "/api/comments/report", "POST", { id: commentOf[`b club ${SUBSTRINGS_ID}`] })).toEqual({ status: 200, body: { ok: true } });
    expect(await bodies(SUBSTRINGS_ID, `&group=${club}`)).toEqual([]);
    expect(await bodies(GAME_ID, `&group=${club}`)).toEqual([`b club ${GAME_ID}`]);
    const mine = await post(SUBSTRINGS_ID, "delete me");
    useSession(B.session);
    expect(await call(deleteRoute, "/api/comments/delete", "POST", { id: mine.body.comment.id })).toEqual(notThere);
    useSession(A.session);
    expect(await call(deleteRoute, "/api/comments/delete", "POST", { id: mine.body.comment.id })).toEqual({ status: 200, body: { ok: true } });
    expect(await bodies(SUBSTRINGS_ID)).toEqual([`b on ${SUBSTRINGS_ID}`, "x on fragments"]);
  });
});
