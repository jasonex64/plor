// Invite links and friends end to end against the local Supabase stack (`npx supabase start`; run with
// `npm run test:db`): real players sign in with emailed codes, and the route handlers run with a cookie jar standing
// in for the browser (docs/milestones/M07-friends-and-live-board.md, 7b).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { POST as setDisplayName } from "../profile/display-name/route";
import { POST as createProfile } from "../profile/route";
import { POST as add } from "./add/route";
import { POST as invite } from "./invite/route";
import { GET as preview } from "./preview/route";
import { POST as remove } from "./remove/route";
import { GET as friends } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const A = { email: `${RUN}-fa@example.test`, username: `fa${RUN}`, session: new Map<string, string>() };
const B = { email: `${RUN}-fb@example.test`, username: `fb${RUN}`, session: new Map<string, string>() };
// C signs in but never picks a username.
const C = { email: `${RUN}-fc@example.test`, session: new Map<string, string>() };

async function call(route: (r: Request) => Promise<Response>, path: string, method: "GET" | "POST", body?: unknown) {
  const response = await route(apiRequest(path, { method, body }));
  return { status: response.status, body: await response.json() };
}

beforeAll(useLocalStack);

afterAll(async () => {
  // Deleting the auth users cascades to profiles, codes and friendships (supabase/tests/friends.test.sql).
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().end();
});

describe("invite links and friends", () => {
  let codeA = "";

  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in three players, two of them with usernames", async () => {
    for (const player of [A, B]) {
      player.session = (await signIn(player.email)).session;
      expect((await call(createProfile, "/api/profile", "POST", { username: player.username })).status).toBe(201);
    }
    C.session = (await signIn(C.email)).session;
  });

  it("has no code and no friends at first", async () => {
    useSession(A.session);
    expect(await call(friends, "/api/friends", "GET")).toEqual({ status: 200, body: { ok: true, inviteCode: null, friends: [] } });
  });

  it("makes a code once, then returns the same one", async () => {
    useSession(A.session);
    const first = await call(invite, "/api/friends/invite", "POST", {});
    expect(first.status).toBe(200);
    codeA = first.body.inviteCode;
    expect(codeA).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect((await call(invite, "/api/friends/invite", "POST", {})).body.inviteCode).toBe(codeA);
    expect((await call(friends, "/api/friends", "GET")).body.inviteCode).toBe(codeA);
  });

  it("shows whose link it is, by display name once one is set (7a's check, carried into 7b)", async () => {
    useSession(A.session);
    expect((await call(setDisplayName, "/api/profile/display-name", "POST", { displayName: "Ana" })).status).toBe(200);
    useSession(B.session);
    expect(await call(preview, `/api/friends/preview?code=${codeA}`, "GET")).toEqual({
      status: 200,
      body: { ok: true, inviter: { username: A.username, name: "Ana" } },
    });
  });

  it("makes both players friends when B adds A's link", async () => {
    useSession(B.session);
    expect(await call(add, "/api/friends/add", "POST", { code: codeA })).toEqual({
      status: 200,
      body: { ok: true, friend: { username: A.username, name: "Ana" } },
    });
    expect((await call(friends, "/api/friends", "GET")).body.friends).toEqual([{ username: A.username, name: "Ana" }]);
    useSession(A.session);
    // B has no display name, so A sees B's username.
    expect((await call(friends, "/api/friends", "GET")).body.friends).toEqual([{ username: B.username, name: B.username }]);
  });

  it("refuses adding the same friend twice, your own link, and a player with no username", async () => {
    useSession(B.session);
    expect(await call(add, "/api/friends/add", "POST", { code: codeA })).toEqual({ status: 409, body: { ok: false, error: "already_friends" } });
    useSession(A.session);
    expect(await call(add, "/api/friends/add", "POST", { code: codeA })).toEqual({ status: 409, body: { ok: false, error: "invite_own" } });
    useSession(C.session);
    expect(await call(add, "/api/friends/add", "POST", { code: codeA })).toEqual({ status: 409, body: { ok: false, error: "no_profile" } });
    expect(await call(invite, "/api/friends/invite", "POST", {})).toEqual({ status: 409, body: { ok: false, error: "no_profile" } });
  });

  it("stops the old link working after a reset", async () => {
    useSession(A.session);
    const reset = (await call(invite, "/api/friends/invite", "POST", { reset: true })).body.inviteCode;
    expect(reset).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(reset).not.toBe(codeA);
    useSession(B.session);
    const gone = { status: 404, body: { ok: false, error: "invite_invalid" } };
    expect(await call(preview, `/api/friends/preview?code=${codeA}`, "GET")).toEqual(gone);
    expect(await call(add, "/api/friends/add", "POST", { code: codeA })).toEqual(gone);
    expect(await call(add, "/api/friends/add", "POST", { code: "not a code" })).toEqual(gone);
  });

  it("removes a friendship both ways, and only an existing one", async () => {
    useSession(A.session);
    expect(await call(remove, "/api/friends/remove", "POST", { username: B.username })).toEqual({ status: 200, body: { ok: true } });
    expect((await call(friends, "/api/friends", "GET")).body.friends).toEqual([]);
    useSession(B.session);
    expect((await call(friends, "/api/friends", "GET")).body.friends).toEqual([]);
    expect(await call(remove, "/api/friends/remove", "POST", { username: A.username })).toEqual({
      status: 404,
      body: { ok: false, error: "not_friends" },
    });
  });
});
