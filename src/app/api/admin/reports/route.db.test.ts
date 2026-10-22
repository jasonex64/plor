// Reports end to end against the local stack (run with `npm run test:db`): real players sign in with emailed codes,
// play today's puzzle, and report comments through the route; an admin lists open reports and deletes the comment
// (docs/milestones/M08-comments-and-reactions.md, 8c; D5). A is the reporter; B is A's friend; C is no one's friend;
// D is B's friend but not A's; X is an admin who hasn't played.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { GAME_ID, type Puzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, removeCreatedPuzzles, safeEntry } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { POST as reportRoute } from "../../comments/report/route";
import { GET as threadRoute, POST as postRoute } from "../../comments/route";
import { POST as reactRoute } from "../../reactions/route";
import { POST as deleteRoute } from "./delete/route";
import { GET as listRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
type Player = { username: string; userId: string; session: Map<string, string> };
const keys = ["a", "b", "c", "d", "x"] as const;
const players = Object.fromEntries(keys.map((k) => [k, { username: `p${k}${RUN}`, userId: "", session: new Map() }])) as Record<
  (typeof keys)[number],
  Player
>;
let today = "";
let yesterday = "";
let puzzle: Puzzle;
let puzzleYesterday: Puzzle;
// Comment IDs by author.
const commentOf: Record<string, string> = {};

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const report = (id: unknown) => call(reportRoute(apiRequest("/api/comments/report", { method: "POST", body: { id } })));
const list = () => call(listRoute(apiRequest("/api/admin/reports", { method: "GET" })));
const remove = (id: unknown) => call(deleteRoute(apiRequest("/api/admin/reports/delete", { method: "POST", body: { id } })));
const bodies = async (date?: string) =>
  (await call(threadRoute(apiRequest(date ? `/api/comments?date=${date}` : "/api/comments", { method: "GET" })))).body.thread.comments.map(
    (c: { body: string }) => c.body,
  );
const ok = { status: 200, body: { ok: true } };
const notFound = { status: 404, body: { ok: false, error: "comment_not_found" } };

// Question 1 steals no letter (schedule A), so the host answer's name can be typed as is.
const hostName = () => puzzle.questions[0].entries.find((e) => e.id === puzzle.questions[0].host_answers[0])!.name;
async function start() {
  expect((await call(startRoute(apiRequest("/api/run/start", { method: "POST" })))).status).toBe(200);
}
async function getCaught() {
  const r = await call(answerRoute(apiRequest("/api/run/answer", { method: "POST", body: { index: 0, text: hostName() } })));
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
async function befriend(x: Player, y: Player) {
  await getPool().query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [
    x.userId,
    y.userId,
  ]);
}
async function reportCount(id: string): Promise<number> {
  const { rows } = await getPool().query<{ n: number }>("select count(*)::int as n from private.comment_report where comment_id = $1", [id]);
  return rows[0].n;
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
  // Deleting the auth users cascades to profiles, admins, friendships, runs, comments, reactions and reports; then the
  // fixture puzzles go.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeCreatedPuzzles();
  await getPool().end();
});

describe("reporting comments, and the admins' list", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in five players: A and B are friends, B and D are friends, C is no one's, X is an admin", async () => {
    for (const key of keys) {
      const p = players[key];
      p.session = (await signIn(`${RUN}-${key}@example.test`)).session;
      expect((await call(createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } })))).status).toBe(201);
      const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${key}@example.test`]);
      p.userId = rows[0].id;
    }
    await befriend(players.a, players.b);
    await befriend(players.b, players.d);
    await getPool().query("insert into private.admin (user_id) values ($1)", [players.x.userId]);
  });

  it("lets B, C and D finish and comment", async () => {
    // Not a loop: the linter reads useSession as a React hook.
    useSession(players.b.session);
    await finishAndPost("b");
    useSession(players.c.session);
    await finishAndPost("c");
    useSession(players.d.session);
    await finishAndPost("d");
  });

  it("refuses A's report while A can't see today's thread: before A starts, and mid-run", async () => {
    useSession(players.a.session);
    expect(await report(commentOf.b)).toEqual(notFound);
    await start();
    expect(await report(commentOf.b)).toEqual(notFound);
    expect(await reportCount(commentOf.b)).toBe(0);
  });

  it("refuses reporting your own comment, one you can't see, or a missing one", async () => {
    useSession(players.a.session);
    await getCaught();
    const posted = await call(postRoute(apiRequest("/api/comments", { method: "POST", body: { date: today, body: "hello from a" } })));
    commentOf.a = posted.body.comment.id;
    expect(await report(commentOf.a)).toEqual({ status: 409, body: { ok: false, error: "report_own" } });
    expect(await report(commentOf.c)).toEqual(notFound);
    expect(await report(commentOf.d)).toEqual(notFound);
    expect(await report("999999999999")).toEqual(notFound);
    expect(await report("not an id")).toEqual({ status: 400, body: { ok: false, error: "bad_request" } });
  });

  it("hides a reported comment from the reporter at once, and from no one else (D5)", async () => {
    useSession(players.a.session);
    expect(await bodies()).toEqual(["hello from b", "hello from a"]);
    expect(await report(commentOf.b)).toEqual(ok);
    expect(await bodies()).toEqual(["hello from a"]);
    // Reporting again changes nothing: still one report.
    expect(await report(commentOf.b)).toEqual(ok);
    expect(await reportCount(commentOf.b)).toBe(1);
    useSession(players.b.session);
    expect(await bodies()).toEqual(["hello from b", "hello from d", "hello from a"]);
    useSession(players.d.session);
    expect(await report(commentOf.b)).toEqual(ok);
    expect(await bodies()).toEqual(["hello from d"]);
  });

  it("answers 403 to a player who isn't an admin, before reading anything", async () => {
    useSession(players.a.session);
    const forbidden = { status: 403, body: { ok: false, error: "admins_only" } };
    expect(await list()).toEqual(forbidden);
    expect(await remove(commentOf.b)).toEqual(forbidden);
    expect(await reportCount(commentOf.b)).toBe(2);
  });

  it("lists open reports for an admin, one row per comment with its count", async () => {
    useSession(players.x.session);
    const r = await list();
    expect(r.status).toBe(200);
    // Other test files' leftovers can't be here: each deletes its users, and with them their reports.
    const mine = r.body.reports.filter((x: { username: string }) => x.username.endsWith(RUN));
    expect(mine).toEqual([
      { id: commentOf.b, date: today, username: players.b.username, name: players.b.username, body: "hello from b", reports: 2, firstReportedAt: expect.any(String) },
    ]);
  });

  it("lets an admin delete a reported comment for everyone, with its reports and reactions, but not an unreported one", async () => {
    useSession(players.d.session);
    expect((await call(reactRoute(apiRequest("/api/reactions", { method: "POST", body: { date: today, target: { type: "comment", id: commentOf.b }, emoji: "👍" } })))).status).toBe(200);
    useSession(players.x.session);
    expect(await remove(commentOf.c)).toEqual(notFound);
    expect(await remove("999999999999")).toEqual(notFound);
    expect(await remove("not an id")).toEqual({ status: 400, body: { ok: false, error: "bad_request" } });
    expect(await remove(commentOf.b)).toEqual(ok);
    expect(await remove(commentOf.b)).toEqual(notFound);
    expect((await list()).body.reports.filter((x: { username: string }) => x.username.endsWith(RUN))).toEqual([]);
    expect(await reportCount(commentOf.b)).toBe(0);
    const { rows } = await getPool().query("select from private.reaction where comment_id = $1", [commentOf.b]);
    expect(rows).toHaveLength(0);
    useSession(players.b.session);
    expect(await bodies()).toEqual(["hello from d", "hello from a"]);
  });

  it("lets A report a comment on a past day A can read (D6 makes it read-only, not unreportable)", async () => {
    // B played yesterday and commented then; written directly, since yesterday can't be played now.
    await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [players.b.userId, GAME_ID, yesterday]);
    const { rows } = await getPool().query<{ id: string }>(
      "insert into private.comment (user_id, game_id, puzzle_date, body) values ($1, $2, $3::date, 'yesterday from b') returning id::text",
      [players.b.userId, GAME_ID, yesterday],
    );
    // While A's run that day waits at a reveal (still in progress: a run can be finished after midnight), that day's
    // thread is closed to A, and so is reporting on it.
    await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [players.a.userId, GAME_ID, yesterday]);
    await getPool().query(
      "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 0, $4, false)",
      [players.a.userId, GAME_ID, yesterday, safeEntry(puzzleYesterday, 0)],
    );
    useSession(players.a.session);
    expect(await report(rows[0].id)).toEqual(notFound);
    expect(await reportCount(rows[0].id)).toBe(0);
    await getPool().query("delete from private.run where user_id = $1 and puzzle_date = $2::date", [players.a.userId, yesterday]);
    // Never played that day: the thread is open, and reporting works.
    expect(await bodies(yesterday)).toEqual(["yesterday from b"]);
    expect(await report(rows[0].id)).toEqual(ok);
    expect(await bodies(yesterday)).toEqual([]);
  });
});
