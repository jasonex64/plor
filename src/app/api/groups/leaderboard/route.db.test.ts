// A group's weekly leaderboard against the local stack (run with `npm run test:db`; docs/milestones/M10-groups.md,
// 10c). The weeks, settling and the D5 exclusion are the friends board's code (src/app/api/leaderboard/route.db.test.ts);
// this checks who a group's board shows, and from which day (M12 12d). A creates the group and B joins it; C is A's
// friend, and a member only for the last test; D is neither. Ledger rows are written directly on this week's Monday,
// as that test's W1 case does.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GAME_ID } from "@/content/puzzle";
import { weekStart } from "@/friends/leaderboard";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, removeCreatedPuzzles } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as friendsBoard } from "../../leaderboard/route";
import { POST as createProfile } from "../../profile/route";
import { POST as create } from "../create/route";
import { GET as detail } from "../detail/route";
import { POST as join } from "../join/route";
import { POST as remove } from "../remove/route";
import { GET as groupBoard } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({
  email: `${RUN}-${tag}@example.test`,
  username: `${tag}${RUN}`,
  userId: "",
  session: new Map<string, string>(),
});
const A = player("wa");
const B = player("wb");
const C = player("wc");
const D = player("wd");

async function call(route: (r: Request) => Promise<Response>, path: string, method: "GET" | "POST", body?: unknown) {
  const response = await route(apiRequest(path, { method, body }));
  return { status: response.status, body: await response.json() };
}

type Entry = { username: string; name: string; points: number; you: boolean };
// Each week's [username, points], highest first.
const totals = (body: { thisWeek: { entries: Entry[] }; lastWeek: { entries: Entry[] } }) => ({
  thisWeek: body.thisWeek.entries.map((e) => [e.username, e.points]),
  lastWeek: body.lastWeek.entries.map((e) => [e.username, e.points]),
});

beforeAll(useLocalStack);

afterAll(async () => {
  // Deleting the auth users cascades to memberships, friendships, runs and ledger rows, and the last member's going
  // deletes the group; then the fixture puzzle goes.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeCreatedPuzzles();
  await getPool().end();
});

describe("a group's leaderboard", () => {
  let club = "";
  let monday = "";

  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in four players; A makes a group that B joins, and A and C are friends", async () => {
    for (const p of [A, B, C, D]) {
      p.session = (await signIn(p.email)).session;
      expect((await call(createProfile, "/api/profile", "POST", { username: p.username })).status).toBe(201);
      const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [p.email]);
      p.userId = rows[0].id;
    }
    useSession(A.session);
    club = (await call(create, "/api/groups/create", "POST", { name: "Book Club" })).body.group.id;
    const code = (await call(detail, `/api/groups/detail?id=${club}`, "GET")).body.group.inviteCode;
    useSession(B.session);
    expect((await call(join, "/api/groups/join", "POST", { code })).status).toBe(200);
    // A and B count as members since before last week, so these tests are about who is shown; the last test is about
    // the join day.
    await getPool().query("update private.group_member set joined_at = now() - interval '15 days' where group_id = $1", [club]);
    await getPool().query(
      "insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))",
      [A.userId, C.userId],
    );

    // This week: B 1000 and C 10; A has none.
    const { rows } = await getPool().query<{ today: string }>("select private.today()::text as today");
    monday = weekStart(rows[0].today);
    await ensurePuzzle(monday);
    for (const [p, points] of [
      [B, 1000],
      [C, 10],
    ] as const) {
      await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [
        p.userId,
        GAME_ID,
        monday,
      ]);
      await getPool().query(
        "insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, $2, $3::date, $4, 0)",
        [p.userId, GAME_ID, monday, points],
      );
    }
  });

  it("shows the group's members, friends or not, and no one else (G2, G3)", async () => {
    useSession(A.session);
    const r = await call(groupBoard, `/api/groups/leaderboard?id=${club}`, "GET");
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.thisWeek.from).toBe(monday);
    expect(r.body.thisWeek.entries).toEqual([
      { username: B.username, name: B.username, points: 1000, you: false },
      { username: A.username, name: A.username, points: 0, you: true },
    ]);
    expect(totals(r.body).lastWeek).toEqual([
      [A.username, 0],
      [B.username, 0],
    ]);
  });

  it("leaves out a day while the viewer's own run that day is still going (M09 D5), as the friends board does", async () => {
    // B's Monday run, written with no answers, is still in progress, so B's view leaves Monday out, B's 1000 included.
    useSession(B.session);
    expect((await call(groupBoard, `/api/groups/leaderboard?id=${club}`, "GET")).body.thisWeek.entries).toEqual([
      { username: A.username, name: A.username, points: 0, you: false },
      { username: B.username, name: B.username, points: 0, you: true },
    ]);
  });

  it("leaves the friends board friends-only: A's shows C and not B (G2)", async () => {
    useSession(A.session);
    expect(totals((await call(friendsBoard, "/api/leaderboard", "GET")).body).thisWeek).toEqual([
      [C.username, 10],
      [A.username, 0],
    ]);
  });

  it("refuses anyone who isn't a member, and an ID that isn't a group, with the group page's 404", async () => {
    const notFound = { status: 404, body: { ok: false, error: "group_not_found" } };
    useSession(D.session);
    expect(await call(groupBoard, `/api/groups/leaderboard?id=${club}`, "GET")).toEqual(notFound);
    useSession(A.session);
    expect(await call(groupBoard, "/api/groups/leaderboard?id=not-a-group", "GET")).toEqual(notFound);
    expect(await call(groupBoard, "/api/groups/leaderboard?id=00000000-0000-0000-0000-000000000001", "GET")).toEqual(notFound);
  });

  it("drops a member once the creator removes them (G6)", async () => {
    useSession(A.session);
    expect((await call(remove, "/api/groups/remove", "POST", { id: club, username: B.username })).status).toBe(200);
    expect(totals((await call(groupBoard, `/api/groups/leaderboard?id=${club}`, "GET")).body).thisWeek).toEqual([[A.username, 0]]);
    useSession(B.session);
    expect((await call(groupBoard, `/api/groups/leaderboard?id=${club}`, "GET")).status).toBe(404);
  });

  it("counts a member only from the puzzle day they joined, that day included, and the friends board their whole week (12d)", async () => {
    // C has 5 points on last week's Monday and 10 on this week's (from the first test), and joins on this Monday at
    // noon Pacific.
    const lastMonday = (await getPool().query<{ d: string }>("select ($1::date - 7)::text as d", [monday])).rows[0].d;
    await ensurePuzzle(lastMonday);
    await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [C.userId, GAME_ID, lastMonday]);
    await getPool().query("insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, $2, $3::date, 5, 0)", [
      C.userId,
      GAME_ID,
      lastMonday,
    ]);
    await getPool().query(
      "insert into private.group_member (group_id, user_id, joined_at) values ($1, $2, ($3::date + time '12:00') at time zone 'America/Los_Angeles')",
      [club, C.userId, monday],
    );
    useSession(A.session);
    expect(totals((await call(groupBoard, `/api/groups/leaderboard?id=${club}`, "GET")).body)).toEqual({
      thisWeek: [
        [C.username, 10],
        [A.username, 0],
      ],
      lastWeek: [
        [A.username, 0],
        [C.username, 0],
      ],
    });
    expect(totals((await call(friendsBoard, "/api/leaderboard", "GET")).body)).toEqual({
      thisWeek: [
        [C.username, 10],
        [A.username, 0],
      ],
      lastWeek: [
        [C.username, 5],
        [A.username, 0],
      ],
    });
  });
});
