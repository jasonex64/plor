// The friends list and Remove end to end against the local Supabase stack (`npx supabase start`; run with
// `npm run test:db`): real players sign in with emailed codes, and the route handlers run with a cookie jar standing
// in for the browser (docs/milestones/M07-friends-and-live-board.md, 7b). The two become friends by a
// friend request, whose own rules are in requests/route.db.test.ts (M17 17a; friend invite links ended in 17c).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { POST as setDisplayName } from "../profile/display-name/route";
import { POST as createProfile } from "../profile/route";
import { POST as remove } from "./remove/route";
import { POST as accept } from "./requests/accept/route";
import { POST as send } from "./requests/route";
import { GET as friends } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const A = { email: `${RUN}-fa@example.test`, username: `fa${RUN}`, session: new Map<string, string>() };
const B = { email: `${RUN}-fb@example.test`, username: `fb${RUN}`, session: new Map<string, string>() };

async function call(route: (r: Request) => Promise<Response>, path: string, method: "GET" | "POST", body?: unknown) {
  const response = await route(apiRequest(path, { method, body }));
  return { status: response.status, body: await response.json() };
}

beforeAll(useLocalStack);

afterAll(async () => {
  // Deleting the auth users cascades to profiles and friendships (supabase/tests/friends.test.sql).
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().end();
});

describe("friends list", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in two players with usernames", async () => {
    for (const player of [A, B]) {
      player.session = (await signIn(player.email)).session;
      expect((await call(createProfile, "/api/profile", "POST", { username: player.username })).status).toBe(201);
    }
  });

  it("has no friends at first", async () => {
    useSession(A.session);
    expect(await call(friends, "/api/friends", "GET")).toEqual({ status: 200, body: { ok: true, friends: [], requests: [], sent: [] } });
  });

  it("lists each to the other once B accepts A's request, by display name once one is set (7a's check, carried into 7b)", async () => {
    useSession(A.session);
    expect((await call(setDisplayName, "/api/profile/display-name", "POST", { displayName: "Ana" })).status).toBe(200);
    expect((await call(send, "/api/friends/requests", "POST", { username: B.username })).status).toBe(200);
    useSession(B.session);
    expect((await call(accept, "/api/friends/requests/accept", "POST", { username: A.username })).status).toBe(200);
    expect((await call(friends, "/api/friends", "GET")).body.friends).toEqual([{ username: A.username, name: "Ana" }]);
    useSession(A.session);
    // B has no display name, so A sees B's username.
    expect((await call(friends, "/api/friends", "GET")).body.friends).toEqual([{ username: B.username, name: B.username }]);
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
