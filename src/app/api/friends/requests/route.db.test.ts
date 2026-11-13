// Friend requests end to end against the local Supabase stack (`npx supabase start`; run with `npm run test:db`):
// real players sign in with emailed codes, and the route handlers run with a cookie jar standing in for the browser
// (docs/milestones/M17-profiles-and-friend-requests.md, 17a). Blocking's own rules are in ../block/route.db.test.ts.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { POST as createProfile } from "../../profile/route";
import { POST as block } from "../block/route";
import { POST as remove } from "../remove/route";
import { GET as friends } from "../route";
import { POST as unblock } from "../unblock/route";
import { POST as accept } from "./accept/route";
import { POST as cancel } from "./cancel/route";
import { GET as count } from "./count/route";
import { POST as decline } from "./decline/route";
import { POST as send } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, userId: "", session: new Map<string, string>() });
const A = player("ra");
const B = player("rb");
const C = player("rc");
// D signs in but never picks a username.
const D = player("rd");

async function call(route: (r: Request) => Promise<Response>, path: string, method: "GET" | "POST", body?: unknown) {
  const response = await route(apiRequest(path, { method, body }));
  return { status: response.status, body: await response.json() };
}
const to = (route: (r: Request) => Promise<Response>, path: string, username: unknown) => call(route, `/api/friends/${path}`, "POST", { username });
const sendTo = (username: unknown) => to(send, "requests", username);
const lists = async () => {
  const { body } = await call(friends, "/api/friends", "GET");
  const names = (list: { username: string }[]) => list.map((p) => p.username);
  return { friends: names(body.friends), requests: names(body.requests), sent: names(body.sent) };
};
const waiting = async () => (await call(count, "/api/friends/requests/count", "GET")).body.count;
const ok = { status: 200, body: { ok: true } };
const sent = { status: 200, body: { ok: true, state: "sent" } };
const nowFriends = { status: 200, body: { ok: true, state: "friends" } };
const notFound = { status: 404, body: { ok: false, error: "request_not_found" } };
const none = { friends: [], requests: [], sent: [] };

// Players who never sign in: an auth user and a profile each, written as the owner.
async function makePlayers(tag: string, n: number): Promise<{ userId: string; username: string }[]> {
  const made = Array.from({ length: n }, (_, i) => ({ userId: randomUUID(), username: `${tag}${i}x${RUN}` }));
  for (const p of made) {
    await getPool().query("insert into auth.users (id, email) values ($1, $2)", [p.userId, `${RUN}-${p.username}@example.test`]);
    await getPool().query("insert into private.profile (user_id, username) values ($1, $2)", [p.userId, p.username]);
  }
  return made;
}

beforeAll(useLocalStack);

afterAll(async () => {
  // Deleting the auth users cascades to profiles, requests, blocks and friendships (supabase/tests/friend_requests.test.sql).
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().end();
});

describe("friend requests", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in four players, three of them with usernames", async () => {
    for (const p of [A, B, C, D]) {
      p.session = (await signIn(p.email)).session;
      if (p !== D) expect((await call(createProfile, "/api/profile", "POST", { username: p.username })).status).toBe(201);
      p.userId = (await getPool().query<{ id: string }>("select id from auth.users where email = $1", [p.email])).rows[0].id;
    }
  });

  it("has no requests at first", async () => {
    useSession(A.session);
    expect(await call(friends, "/api/friends", "GET")).toEqual({
      status: 200,
      body: { ok: true, inviteCode: null, friends: [], requests: [], sent: [] },
    });
    expect(await call(count, "/api/friends/requests/count", "GET")).toEqual({ status: 200, body: { ok: true, count: 0 } });
  });

  it("sends a pending request the receiver sees, once however often it is sent (5)", async () => {
    useSession(A.session);
    expect(await sendTo(B.username)).toEqual(sent);
    expect(await sendTo(B.username)).toEqual(sent);
    expect(await lists()).toEqual({ friends: [], requests: [], sent: [B.username] });
    useSession(B.session);
    expect(await call(friends, "/api/friends", "GET")).toMatchObject({ body: { requests: [{ username: A.username, name: A.username }] } });
    expect(await lists()).toEqual({ friends: [], requests: [A.username], sent: [] });
    expect(await waiting()).toBe(1);
  });

  it("refuses a request to oneself, to a username nobody has, from a player with no username, and a body with no username", async () => {
    useSession(A.session);
    expect(await sendTo(A.username)).toEqual({ status: 409, body: { ok: false, error: "request_own" } });
    expect(await sendTo(A.username.toUpperCase())).toEqual({ status: 409, body: { ok: false, error: "request_own" } });
    expect(await sendTo(`nobody${RUN}`)).toEqual({ status: 404, body: { ok: false, error: "player_not_found" } });
    expect(await sendTo(7)).toEqual({ status: 400, body: { ok: false, error: "bad_request" } });
    useSession(D.session);
    expect(await sendTo(A.username)).toEqual({ status: 409, body: { ok: false, error: "no_profile" } });
    useSession(A.session);
    expect((await lists()).sent).toEqual([B.username]);
  });

  it("makes both players friends on accept, and leaves no request behind (5)", async () => {
    useSession(A.session);
    // Only the receiver can accept it.
    expect(await to(accept, "requests/accept", B.username)).toEqual(notFound);
    useSession(B.session);
    expect(await to(accept, "requests/accept", A.username)).toEqual(ok);
    expect(await lists()).toEqual({ friends: [A.username], requests: [], sent: [] });
    expect(await waiting()).toBe(0);
    expect(await to(accept, "requests/accept", A.username)).toEqual(notFound);
    useSession(A.session);
    expect(await lists()).toEqual({ friends: [B.username], requests: [], sent: [] });
    expect(await sendTo(B.username)).toEqual({ status: 409, body: { ok: false, error: "already_friends" } });
    expect((await call(remove, "/api/friends/remove", "POST", { username: B.username })).status).toBe(200);
  });

  it("removes a declined request from both lists, with no friendship and no declined state (5, 23)", async () => {
    useSession(A.session);
    expect(await sendTo(B.username)).toEqual(sent);
    // The sender can't decline their own request.
    expect(await to(decline, "requests/decline", B.username)).toEqual(notFound);
    useSession(B.session);
    expect(await to(decline, "requests/decline", A.username)).toEqual(ok);
    expect(await lists()).toEqual(none);
    expect(await to(decline, "requests/decline", A.username)).toEqual(notFound);
    useSession(A.session);
    const mine = await call(friends, "/api/friends", "GET");
    expect(mine.body).toEqual({ ok: true, inviteCode: null, friends: [], requests: [], sent: [] });
    expect(JSON.stringify(mine.body)).not.toMatch(/declin/i);
  });

  it("lets the sender cancel a request, which empties both lists (23)", async () => {
    useSession(A.session);
    expect(await sendTo(B.username)).toEqual(sent);
    expect((await lists()).sent).toEqual([B.username]);
    useSession(B.session);
    // The receiver can't cancel it.
    expect(await to(cancel, "requests/cancel", A.username)).toEqual(notFound);
    useSession(A.session);
    expect(await to(cancel, "requests/cancel", B.username)).toEqual(ok);
    expect(await lists()).toEqual(none);
    expect(await to(cancel, "requests/cancel", B.username)).toEqual(notFound);
    expect(await to(cancel, "requests/cancel", `nobody${RUN}`)).toEqual(notFound);
    useSession(B.session);
    expect(await lists()).toEqual(none);
  });

  // Each a test, not a loop: the linter reads useSession as a React hook.
  it.each([1, 2, 3])("lets a declined sender ask again straight away, three times in a row: time %i (17)", async () => {
    useSession(A.session);
    expect(await sendTo(B.username)).toEqual(sent);
    useSession(B.session);
    expect((await lists()).requests).toEqual([A.username]);
    expect(await to(decline, "requests/decline", A.username)).toEqual(ok);
  });

  it("makes two players who request each other friends, with no request left and neither send refused (23)", async () => {
    useSession(A.session);
    expect(await sendTo(B.username)).toEqual(sent);
    useSession(B.session);
    expect(await sendTo(A.username)).toEqual(nowFriends);
    expect(await lists()).toEqual({ friends: [A.username], requests: [], sent: [] });
    useSession(A.session);
    expect(await lists()).toEqual({ friends: [B.username], requests: [], sent: [] });
    expect((await call(remove, "/api/friends/remove", "POST", { username: B.username })).status).toBe(200);
  });

  it.each([
    ["A has blocked B and sends first", A, B, true],
    ["A has blocked B and sends second", A, B, false],
    ["B has blocked A and sends first", B, A, true],
    ["B has blocked A and sends second", B, A, false],
  ] as const)("makes no friendship from mutual requests while %s (29)", async (_, blocker, blocked, blockerFirst) => {
    const unblockFirst = { status: 409, body: { ok: false, error: "unblock_first" } };
    useSession(blocker.session);
    expect(await to(block, "block", blocked.username)).toEqual(ok);
    if (blockerFirst) expect(await sendTo(blocked.username)).toEqual(unblockFirst);
    useSession(blocked.session);
    expect(await sendTo(blocker.username)).toEqual(sent);
    useSession(blocker.session);
    if (!blockerFirst) expect(await sendTo(blocked.username)).toEqual(unblockFirst);
    expect(await lists()).toEqual(none);
    useSession(blocked.session);
    expect(await lists()).toEqual({ friends: [], requests: [], sent: [blocker.username] });
    useSession(blocker.session);
    expect(await to(unblock, "unblock", blocked.username)).toEqual(ok);
    const { rows } = await getPool().query(
      "select from private.friend_request where $1::uuid in (sender, receiver) and $2::uuid in (sender, receiver)",
      [A.userId, B.userId],
    );
    expect(rows).toEqual([]);
  });

  it("puts no cap on pending requests: 25 sends to 25 players all succeed (16; 25 is the test's size, not a limit)", async () => {
    const others = await makePlayers("cap", 25);
    useSession(A.session);
    for (const p of others) expect(await sendTo(p.username)).toEqual(sent);
    expect((await lists()).sent.toSorted()).toEqual(others.map((p) => p.username).toSorted());
    await getPool().query("delete from private.friend_request where sender = $1", [A.userId]);
  });

  it("counts the requests waiting for the viewer, not blocked senders' nor their own, and sends nothing live (14)", async () => {
    const [E] = await makePlayers("cnt", 1);
    const live = async () =>
      (await getPool().query<{ n: number }>("select count(*)::int as n from realtime.messages where topic = $1", [`board:${C.userId}`])).rows[0].n;
    const before = await live();
    useSession(A.session);
    expect(await sendTo(C.username)).toEqual(sent);
    useSession(B.session);
    expect(await sendTo(C.username)).toEqual(sent);
    await getPool().query("insert into private.friend_request (sender, receiver) values ($1, $2)", [E.userId, C.userId]);
    expect(await live()).toBe(before);

    useSession(C.session);
    const [D2] = await makePlayers("out", 1);
    expect(await sendTo(D2.username)).toEqual(sent);
    expect((await lists()).requests.toSorted()).toEqual([A.username, B.username, E.username].toSorted());
    expect(await waiting()).toBe(3);
    expect(await to(decline, "requests/decline", E.username)).toEqual(ok);
    expect(await waiting()).toBe(2);
    expect(await to(block, "block", B.username)).toEqual(ok);
    expect(await waiting()).toBe(1);
    expect((await lists()).requests).toEqual([A.username]);
    // The blocked sender's request can't be accepted or declined: it stays as it was for them (28).
    expect(await to(accept, "requests/accept", B.username)).toEqual(notFound);
    expect(await to(decline, "requests/decline", B.username)).toEqual(notFound);
    useSession(B.session);
    expect((await lists()).sent).toEqual([C.username]);
    expect(await live()).toBe(before);
  });
});
