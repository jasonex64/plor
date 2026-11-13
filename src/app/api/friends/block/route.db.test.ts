// Blocking end to end against the local stack (run with `npm run test:db`; docs/milestones/M17-profiles-and-friend-requests.md,
// 17a): real players sign in, play today's puzzle, comment and react, and block through the route handlers. A, B and
// C are all in Club; A and B start as friends; C is nobody's friend and never finishes today's run.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GET as boardRoute } from "@/app/api/board/route";
import { POST as reportRoute } from "@/app/api/comments/report/route";
import { GET as threadRoute, POST as postRoute } from "@/app/api/comments/route";
import { GET as feedRoute } from "@/app/api/feed/route";
import { GET as groupBoard } from "@/app/api/groups/leaderboard/route";
import { GET as friendsBoard } from "@/app/api/leaderboard/route";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as reactRoute } from "@/app/api/reactions/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import type { ApprovedPuzzle } from "@/content/puzzle";
import { createGroup, getGroup, joinGroup } from "@/groups/groups";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, hostName, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { POST as add } from "../add/route";
import { GET as blockedRoute } from "../blocked/route";
import { POST as invite } from "../invite/route";
import { POST as accept } from "../requests/accept/route";
import { POST as cancel } from "../requests/cancel/route";
import { GET as count } from "../requests/count/route";
import { POST as decline } from "../requests/decline/route";
import { POST as send } from "../requests/route";
import { GET as friends } from "../route";
import { POST as unblock } from "../unblock/route";
import { POST as block } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, userId: "", session: new Map<string, string>() });
const A = player("ka");
const B = player("kb");
const C = player("kc");
// E never signs in: a plain player B can send a request to, who simply doesn't answer.
const E = { userId: randomUUID(), username: `ke${RUN}` };
let today = "";
let puzzle: ApprovedPuzzle;
let club = "";
const ids = { bClub: "", aClub: "" };

async function call(route: (r: Request) => Promise<Response>, path: string, method: "GET" | "POST", body?: unknown) {
  const response = await route(apiRequest(path, { method, body }));
  return { status: response.status, body: await response.json() };
}
const to = (route: (r: Request) => Promise<Response>, path: string, username: unknown) => call(route, `/api/friends/${path}`, "POST", { username });
const names = (list: { username: string }[]) => list.map((p) => p.username);
const lists = async () => {
  const { body } = await call(friends, "/api/friends", "GET");
  return { friends: names(body.friends), requests: names(body.requests), sent: names(body.sent) };
};
const waiting = async () => (await call(count, "/api/friends/requests/count", "GET")).body.count;
const blockedList = async () => names((await call(blockedRoute, "/api/friends/blocked", "GET")).body.blocked);
type Comment = { id: string; username: string; body: string; reactions: { counts: { emoji: string; count: number }[] } };
const thread = async (query = ""): Promise<Comment[]> => (await call(threadRoute, `/api/comments${query}`, "GET")).body.thread.comments;
const seen = async (query = "") => (await thread(query)).map((c) => [c.body, c.reactions.counts]);
const feed = async () => (await call(feedRoute, "/api/feed", "GET")).body.feed;
const post = (body: string, group?: string) => call(postRoute, "/api/comments", "POST", { date: today, body, group });
const react = (id: string, emoji: string) => call(reactRoute, "/api/reactions", "POST", { date: today, target: { type: "comment", id }, emoji });
const boardFriends = async () => names((await call(boardRoute, "/api/board", "GET")).body.board.friends);
const weekOf = async (route: (r: Request) => Promise<Response>, path: string) => names((await call(route, path, "GET")).body.thisWeek.entries).toSorted();
const ok = { status: 200, body: { ok: true } };
const sent = { status: 200, body: { ok: true, state: "sent" } };
const requestNotFound = { status: 404, body: { ok: false, error: "request_not_found" } };
const commentNotFound = { status: 404, body: { ok: false, error: "comment_not_found" } };

// Question 1 steals no letter (schedule A), so the host answer's name can be typed as is.
async function finishToday() {
  expect((await call(startRoute, "/api/run/start", "POST")).status).toBe(200);
  expect((await call(answerRoute, "/api/run/answer", "POST", { index: 0, text: hostName(puzzle, 0) })).body.run.status).toBe("died");
}

beforeAll(async () => {
  useLocalStack();
  today = (await getPool().query<{ today: string }>("select private.today()::text as today")).rows[0].today;
  puzzle = await ensurePuzzle(today);
});

afterAll(async () => {
  // Deleting the auth users cascades to memberships, runs, comments, reactions, requests and blocks, and the last
  // member's going deletes the group; then the fixture puzzle goes.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeFixtures();
  await getPool().end();
});

describe("blocking", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in three players, all in Club; A and B are friends, and both finish, comment and react", async () => {
    for (const p of [A, B, C]) {
      p.session = (await signIn(p.email)).session;
      expect((await call(createProfile, "/api/profile", "POST", { username: p.username })).status).toBe(201);
      p.userId = (await getPool().query<{ id: string }>("select id from auth.users where email = $1", [p.email])).rows[0].id;
    }
    await getPool().query("insert into auth.users (id, email) values ($1, $2)", [E.userId, `${RUN}-ke@example.test`]);
    await getPool().query("insert into private.profile (user_id, username) values ($1, $2)", [E.userId, E.username]);
    club = (await createGroup(getPool(), A.userId, "Club")).id;
    const code = (await getGroup(getPool(), A.userId, club)).inviteCode;
    await joinGroup(getPool(), B.userId, code);
    await joinGroup(getPool(), C.userId, code);
    await getPool().query(
      "insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))",
      [A.userId, B.userId],
    );

    useSession(B.session);
    await finishToday();
    expect((await post("friends from b")).status).toBe(201);
    ids.bClub = (await post("club from b", club)).body.comment.id;
    useSession(A.session);
    await finishToday();
    expect((await post("friends from a")).status).toBe(201);
    ids.aClub = (await post("club from a", club)).body.comment.id;
    expect((await react(ids.bClub, "👍")).status).toBe(200);
    useSession(B.session);
    expect((await react(ids.aClub, "😂")).status).toBe(200);
  });

  it("before any block: friends see each other everywhere, and a group member's preview counts everyone", async () => {
    useSession(A.session);
    expect((await lists()).friends).toEqual([B.username]);
    expect(await boardFriends()).toEqual([B.username]);
    expect(await weekOf(friendsBoard, "/api/leaderboard?game=offbeat")).toEqual([A.username, B.username].toSorted());
    expect(await seen(`?group=${club}`)).toEqual([
      ["club from b", [{ emoji: "👍", count: 1 }]],
      ["club from a", [{ emoji: "😂", count: 1 }]],
    ]);
    expect(await seen()).toEqual([
      ["friends from b", []],
      ["friends from a", []],
    ]);
    expect((await feed()).comments.map((c: Comment) => c.body)).toEqual(["friends from b", "club from b", "friends from a", "club from a"]);
    useSession(B.session);
    expect(await boardFriends()).toEqual([A.username]);
    useSession(C.session);
    expect((await feed()).preview).toEqual({ friends: [], others: 2, count: 2, reactions: 2 });
  });

  it("drops a blocked player's comments and reactions from the preview of a viewer whose run isn't over (12)", async () => {
    useSession(C.session);
    expect(await to(block, "block", B.username)).toEqual(ok);
    // B's club comment goes, with A's reaction on it; A's stays, without B's reaction on it.
    expect(await feed()).toMatchObject({ comments: null, preview: { friends: [], others: 1, count: 1, reactions: 0 } });
  });

  it("refuses a block of oneself and of a username nobody has; blocking twice is one block", async () => {
    useSession(A.session);
    expect(await to(block, "block", A.username)).toEqual({ status: 409, body: { ok: false, error: "block_own" } });
    expect(await to(block, "block", `nobody${RUN}`)).toEqual({ status: 404, body: { ok: false, error: "player_not_found" } });
    expect(await to(block, "block", 7)).toEqual({ status: 400, body: { ok: false, error: "bad_request" } });
    expect(await blockedList()).toEqual([]);
    expect(await to(block, "block", B.username)).toEqual(ok);
    expect(await to(block, "block", B.username)).toEqual(ok);
    expect(await blockedList()).toEqual([B.username]);
    useSession(B.session);
    expect(await blockedList()).toEqual([]);
  });

  // Each a test, not a loop: the linter reads useSession as a React hook.
  it.each([
    ["the blocker", A],
    ["the blocked player", B],
  ] as const)("ends the friendship: %s has no friend, on the list, the board or the friends leaderboard, at once (20)", async (_, me) => {
    useSession(me.session);
    expect((await lists()).friends).toEqual([]);
    expect(await boardFriends()).toEqual([]);
    expect(await weekOf(friendsBoard, "/api/leaderboard?game=offbeat")).toEqual([me.username]);
  });

  it("hides the pair's comments and reactions from each other, in the thread, the feed and the reaction reads (12)", async () => {
    useSession(A.session);
    expect(await seen(`?group=${club}`)).toEqual([["club from a", []]]);
    expect(await seen()).toEqual([["friends from a", []]]);
    expect((await feed()).comments.map((c: Comment) => [c.body, c.reactions.counts])).toEqual([
      ["friends from a", []],
      ["club from a", []],
    ]);
    expect(await react(ids.bClub, "😂")).toEqual(commentNotFound);
    expect(await call(reportRoute, "/api/comments/report", "POST", { id: ids.bClub })).toEqual(commentNotFound);
    useSession(B.session);
    expect(await seen(`?group=${club}`)).toEqual([["club from b", []]]);
    expect(await seen()).toEqual([["friends from b", []]]);
    expect((await feed()).comments.map((c: Comment) => [c.body, c.reactions.counts])).toEqual([
      ["friends from b", []],
      ["club from b", []],
    ]);
    expect(await react(ids.aClub, "👍")).toEqual(commentNotFound);
    expect(await call(reportRoute, "/api/comments/report", "POST", { id: ids.aClub })).toEqual(commentNotFound);
  });

  it.each([
    ["the blocker", A],
    ["the blocked player", B],
    ["another member", C],
  ] as const)("keeps both players on the shared group's leaderboard, as %s sees it (12)", async (_, me) => {
    useSession(me.session);
    expect(await weekOf(groupBoard, `/api/groups/leaderboard?id=${club}&game=offbeat`)).toEqual([A.username, B.username, C.username].toSorted());
  });

  it("is silent: the blocked player's send, sent list and cancel read as if the blocker hadn't answered (13, 28)", async () => {
    useSession(B.session);
    const toBlocker = await to(send, "requests", A.username);
    const toStranger = await to(send, "requests", E.username);
    expect(toBlocker).toEqual(sent);
    expect(JSON.stringify(toBlocker)).toBe(JSON.stringify(toStranger));
    const mine = (await call(friends, "/api/friends", "GET")).body;
    expect(mine.sent.toSorted((x: { username: string }, y: { username: string }) => x.username.localeCompare(y.username))).toEqual([
      { username: A.username, name: A.username },
      { username: E.username, name: E.username },
    ]);
    expect(JSON.stringify(mine)).not.toMatch(/block/i);
    // The blocker sees nothing of it.
    useSession(A.session);
    expect(await lists()).toEqual({ friends: [], requests: [], sent: [] });
    expect(await waiting()).toBe(0);
    expect(await to(accept, "requests/accept", B.username)).toEqual(requestNotFound);
    expect(await to(decline, "requests/decline", B.username)).toEqual(requestNotFound);
    // Nothing expires it: 31 days on (past 17b's 30-day hold) it still waits in the sender's list.
    await getPool().query("update private.friend_request set created_at = created_at - interval '31 days' where sender = $1", [B.userId]);
    useSession(B.session);
    expect((await lists()).sent.toSorted()).toEqual([A.username, E.username].toSorted());
    // Cancelling and sending again read the same for both.
    expect(JSON.stringify(await to(cancel, "requests/cancel", A.username))).toBe(JSON.stringify(await to(cancel, "requests/cancel", E.username)));
    expect(await to(send, "requests", A.username)).toEqual(sent);
  });

  it("makes no friends through an invite link while a block is on: the link reads as one that has gone (29, 13)", async () => {
    const gone = { status: 404, body: { ok: false, error: "invite_invalid" } };
    useSession(A.session);
    const codeA = (await call(invite, "/api/friends/invite", "POST", {})).body.inviteCode;
    useSession(B.session);
    const codeB = (await call(invite, "/api/friends/invite", "POST", {})).body.inviteCode;
    expect(await call(add, "/api/friends/add", "POST", { code: codeA })).toEqual(gone);
    useSession(A.session);
    expect(await call(add, "/api/friends/add", "POST", { code: codeB })).toEqual(gone);
    expect((await lists()).friends).toEqual([]);
  });

  it("refuses the blocker's own request until they unblock (29)", async () => {
    useSession(A.session);
    expect(await to(send, "requests", B.username)).toEqual({ status: 409, body: { ok: false, error: "unblock_first" } });
    const { rows } = await getPool().query("select from private.friend_request where sender = $1 and receiver = $2", [A.userId, B.userId]);
    expect(rows).toEqual([]);
  });

  it("unblocks from the blocked list, restoring no friendship and no request (21, D2)", async () => {
    useSession(A.session);
    expect(await blockedList()).toEqual([B.username]);
    expect(await to(unblock, "unblock", B.username)).toEqual(ok);
    expect(await blockedList()).toEqual([]);
    expect(await lists()).toEqual({ friends: [], requests: [], sent: [] });
    const notBlocked = { status: 404, body: { ok: false, error: "not_blocked" } };
    expect(await to(unblock, "unblock", B.username)).toEqual(notBlocked);
    expect(await to(unblock, "unblock", `nobody${RUN}`)).toEqual(notBlocked);
    // The blocked player's hidden request went with the block: it leaves their sent list, as after a decline.
    useSession(B.session);
    expect(await lists()).toEqual({ friends: [], requests: [], sent: [] });
    // The pair see each other's group comments again, and C's block of B still stands.
    expect((await seen(`?group=${club}`)).map(([body]) => body)).toEqual(["club from b", "club from a"]);
    useSession(C.session);
    expect(await blockedList()).toEqual([B.username]);
  });

  it("after the unblock, the same send succeeds and reaches the other player, both ways (21, 29)", async () => {
    useSession(A.session);
    expect(await to(send, "requests", B.username)).toEqual(sent);
    useSession(B.session);
    expect((await lists()).requests).toEqual([A.username]);
    expect(await to(decline, "requests/decline", A.username)).toEqual(ok);
    expect(await to(send, "requests", A.username)).toEqual(sent);
    useSession(A.session);
    expect((await lists()).requests).toEqual([B.username]);
    expect(await waiting()).toBe(1);
  });

  it("decline and block: the waiting request leaves the blocker's list and count, and stays pending for its sender (5, 28, 29)", async () => {
    useSession(A.session);
    expect(await to(block, "block", B.username)).toEqual(ok);
    expect(await lists()).toEqual({ friends: [], requests: [], sent: [] });
    expect(await waiting()).toBe(0);
    useSession(B.session);
    expect((await lists()).sent).toEqual([A.username]);
    useSession(A.session);
    expect(await to(unblock, "unblock", B.username)).toEqual(ok);
  });

  it("a block takes back the blocker's own pending request (D3)", async () => {
    useSession(A.session);
    expect(await to(send, "requests", B.username)).toEqual(sent);
    useSession(B.session);
    expect((await lists()).requests).toEqual([A.username]);
    useSession(A.session);
    expect(await to(block, "block", B.username)).toEqual(ok);
    expect((await lists()).sent).toEqual([]);
    useSession(B.session);
    expect(await lists()).toEqual({ friends: [], requests: [], sent: [] });
    expect(await to(accept, "requests/accept", A.username)).toEqual(requestNotFound);
  });
});
