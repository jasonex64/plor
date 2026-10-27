// Yesterday's standings against the local stack (run with `npm run test:db`; docs/milestones/M11-home-screen.md, 11a,
// H7). V is the viewer; F is V's friend, and joins V's group for one test; G is in V's group but not V's friend; D is in
// neither. Yesterday's and an
// earlier day's ledger rows are written directly, as the friends leaderboard test's W1 case does.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { GAME_ID } from "@/platform/game";
import { createGroup, getGroup, joinGroup } from "@/groups/groups";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, removeCreatedPuzzles } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as yesterdayRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({
  email: `${RUN}-${tag}@example.test`,
  username: `${tag}${RUN}`,
  userId: "",
  session: new Map<string, string>(),
});
const V = player("yv");
const F = player("yf");
const G = player("yg");
const D = player("yd");
let yesterday = "";
let club = "";

async function call(path: string) {
  const response = await yesterdayRoute(apiRequest(path, { method: "GET" }));
  return { status: response.status, body: await response.json() };
}
const points = async (path: string) =>
  (await call(path)).body.day.entries.map((e: { username: string; points: number; you: boolean }) => [e.username, e.points, e.you]);

// A run and its ledger row on that day, written directly.
async function scored(p: { userId: string }, date: string, total: number) {
  await ensurePuzzle(date);
  await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [p.userId, GAME_ID, date]);
  await getPool().query(
    "insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, $2, $3::date, $4, 0)",
    [p.userId, GAME_ID, date, total],
  );
}

beforeAll(useLocalStack);

afterAll(async () => {
  // Deleting the auth users cascades to runs, ledger rows, friendships and memberships, and the last member's going
  // deletes the group; then the fixture puzzles go.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeCreatedPuzzles();
  await getPool().end();
});

describe("yesterday's standings", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in four players; V and F are friends, and V's group has G", async () => {
    for (const p of [V, F, G, D]) {
      p.session = (await signIn(p.email)).session;
      const r = await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } }));
      expect(r.status).toBe(201);
      const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [p.email]);
      p.userId = rows[0].id;
    }
    await getPool().query(
      "insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))",
      [V.userId, F.userId],
    );
    club = (await createGroup(getPool(), V.userId, "Club")).id;
    await joinGroup(getPool(), G.userId, (await getGroup(getPool(), V.userId, club)).inviteCode);
    // Members since before yesterday, so yesterday counts for them in the group (M12 12d).
    await getPool().query("update private.group_member set joined_at = now() - interval '2 days' where group_id = $1", [club]);

    const { rows } = await getPool().query<{ yesterday: string; before: string }>(
      "select (private.today() - 1)::text as yesterday, (private.today() - 2)::text as before",
    );
    yesterday = rows[0].yesterday;
    // Yesterday: F 300, G 500. The day before: F 1000, which isn't yesterday's.
    await scored(F, yesterday, 300);
    await scored(G, yesterday, 500);
    await scored(F, rows[0].before, 1000);
  });

  it("shows the viewer and their friends by default, yesterday's points only (H7)", async () => {
    useSession(V.session);
    const r = await call("/api/leaderboard/yesterday");
    expect(r.status).toBe(200);
    expect(r.body.day.date).toBe(yesterday);
    expect(await points("/api/leaderboard/yesterday")).toEqual([
      [F.username, 300, false],
      [V.username, 0, true],
    ]);
  });

  it("shows a group's members when asked, friends or not (H7, M10 G3)", async () => {
    useSession(V.session);
    expect(await points(`/api/leaderboard/yesterday?group=${club}`)).toEqual([
      [G.username, 500, false],
      [V.username, 0, true],
    ]);
  });

  it("refuses a group the viewer isn't in, and an ID that isn't a group, with the group page's 404", async () => {
    const notFound = { status: 404, body: { ok: false, error: "group_not_found" } };
    useSession(D.session);
    expect(await call(`/api/leaderboard/yesterday?group=${club}`)).toEqual(notFound);
    expect(await call("/api/leaderboard/yesterday?group=not-a-group")).toEqual(notFound);
  });

  it("counts none of yesterday's points in the group for a member who joined today (M12 12d, D3)", async () => {
    await joinGroup(getPool(), F.userId, (await getGroup(getPool(), V.userId, club)).inviteCode);
    useSession(V.session);
    expect(await points(`/api/leaderboard/yesterday?group=${club}`)).toEqual([
      [G.username, 500, false],
      [F.username, 0, false],
      [V.username, 0, true],
    ]);
    // V's friends standings still have F's.
    expect(await points("/api/leaderboard/yesterday")).toEqual([
      [F.username, 300, false],
      [V.username, 0, true],
    ]);
  });

  it("leaves yesterday out while the viewer's own run that day is still going (M09 D5)", async () => {
    // V started yesterday's run and hasn't finished it: a run can be finished after midnight.
    await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [
      V.userId,
      GAME_ID,
      yesterday,
    ]);
    useSession(V.session);
    expect(await points("/api/leaderboard/yesterday")).toEqual([
      [F.username, 0, false],
      [V.username, 0, true],
    ]);
  });
});
