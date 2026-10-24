// Reactions end to end against the local stack (run with `npm run test:db`): real players sign in with emailed codes,
// play today's puzzle, and react through the route, then read reactions from the comments thread and the live board
// (docs/milestones/M08-comments-and-reactions.md, 8b). A is the viewer; B is A's friend; C is no one's friend; D is
// B's friend but not A's; E is A's friend who hasn't played.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { REACTIONS } from "@/config/tunables";
import { GAME_ID, type ApprovedPuzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, hostName, removeCreatedPuzzles } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as boardRoute } from "../board/route";
import { POST as deleteRoute } from "../comments/delete/route";
import { GET as threadRoute, POST as postRoute } from "../comments/route";
import { POST as reactRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
type Player = { username: string; userId: string; session: Map<string, string> };
const keys = ["a", "b", "c", "d"] as const;
const players = Object.fromEntries(keys.map((k) => [k, { username: `r${k}${RUN}`, userId: "", session: new Map() }])) as Record<
  (typeof keys)[number],
  Player
>;
// E never signs in: a friend of A's with no run today, written directly.
const e = { username: `re${RUN}`, userId: "" };
let today = "";
let yesterday = "";
let puzzle: ApprovedPuzzle;
// Comment IDs by author.
const commentOf: Record<string, string> = {};

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
type Target = { type: "comment"; id: string } | { type: "run"; username: string };
const react = (target: unknown, emoji: unknown, date = today) =>
  call(reactRoute(apiRequest("/api/reactions", { method: "POST", body: { date, target, emoji } })));
const onComment = (id: string): Target => ({ type: "comment", id });
const onRun = (username: string): Target => ({ type: "run", username });
const thread = async (date?: string) =>
  (await call(threadRoute(apiRequest(date ? `/api/comments?date=${date}` : "/api/comments", { method: "GET" })))).body.thread;
const reactionsOnComment = async (id: string, date?: string) =>
  (await thread(date)).comments.find((c: { id: string }) => c.id === id).reactions;
const board = async () => (await call(boardRoute(apiRequest("/api/board", { method: "GET" })))).body.board;
const reactionsOnRun = async (username: string) => (await board()).friends.find((f: { username: string }) => f.username === username).reactions;
const none = { counts: [], mine: null };

async function start() {
  expect((await call(startRoute(apiRequest("/api/run/start", { method: "POST" })))).status).toBe(200);
}
async function getCaught() {
  const r = await call(answerRoute(apiRequest("/api/run/answer", { method: "POST", body: { index: 0, text: hostName(puzzle, 0) } })));
  expect(r.body.run.status).toBe("died");
}
// As whoever is signed in now.
async function finishAndPost(key: (typeof keys)[number]) {
  await start();
  await getCaught();
  const r = await call(postRoute(apiRequest("/api/comments", { method: "POST", body: { date: today, body: `hello from ${key}` } })));
  expect(r.status).toBe(201);
  commentOf[key] = r.body.comment.id;
}
async function befriend(x: { userId: string }, y: { userId: string }) {
  await getPool().query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [
    x.userId,
    y.userId,
  ]);
}

beforeAll(async () => {
  useLocalStack();
  const { rows } = await getPool().query<{ today: string; yesterday: string }>(
    "select private.today()::text as today, (private.today() - 1)::text as yesterday",
  );
  ({ today, yesterday } = rows[0]);
  puzzle = await ensurePuzzle(today);
  await ensurePuzzle(yesterday);
});

afterAll(async () => {
  // Deleting the auth users cascades to profiles, friendships, runs, comments and reactions; then the fixture puzzles go.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeCreatedPuzzles();
  await getPool().end();
});

describe("reactions on comments and on friends' runs", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in four players (A and B are friends, B and D are friends, C is no one's) and adds E, A's friend", async () => {
    for (const key of keys) {
      const p = players[key];
      p.session = (await signIn(`${RUN}-${key}@example.test`)).session;
      expect((await call(createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } })))).status).toBe(201);
      const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${key}@example.test`]);
      p.userId = rows[0].id;
    }
    const { rows } = await getPool().query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [
      `${RUN}-e@example.test`,
    ]);
    e.userId = rows[0].id;
    await getPool().query("insert into private.profile (user_id, username) values ($1, $2)", [e.userId, e.username]);
    await befriend(players.a, players.b);
    await befriend(players.b, players.d);
    await befriend(players.a, e);
  });

  it("lets B, C and D finish and comment, and D react to B's run", async () => {
    // Not a loop: the linter reads useSession as a React hook.
    useSession(players.b.session);
    await finishAndPost("b");
    useSession(players.c.session);
    await finishAndPost("c");
    useSession(players.d.session);
    await finishAndPost("d");
    expect(await react(onRun(players.b.username), "😂")).toEqual({ status: 200, body: { ok: true } });
  });

  it("refuses A's reactions, and shows A no reactions on runs, until A's run is over", async () => {
    useSession(players.a.session);
    const notFinished = { status: 409, body: { ok: false, error: "not_finished" } };
    expect(await react(onRun(players.b.username), "👍")).toEqual(notFinished);
    await start();
    expect(await react(onRun(players.b.username), "👍")).toEqual(notFinished);
    expect(await react(onComment(commentOf.b), "👍")).toEqual(notFinished);
    const b = await board();
    expect(b.reactionsOnMine).toBeNull();
    expect(b.friends.map((f: { reactions: unknown }) => f.reactions)).toEqual([null, null]);
  });

  it("sets, replaces and removes A's reaction on a comment: one per player", async () => {
    useSession(players.a.session);
    await getCaught();
    expect(await reactionsOnComment(commentOf.b)).toEqual(none);
    expect(await react(onComment(commentOf.b), "👍")).toEqual({ status: 200, body: { ok: true } });
    expect(await reactionsOnComment(commentOf.b)).toEqual({ counts: [{ emoji: "👍", count: 1 }], mine: "👍" });
    expect((await react(onComment(commentOf.b), "❤️")).status).toBe(200);
    expect(await reactionsOnComment(commentOf.b)).toEqual({ counts: [{ emoji: "❤️", count: 1 }], mine: "❤️" });
    expect((await react(onComment(commentOf.b), null)).status).toBe(200);
    expect(await reactionsOnComment(commentOf.b)).toEqual(none);
    // Removing what isn't there is not an error: tapping twice quickly ends where it started.
    expect((await react(onComment(commentOf.b), null)).status).toBe(200);
  });

  it(`accepts each of the ${REACTIONS.length} reactions (D3), so the tunable and the database agree, and nothing else`, async () => {
    useSession(players.a.session);
    for (const emoji of REACTIONS) {
      expect(await react(onRun(players.b.username), emoji)).toEqual({ status: 200, body: { ok: true } });
    }
    const bad = { status: 400, body: { ok: false, error: "bad_request" } };
    expect(await react(onRun(players.b.username), "👎")).toEqual(bad);
    expect(await react(onRun(players.b.username), "❤")).toEqual(bad);
    expect(await react(onRun(players.b.username), undefined)).toEqual(bad);
    expect(await react(onRun(players.b.username), 1)).toEqual(bad);
    expect(await react({ type: "comment", id: "x" }, "👍")).toEqual(bad);
    expect(await react({ type: "run" }, "👍")).toEqual(bad);
    expect(await react("run", "👍")).toEqual(bad);
    expect(await react(onRun(players.b.username), "👍", "yesterday")).toEqual(bad);
  });

  it("shows reactions on a run to the runner and their friends, but not a friend of a friend's", async () => {
    // A's last reaction on B's run is the set's last, ❤️; D's 😂 is on it too.
    useSession(players.a.session);
    expect(await reactionsOnRun(players.b.username)).toEqual({ counts: [{ emoji: "❤️", count: 1 }], mine: "❤️" });
    useSession(players.b.session);
    expect((await board()).reactionsOnMine).toEqual({
      counts: [
        { emoji: "😂", count: 1 },
        { emoji: "❤️", count: 1 },
      ],
      mine: null,
    });
    useSession(players.d.session);
    expect(await reactionsOnRun(players.b.username)).toEqual({ counts: [{ emoji: "😂", count: 1 }], mine: "😂" });
  });

  it("shows reactions on a comment to its readers the same way, counted in the set's order", async () => {
    useSession(players.a.session);
    expect((await react(onComment(commentOf.b), "😮")).status).toBe(200);
    useSession(players.d.session);
    expect((await react(onComment(commentOf.b), "👍")).status).toBe(200);
    useSession(players.b.session);
    expect((await react(onComment(commentOf.b), "😮")).status).toBe(200);
    expect(await reactionsOnComment(commentOf.b)).toEqual({
      counts: [
        { emoji: "👍", count: 1 },
        { emoji: "😮", count: 2 },
      ],
      mine: "😮",
    });
    useSession(players.a.session);
    expect(await reactionsOnComment(commentOf.b)).toEqual({ counts: [{ emoji: "😮", count: 2 }], mine: "😮" });
  });

  it("refuses targets A can't see: a non-friend's comment or run, A's own run, someone unknown, a friend with no run", async () => {
    useSession(players.a.session);
    expect(await react(onComment(commentOf.c), "👍")).toEqual({ status: 404, body: { ok: false, error: "comment_not_found" } });
    expect(await react(onComment("999999999999"), "👍")).toEqual({ status: 404, body: { ok: false, error: "comment_not_found" } });
    const notFriends = { status: 404, body: { ok: false, error: "not_friends" } };
    expect(await react(onRun(players.c.username), "👍")).toEqual(notFriends);
    expect(await react(onRun(players.a.username), "👍")).toEqual(notFriends);
    expect(await react(onRun(`nobody${RUN}`), "👍")).toEqual(notFriends);
    expect(await react(onRun(e.username), "👍")).toEqual({ status: 404, body: { ok: false, error: "run_not_found" } });
    expect((await board()).friends.find((f: { username: string }) => f.username === e.username).reactions).toBeNull();
  });

  it("deletes a comment's reactions with it (D4)", async () => {
    useSession(players.b.session);
    expect((await call(deleteRoute(apiRequest("/api/comments/delete", { method: "POST", body: { id: commentOf.b } })))).status).toBe(200);
    const { rows } = await getPool().query("select from private.reaction where comment_id = $1", [commentOf.b]);
    expect(rows).toHaveLength(0);
  });

  it("shows a past day's reactions read-only, and refuses reacting on it (D6)", async () => {
    // B played yesterday, commented, and reacted to the comment; written directly, since yesterday can't be played now.
    const pool = getPool();
    await pool.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [players.b.userId, GAME_ID, yesterday]);
    const { rows } = await pool.query<{ id: string }>(
      "insert into private.comment (user_id, game_id, puzzle_date, body) values ($1, $2, $3::date, 'yesterday from b') returning id::text",
      [players.b.userId, GAME_ID, yesterday],
    );
    await pool.query("insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji) values ($1, $2, $3::date, $4, '😢')", [
      players.b.userId,
      GAME_ID,
      yesterday,
      rows[0].id,
    ]);
    useSession(players.a.session);
    expect(await reactionsOnComment(rows[0].id, yesterday)).toEqual({ counts: [{ emoji: "😢", count: 1 }], mine: null });
    useSession(players.b.session);
    expect(await react(onComment(rows[0].id), null, yesterday)).toEqual({ status: 409, body: { ok: false, error: "day_past" } });
    expect(await react(onComment(rows[0].id), "👍", yesterday)).toEqual({ status: 409, body: { ok: false, error: "day_past" } });
    const { rows: tomorrow } = await pool.query<{ d: string }>("select (private.today() + 1)::text as d");
    expect(await react(onRun(players.a.username), "👍", tomorrow[0].d)).toEqual({ status: 400, body: { ok: false, error: "bad_request" } });
  });
});
