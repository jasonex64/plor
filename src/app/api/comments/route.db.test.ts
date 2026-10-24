// Comments end to end against the local stack (run with `npm run test:db`): real players sign in with emailed codes,
// play today's puzzle, and post, read and delete through the route handlers (docs/milestones/M08-comments-and-reactions.md,
// 8a). A is the viewer; B is A's friend; C is no one's friend; D is B's friend but not A's.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { COMMENT_MAX_LENGTH } from "@/config/tunables";
import { GAME_ID, type ApprovedPuzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, hostName, removeCreatedPuzzles, safeEntry } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { POST as deleteRoute } from "./delete/route";
import { GET as threadRoute, POST as postRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
type Player = { username: string; userId: string; session: Map<string, string> };
const keys = ["a", "b", "c", "d"] as const;
const players = Object.fromEntries(keys.map((k) => [k, { username: `c${k}${RUN}`, userId: "", session: new Map() }])) as Record<
  (typeof keys)[number],
  Player
>;
let today = "";
let yesterday = "";
let puzzle: ApprovedPuzzle;
let puzzleYesterday: ApprovedPuzzle;

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const thread = (date?: string) => call(threadRoute(apiRequest(date ? `/api/comments?date=${date}` : "/api/comments", { method: "GET" })));
const post = (body: unknown, date = today) => call(postRoute(apiRequest("/api/comments", { method: "POST", body: { date, body } })));
const remove = (id: unknown) => call(deleteRoute(apiRequest("/api/comments/delete", { method: "POST", body: { id } })));
const bodies = (r: { body: { thread: { comments: { body: string }[] } } }) => r.body.thread.comments.map((c) => c.body);

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
  const r = await post(`hello from ${key}`);
  expect(r.status).toBe(201);
  expect(r.body.comment).toMatchObject({ username: players[key].username, name: players[key].username, body: `hello from ${key}` });
}
async function befriend(x: Player, y: Player) {
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
  puzzleYesterday = await ensurePuzzle(yesterday);
});

afterAll(async () => {
  // Deleting the auth users cascades to profiles, friendships, runs and comments; then the fixture puzzles go.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeCreatedPuzzles();
  await getPool().end();
});

describe("comments on the day's game", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in four players: A and B are friends, B and D are friends, C is no one's", async () => {
    for (const key of keys) {
      const p = players[key];
      p.session = (await signIn(`${RUN}-${key}@example.test`)).session;
      expect((await call(createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } })))).status).toBe(201);
      const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${key}@example.test`]);
      p.userId = rows[0].id;
    }
    await befriend(players.a, players.b);
    await befriend(players.b, players.d);
  });

  it("lets B, C and D post once they have finished today", async () => {
    // Not a loop: the linter reads useSession as a React hook.
    useSession(players.b.session);
    await finishAndPost("b");
    useSession(players.c.session);
    await finishAndPost("c");
    useSession(players.d.session);
    await finishAndPost("d");
  });

  it("hides today's thread from A, and refuses A's post, until A's run is over", async () => {
    useSession(players.a.session);
    const notStarted = await thread();
    expect(notStarted).toEqual({ status: 200, body: { ok: true, thread: { date: today, canPost: false, comments: null } } });
    expect(await post("too early")).toEqual({ status: 409, body: { ok: false, error: "not_finished" } });
    await start();
    const playing = await thread();
    expect(playing.body.thread).toEqual({ date: today, canPost: false, comments: null });
    expect(await post("too early")).toEqual({ status: 409, body: { ok: false, error: "not_finished" } });
    // No comment text reaches a player who hasn't finished.
    expect(JSON.stringify([notStarted, playing])).not.toContain("hello from");
  });

  it("shows A their own comments and their friends', oldest first, and no one else's", async () => {
    useSession(players.a.session);
    await getCaught();
    expect((await post("  hello from a \n")).body.comment.body).toBe("hello from a");
    const r = await thread();
    expect(r.body.thread).toMatchObject({ date: today, canPost: true });
    expect(bodies(r)).toEqual(["hello from b", "hello from a"]);
    // B sees both friends, A and D; D sees B only.
    useSession(players.b.session);
    expect(bodies(await thread())).toEqual(["hello from b", "hello from d", "hello from a"]);
    useSession(players.d.session);
    expect(bodies(await thread())).toEqual(["hello from b", "hello from d"]);
  });

  it(`refuses an empty comment or one over ${COMMENT_MAX_LENGTH} characters (D1), and the database agrees on the length`, async () => {
    useSession(players.a.session);
    const invalid = { status: 400, body: { ok: false, error: "comment_invalid" } };
    expect(await post("")).toEqual(invalid);
    expect(await post(" \n ")).toEqual(invalid);
    expect(await post("a".repeat(COMMENT_MAX_LENGTH + 1))).toEqual(invalid);
    expect(await post(42)).toEqual(invalid);
    const longest = await post("a".repeat(COMMENT_MAX_LENGTH));
    expect(longest.status).toBe(201);
    expect((await remove(longest.body.comment.id)).status).toBe(200);
  });

  it("deletes your own comment for everyone, and refuses anyone else's", async () => {
    useSession(players.a.session);
    const mine = await post("delete me");
    const theirs = (await thread()).body.thread.comments.find((c: { body: string }) => c.body === "hello from b");
    const notYours = { status: 404, body: { ok: false, error: "comment_not_found" } };
    expect(await remove(theirs.id)).toEqual(notYours);
    expect(await remove("999999999999")).toEqual(notYours);
    expect(await remove("not an id")).toEqual({ status: 400, body: { ok: false, error: "bad_request" } });
    useSession(players.b.session);
    expect(bodies(await thread())).toContain("delete me");
    expect(await remove(mine.body.comment.id)).toEqual(notYours);
    useSession(players.a.session);
    expect(await remove(mine.body.comment.id)).toEqual({ status: 200, body: { ok: true } });
    expect(await remove(mine.body.comment.id)).toEqual(notYours);
    useSession(players.b.session);
    expect(bodies(await thread())).not.toContain("delete me");
    expect(bodies(await thread())).toContain("hello from b");
  });

  it("lets A browse yesterday's thread read-only, though A didn't play it (D6)", async () => {
    // B played yesterday and commented then; written directly, since yesterday can't be played now.
    await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [players.b.userId, GAME_ID, yesterday]);
    await getPool().query("insert into private.comment (user_id, game_id, puzzle_date, body) values ($1, $2, $3::date, 'yesterday from b')", [
      players.b.userId,
      GAME_ID,
      yesterday,
    ]);
    useSession(players.a.session);
    const r = await thread(yesterday);
    expect(r.body.thread).toMatchObject({ date: yesterday, canPost: false });
    expect(bodies(r)).toEqual(["yesterday from b"]);
    useSession(players.b.session);
    expect(await post("late", yesterday)).toEqual({ status: 409, body: { ok: false, error: "day_past" } });
  });

  it("hides a past day's thread while the viewer's run that day is still going (a run can be finished after midnight)", async () => {
    // A started yesterday, answered question 1 and waits at the reveal: no deadline, so still in progress.
    await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [players.a.userId, GAME_ID, yesterday]);
    await getPool().query(
      "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 0, $4, false)",
      [players.a.userId, GAME_ID, yesterday, safeEntry(puzzleYesterday, 0)],
    );
    useSession(players.a.session);
    const r = await thread(yesterday);
    expect(r).toEqual({ status: 200, body: { ok: true, thread: { date: yesterday, canPost: false, comments: null } } });
    expect(JSON.stringify(r)).not.toContain("yesterday from b");
    await getPool().query("delete from private.run where user_id = $1 and puzzle_date = $2::date", [players.a.userId, yesterday]);
  });

  it("refuses a date that isn't a calendar date, or is after today", async () => {
    useSession(players.a.session);
    const bad = { status: 400, body: { ok: false, error: "bad_request" } };
    const { rows } = await getPool().query<{ tomorrow: string }>("select (private.today() + 1)::text as tomorrow");
    expect(await thread("2026-02-30")).toEqual(bad);
    expect(await thread(rows[0].tomorrow)).toEqual(bad);
    expect(await post("hi", "yesterday")).toEqual(bad);
    expect(await post("hi", rows[0].tomorrow)).toEqual(bad);
  });
});
