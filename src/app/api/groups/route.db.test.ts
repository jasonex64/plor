// Groups end to end against the local Supabase stack (`npx supabase start`; run with `npm run test:db`): real players
// sign in with emailed codes, and the route handlers run with a cookie jar standing in for the browser
// (docs/milestones/M10-groups.md, 10b).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GROUP_MAX_MEMBERS, GROUP_NAME_MAX_LENGTH, GROUPS_PER_PLAYER } from "@/config/tunables";
import { createGroup, joinGroup, leaveGroup } from "@/groups/groups";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { POST as setDisplayName } from "../profile/display-name/route";
import { POST as createProfile } from "../profile/route";
import { POST as create } from "./create/route";
import { POST as del } from "./delete/route";
import { GET as detail } from "./detail/route";
import { POST as invite } from "./invite/route";
import { POST as join } from "./join/route";
import { POST as leave } from "./leave/route";
import { GET as preview } from "./preview/route";
import { POST as remove } from "./remove/route";
import { POST as rename } from "./rename/route";
import { GET as groups } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, session: new Map<string, string>() });
const A = player("ga");
const B = player("gb");
const D = player("gd");
// C signs in but never picks a username.
const C = player("gc");

async function call(route: (r: Request) => Promise<Response>, path: string, method: "GET" | "POST", body?: unknown) {
  const response = await route(apiRequest(path, { method, body }));
  return { status: response.status, body: await response.json() };
}

const error = (status: number, code: string) => ({ status, body: { ok: false, error: code } });
const member = (p: { username: string }, creator: boolean, name = p.username) => ({ username: p.username, name, creator });

beforeAll(useLocalStack);

afterAll(async () => {
  // Deleting the auth users cascades to their memberships, and the last member's going deletes each group
  // (supabase/tests/groups.test.sql).
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().end();
});

describe("groups", () => {
  let club = "";
  let longName = "";
  let code = "";

  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in four players, three of them with usernames", async () => {
    for (const p of [A, B, D]) {
      p.session = (await signIn(p.email)).session;
      expect((await call(createProfile, "/api/profile", "POST", { username: p.username })).status).toBe(201);
    }
    C.session = (await signIn(C.email)).session;
  });

  it("creates a group with its creator as the only member, and checks the name rule (G1, G11)", async () => {
    useSession(A.session);
    expect(await call(groups, "/api/groups", "GET")).toEqual({ status: 200, body: { ok: true, groups: [] } });
    const created = await call(create, "/api/groups/create", "POST", { name: "  Book Club " });
    expect(created.status).toBe(201);
    club = created.body.group.id;
    expect(created.body.group).toEqual({ id: club, name: "Book Club" });

    const longest = "a".repeat(GROUP_NAME_MAX_LENGTH);
    longName = (await call(create, "/api/groups/create", "POST", { name: longest })).body.group.id;
    expect(longName).toBeTruthy();
    const invalid = error(400, "group_name_invalid");
    expect(await call(create, "/api/groups/create", "POST", { name: `${longest}a` })).toEqual(invalid);
    expect(await call(create, "/api/groups/create", "POST", { name: "" })).toEqual(invalid);
    expect(await call(create, "/api/groups/create", "POST", { name: 7 })).toEqual(invalid);
    expect(await call(groups, "/api/groups", "GET")).toEqual({
      status: 200,
      body: { ok: true, groups: [{ id: longName, name: longest }, { id: club, name: "Book Club" }] },
    });

    const page = await call(detail, `/api/groups/detail?id=${club}`, "GET");
    expect(page.status).toBe(200);
    // The time to the reset, when the page moves to the new day (M11 H6): within the next 25 hours (a time change).
    expect(page.body.msToReset).toBeGreaterThan(0);
    expect(page.body.msToReset).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
    code = page.body.group.inviteCode;
    expect(code).toMatch(/^[A-Za-z0-9_-]{10}$/);
    expect(page.body.group).toEqual({ id: club, name: "Book Club", inviteCode: code, creator: true, members: [member(A, true)] });

    useSession(C.session);
    expect(await call(create, "/api/groups/create", "POST", { name: "Club" })).toEqual(error(409, "no_profile"));
  });

  it("shows a group only to its members (G3)", async () => {
    useSession(B.session);
    expect(await call(detail, `/api/groups/detail?id=${club}`, "GET")).toEqual(error(404, "group_not_found"));
    expect(await call(detail, "/api/groups/detail?id=not-an-id", "GET")).toEqual(error(404, "group_not_found"));
  });

  it("joins by invite link, once, and only with a username (G1, G7)", async () => {
    useSession(A.session);
    expect((await call(setDisplayName, "/api/profile/display-name", "POST", { displayName: "Ana" })).status).toBe(200);
    useSession(B.session);
    expect(await call(preview, `/api/groups/preview?code=${code}`, "GET")).toEqual({ status: 200, body: { ok: true, group: { name: "Book Club" } } });
    expect(await call(join, "/api/groups/join", "POST", { code })).toEqual({ status: 200, body: { ok: true, group: { id: club, name: "Book Club" } } });
    expect(await call(join, "/api/groups/join", "POST", { code })).toEqual(error(409, "already_member"));
    expect(await call(join, "/api/groups/join", "POST", { code: "not a code" })).toEqual(error(404, "invite_invalid"));
    // Members see each other's names whether or not they're friends (G2, G3).
    expect((await call(detail, `/api/groups/detail?id=${club}`, "GET")).body.group).toEqual({
      id: club,
      name: "Book Club",
      inviteCode: code,
      creator: false,
      members: [member(A, true, "Ana"), member(B, false)],
    });
    useSession(C.session);
    expect(await call(join, "/api/groups/join", "POST", { code })).toEqual(error(409, "no_profile"));
  });

  it("refuses the creator's powers to other members (G1)", async () => {
    useSession(B.session);
    const forbidden = error(403, "not_creator");
    expect(await call(rename, "/api/groups/rename", "POST", { id: club, name: "Mine" })).toEqual(forbidden);
    expect(await call(invite, "/api/groups/invite", "POST", { id: club })).toEqual(forbidden);
    expect(await call(remove, "/api/groups/remove", "POST", { id: club, username: A.username })).toEqual(forbidden);
    expect(await call(del, "/api/groups/delete", "POST", { id: club })).toEqual(forbidden);
    useSession(D.session);
    const notFound = error(404, "group_not_found");
    expect(await call(rename, "/api/groups/rename", "POST", { id: club, name: "Mine" })).toEqual(notFound);
    expect(await call(leave, "/api/groups/leave", "POST", { id: club })).toEqual(notFound);
  });

  it("lets the creator rename the group and reset its link, which stops the old one working", async () => {
    useSession(A.session);
    expect(await call(rename, "/api/groups/rename", "POST", { id: club, name: "Readers" })).toEqual({ status: 200, body: { ok: true, name: "Readers" } });
    expect(await call(rename, "/api/groups/rename", "POST", { id: club, name: "Two  spaces" })).toEqual(error(400, "group_name_invalid"));
    const reset = await call(invite, "/api/groups/invite", "POST", { id: club });
    expect(reset.body.inviteCode).toMatch(/^[A-Za-z0-9_-]{10}$/);
    expect(reset.body.inviteCode).not.toBe(code);
    useSession(D.session);
    expect(await call(preview, `/api/groups/preview?code=${code}`, "GET")).toEqual(error(404, "invite_invalid"));
    expect(await call(join, "/api/groups/join", "POST", { code })).toEqual(error(404, "invite_invalid"));
    code = reset.body.inviteCode;
    expect((await call(join, "/api/groups/join", "POST", { code })).body.group).toEqual({ id: club, name: "Readers" });
  });

  it("lets the creator remove a member, who loses the group (G6)", async () => {
    useSession(A.session);
    expect(await call(remove, "/api/groups/remove", "POST", { id: club, username: D.username })).toEqual({ status: 200, body: { ok: true } });
    expect(await call(remove, "/api/groups/remove", "POST", { id: club, username: D.username })).toEqual(error(404, "member_not_found"));
    // The creator goes by leaving, not by removing themselves.
    expect(await call(remove, "/api/groups/remove", "POST", { id: club, username: A.username })).toEqual(error(404, "member_not_found"));
    useSession(D.session);
    expect(await call(detail, `/api/groups/detail?id=${club}`, "GET")).toEqual(error(404, "group_not_found"));
  });

  it("hands the group to the longest-standing member when the creator leaves (G6)", async () => {
    useSession(D.session);
    expect((await call(join, "/api/groups/join", "POST", { code })).status).toBe(200);
    useSession(A.session);
    expect(await call(leave, "/api/groups/leave", "POST", { id: club })).toEqual({ status: 200, body: { ok: true } });
    expect(await call(detail, `/api/groups/detail?id=${club}`, "GET")).toEqual(error(404, "group_not_found"));
    // B joined before D rejoined.
    useSession(B.session);
    const page = (await call(detail, `/api/groups/detail?id=${club}`, "GET")).body.group;
    expect(page.creator).toBe(true);
    expect(page.members).toEqual([member(B, true), member(D, false)]);
  });

  it(`refuses the ${GROUP_MAX_MEMBERS + 1}st member and a player's ${GROUPS_PER_PLAYER + 1}th group (G11)`, async () => {
    useSession(A.session);
    const full = (await call(create, "/api/groups/create", "POST", { name: "Full" })).body.group.id;
    // Members without sign-ins fill the group; only the count matters to the cap.
    await getPool().query(
      `with u as (insert into auth.users (id, email) select gen_random_uuid(), $2 || n || '@example.test' from generate_series(2, $3::int) n returning id)
       insert into private.group_member (group_id, user_id) select $1, id from u`,
      [full, `${RUN}-fill`, GROUP_MAX_MEMBERS],
    );
    const fullCode = (await getPool().query("select invite_code from private.player_group where id = $1", [full])).rows[0].invite_code;
    useSession(B.session);
    expect(await call(join, "/api/groups/join", "POST", { code: fullCode })).toEqual(error(409, "group_full"));

    // D is in one group, Readers.
    useSession(D.session);
    for (let n = 2; n <= GROUPS_PER_PLAYER; n++) {
      expect((await call(create, "/api/groups/create", "POST", { name: `D ${n}` })).status).toBe(201);
    }
    expect(await call(create, "/api/groups/create", "POST", { name: "One more" })).toEqual(error(409, "too_many_groups"));
    useSession(A.session);
    const longCode = (await call(detail, `/api/groups/detail?id=${longName}`, "GET")).body.group.inviteCode;
    useSession(D.session);
    expect(await call(join, "/api/groups/join", "POST", { code: longCode })).toEqual(error(409, "too_many_groups"));
  });

  it("deletes a group for every member, and the last member leaving deletes it too (G1, G6)", async () => {
    useSession(B.session);
    expect(await call(del, "/api/groups/delete", "POST", { id: club })).toEqual({ status: 200, body: { ok: true } });
    expect((await call(groups, "/api/groups", "GET")).body.groups).toEqual([]);
    useSession(D.session);
    expect(await call(detail, `/api/groups/detail?id=${club}`, "GET")).toEqual(error(404, "group_not_found"));

    useSession(A.session);
    expect((await call(leave, "/api/groups/leave", "POST", { id: longName })).status).toBe(200);
    const { rows } = await getPool().query("select count(*)::int as n from private.player_group where id = $1", [longName]);
    expect(rows[0].n).toBe(0);
  });
});

// Two connections at once (CLAUDE.md, Testing: concurrency). Players without sign-ins call the group functions the
// routes call; only memberships matter here.
describe("groups under concurrent requests", () => {
  async function players(n: number): Promise<string[]> {
    const { rows } = await getPool().query<{ id: string }>(
      `insert into auth.users (id, email) select gen_random_uuid(), $1 || gen_random_uuid() || '@example.test' from generate_series(1, $2::int)
       returning id`,
      [`${RUN}-c`, n],
    );
    return rows.map((r) => r.id);
  }
  async function groupOf(ids: string[]): Promise<{ id: string; code: string }> {
    const { id } = await createGroup(getPool(), ids[0], "Race");
    const { rows } = await getPool().query("select invite_code from private.player_group where id = $1", [id]);
    for (const other of ids.slice(1)) await joinGroup(getPool(), other, rows[0].invite_code);
    return { id, code: rows[0].invite_code };
  }

  // Each leave locks the group before its membership, so the creator's handover never waits on a membership another
  // leave already holds (the 10b review reproduced a deadlock when they were taken the other way round).
  it("lets the creator and the next member leave at once, ten times over, with no deadlock (G6)", async () => {
    for (let i = 0; i < 10; i++) {
      const [a, b, c] = await players(3);
      const two = await groupOf([a, b]);
      expect(await Promise.all([leaveGroup(getPool(), a, two.id), leaveGroup(getPool(), b, two.id)])).toEqual([undefined, undefined]);
      expect((await getPool().query("select count(*)::int as n from private.player_group where id = $1", [two.id])).rows[0].n).toBe(0);

      const three = await groupOf([a, b, c]);
      await Promise.all([leaveGroup(getPool(), a, three.id), leaveGroup(getPool(), b, three.id)]);
      const { rows } = await getPool().query("select creator_id from private.player_group where id = $1", [three.id]);
      expect(rows).toEqual([{ creator_id: c }]);
    }
  });

  it(`lets only one of three joins into a group of ${GROUP_MAX_MEMBERS - 1} through (G11)`, async () => {
    const ids = await players(GROUP_MAX_MEMBERS - 1 + 3);
    const { code } = await groupOf(ids.slice(0, GROUP_MAX_MEMBERS - 1));
    const results = await Promise.allSettled(ids.slice(GROUP_MAX_MEMBERS - 1).map((id) => joinGroup(getPool(), id, code)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected").map((r) => (r as PromiseRejectedResult).reason.code)).toEqual(["group_full", "group_full"]);
  });
});
