// Search and profiles end to end against the local Supabase stack (`npx supabase start`; run with `npm run test:db`):
// real players sign in with emailed codes, and the route handlers run with a cookie jar standing in for the browser
// (docs/milestones/M17-profiles-and-friend-requests.md, 17b). What a profile's numbers hold is the Me page's own
// read (src/game/me.ts), tested in ../../me/route.db.test.ts; here a profile is compared with that player's Me.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AUTH_LIMITS, STATS_CHART_DAYS } from "@/config/tunables";
import { hashKey } from "@/lib/auth-limits";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { POST as block } from "../../friends/block/route";
import { POST as accept } from "../../friends/requests/accept/route";
import { POST as send } from "../../friends/requests/route";
import { POST as unblock } from "../../friends/unblock/route";
import { GET as meRoute } from "../../me/route";
import { POST as createProfile } from "../../profile/route";
import { POST as rename } from "../../profile/username/route";
import { GET as playerRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, userId: "", session: new Map<string, string>() });
const A = player("pa");
const B = player("pb");
const C = player("pc");
// D signs in but picks no username until the hold tests.
const D = player("pd");
// B's username after the rename, and a name nobody has.
const B_NEW = `pn${RUN}`;
const NOBODY = `nobody${RUN}`;

async function json(response: Response) {
  return { status: response.status, body: await response.json() };
}
const lookup = async (username: string) =>
  json(await playerRoute(apiRequest(`/api/players/${encodeURIComponent(username)}`, { method: "GET" }), { params: Promise.resolve({ username }) }));
const post = async (route: (r: Request) => Promise<Response>, path: string, username: string) =>
  json(await route(apiRequest(path, { method: "POST", body: { username } })));
const me = async () => (await json(await meRoute(apiRequest("/api/me", { method: "GET" })))).body.me;
const notFound = { status: 404, body: { ok: false, error: "player_not_found" } };
const tooMany = { status: 429, body: { ok: false, error: "too_many_attempts" } };
const taken = { status: 409, body: { ok: false, error: "username_taken" } };
const SHORT = ["name", "offbeat", "relation", "totals", "username"];
const lookupsOf = async (userId: string) =>
  (await getPool().query<{ n: number }>("select count(*)::int as n from private.auth_attempt where kind = 'lookup' and key = $1", [hashKey(userId)])).rows[0].n;
// The hold's end, moved as the test's clock: `left` is how much of the 30 days remains.
const holdLeft = (username: string, left: string) =>
  getPool().query("update private.held_username set held_until = statement_timestamp() + $2::interval where username = $1", [username, left]);

beforeAll(useLocalStack);

afterAll(async () => {
  // Deleting the auth users cascades to profiles, held names, requests, blocks and friendships.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().query("delete from private.auth_attempt where kind = 'lookup' and key = any($1)", [[A, B, C, D].map((p) => hashKey(p.userId))]);
  await getPool().end();
});

describe("players", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in four players, three of them with usernames", async () => {
    for (const p of [A, B, C, D]) {
      p.session = (await signIn(p.email)).session;
      if (p !== D) expect((await post(createProfile, "/api/profile", p.username)).status).toBe(201);
      p.userId = (await getPool().query<{ id: string }>("select id from auth.users where email = $1", [p.email])).rows[0].id;
    }
    await getPool().query("update private.profile set display_name = $2 where user_id = $1", [B.userId, `Bee ${RUN}`]);
  });

  it("finds a player by their exact username only, and nobody when signed out or without a username (3)", async () => {
    useSession(A.session);
    expect(await lookup(B.username)).toMatchObject({ status: 200, body: { ok: true, player: { username: B.username, name: `Bee ${RUN}` } } });
    for (const name of [B.username.slice(0, -1), `Bee ${RUN}`, B.username.toUpperCase(), " ", NOBODY]) expect(await lookup(name)).toEqual(notFound);
    useSession(new Map());
    expect(await lookup(B.username)).toEqual({ status: 401, body: { ok: false, error: "not_signed_in" } });
    useSession(D.session);
    expect(await lookup(B.username)).toEqual({ status: 409, body: { ok: false, error: "no_profile" } });
  });

  it("shows a stranger the name, the totals and the game's card, and nothing else (1, 4, 11)", async () => {
    useSession(B.session);
    const own = await me();
    useSession(A.session);
    const { body } = await lookup(B.username);
    expect(body.player).toEqual({ username: B.username, name: `Bee ${RUN}`, relation: "none", totals: own.totals, offbeat: own.offbeat });
  });

  it("tells the viewer how they stand to the player: a request sent, one received, then friends", async () => {
    useSession(A.session);
    expect((await post(send, "/api/friends/requests", B.username)).status).toBe(200);
    expect((await lookup(B.username)).body.player.relation).toBe("sent");
    useSession(B.session);
    const received = (await lookup(A.username)).body.player;
    expect(received.relation).toBe("received");
    expect(Object.keys(received).sort()).toEqual(SHORT);
    expect((await post(accept, "/api/friends/requests/accept", A.username)).status).toBe(200);
    expect((await lookup(A.username)).body.player.relation).toBe("friend");
  });

  it("shows a friend, and the player themself, what the Me page shows, with the last days' chart (1, 2, 25)", async () => {
    useSession(B.session);
    const own = await me();
    const mine = (await lookup(B.username)).body.player;
    useSession(A.session);
    const theirs = (await lookup(B.username)).body.player;
    const full = { username: B.username, name: `Bee ${RUN}`, totals: own.totals, offbeat: own.offbeat, since: own.since, month: own.month, rarest: own.rarest };
    expect(theirs).toEqual({ ...full, relation: "friend", recent: theirs.recent });
    expect(mine).toEqual({ ...full, relation: "self", recent: theirs.recent });
    expect(theirs.recent).toHaveLength(STATS_CHART_DAYS);
    expect(theirs.recent.at(-1).date).toBe(own.month.today);
  });

  it("counts a lookup against the viewer, found or not, but not their own name or a friend's (15, E2)", async () => {
    useSession(A.session);
    const before = await lookupsOf(A.userId);
    await lookup(A.username);
    await lookup(B.username);
    expect(await lookupsOf(A.userId)).toBe(before);
    await lookup(C.username);
    await lookup(NOBODY);
    await lookup("Not A Name");
    expect(await lookupsOf(A.userId)).toBe(before + 3);
  });

  it("finds nobody for a player the other has blocked, the same answer as a name nobody has (13, 24)", async () => {
    useSession(A.session);
    expect((await post(block, "/api/friends/block", C.username)).status).toBe(200);
    expect((await lookup(C.username)).body.player).toMatchObject({ username: C.username, relation: "blocked" });
    useSession(C.session);
    const blocked = await lookup(A.username);
    expect(blocked).toEqual(await lookup(NOBODY));
    expect(blocked).toEqual(notFound);
  });

  it("after an unblock, opens again as a stranger's profile (21)", async () => {
    useSession(A.session);
    expect((await post(unblock, "/api/friends/unblock", C.username)).status).toBe(200);
    useSession(C.session);
    const { body } = await lookup(A.username);
    expect(body.player.relation).toBe("none");
    expect(Object.keys(body.player).sort()).toEqual(SHORT);
  });

  it("keeps a renamed player's old name opening their profile, under the same viewing rules (10)", async () => {
    useSession(B.session);
    expect(await post(rename, "/api/profile/username", B_NEW)).toEqual({ status: 200, body: { ok: true, username: B_NEW } });
    useSession(A.session);
    expect((await lookup(B.username)).body.player).toMatchObject({ username: B_NEW, relation: "friend", since: expect.any(String) });
    expect((await lookup(B_NEW)).body.player).toMatchObject({ username: B_NEW, relation: "friend" });
    useSession(C.session);
    const old = (await lookup(B.username)).body.player;
    expect(old).toMatchObject({ username: B_NEW, relation: "none" });
    expect(Object.keys(old).sort()).toEqual(SHORT);
  });

  it("gives a blocked player the same nothing at the old name (10, 13)", async () => {
    useSession(B.session);
    expect((await post(block, "/api/friends/block", C.username)).status).toBe(200);
    useSession(C.session);
    expect(await lookup(B.username)).toEqual(notFound);
    expect(await lookup(B_NEW)).toEqual(notFound);
    useSession(B.session);
    expect((await post(unblock, "/api/friends/unblock", C.username)).status).toBe(200);
  });

  it("holds the old name from everyone for 30 days: a rename, a sign-up, and the player who gave it up (10, 22)", async () => {
    useSession(C.session);
    expect(await post(rename, "/api/profile/username", B.username)).toEqual(taken);
    useSession(D.session);
    expect(await post(createProfile, "/api/profile", B.username)).toEqual(taken);
    // The 30-day rule would refuse B first; with it out of the way, the hold alone does.
    await getPool().query("update private.profile set username_changed_at = username_changed_at - interval '31 days' where user_id = $1", [B.userId]);
    useSession(B.session);
    expect(await post(rename, "/api/profile/username", B.username)).toEqual(taken);
    expect((await getPool().query("select from private.profile where user_id = $1 and username = $2", [B.userId, B_NEW])).rowCount).toBe(1);
  });

  it("refuses the name on day 29 and frees it on day 30", async () => {
    await holdLeft(B.username, "1 day");
    useSession(D.session);
    expect(await post(createProfile, "/api/profile", B.username)).toEqual(taken);
    await holdLeft(B.username, "0");
    expect(await post(createProfile, "/api/profile", B.username)).toEqual({ status: 201, body: { ok: true, username: B.username } });
    // The name now opens its new owner's profile, not the player who gave it up.
    useSession(A.session);
    expect((await lookup(B.username)).body.player).toMatchObject({ username: B.username, name: B.username, relation: "none" });
  });

  it(`allows ${AUTH_LIMITS.lookup.limit} lookups and requests in an hour and refuses the next, each player on their own count (15, 16, D1)`, async () => {
    await getPool().query("delete from private.auth_attempt where kind = 'lookup' and key = $1", [hashKey(C.userId)]);
    useSession(C.session);
    expect((await lookup(A.username)).status).toBe(200);
    expect((await post(send, "/api/friends/requests", A.username)).status).toBe(200);
    for (let i = 2; i < AUTH_LIMITS.lookup.limit; i++) expect(await lookup(NOBODY)).toEqual(notFound);
    expect(await lookupsOf(C.userId)).toBe(AUTH_LIMITS.lookup.limit);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      // Found, not found and a request are refused alike, so a refusal tells nothing about the name.
      expect(await lookup(A.username)).toEqual(tooMany);
      expect(await lookup(NOBODY)).toEqual(tooMany);
      expect(await post(send, "/api/friends/requests", B_NEW)).toEqual(tooMany);
      const line = JSON.parse(warn.mock.calls.at(-1)![0] as string);
      expect(line).toMatchObject({ level: "warn", msg: "attempt refused", kind: "lookup", key: hashKey(C.userId).slice(0, 8) });
      for (const secret of [C.username, B_NEW, C.email, C.userId]) expect(JSON.stringify(warn.mock.calls)).not.toContain(secret);
    } finally {
      warn.mockRestore();
    }
    expect(await lookupsOf(C.userId)).toBe(AUTH_LIMITS.lookup.limit);
    // Their own profile still opens, and another player's lookups are their own.
    expect((await lookup(C.username)).status).toBe(200);
    useSession(A.session);
    expect((await lookup(C.username)).status).toBe(200);
  });

  it("counts again once an attempt is an hour old", async () => {
    await getPool().query(
      `update private.auth_attempt set at = at - make_interval(secs => $2)
       where ctid = (select min(ctid) from private.auth_attempt where kind = 'lookup' and key = $1)`,
      [hashKey(C.userId), AUTH_LIMITS.lookup.windowSeconds],
    );
    useSession(C.session);
    expect(await lookup(NOBODY)).toEqual(notFound);
    expect(await lookup(NOBODY)).toEqual(tooMany);
  });
});
