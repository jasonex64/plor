// The live board's HTTP side against the local stack (run with `npm run test:db`): friends start today's run and each one's board
// shows the other (docs/milestones/M07-friends-and-live-board.md, 7c), and what a board holds when a run's clock runs out. What a
// friend's question and points show is in clock.db.test.ts. The Realtime side is in e2e/live-board.e2e.ts.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { startTodaysRun } from "@/test/clock-routes";
import { ensurePuzzle, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as sessionRoute } from "../realtime/session/route";
import { GET as boardRoute } from "./route";
import { localStack } from "../../../../scripts/slot.ts";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
type Player = { username: string; userId: string; session: Map<string, string> };
// a and b are friends, and so are b and c.
const players: Record<"a" | "b" | "c", Player> = {
  a: { username: `ba${RUN}`, userId: "", session: new Map() },
  b: { username: `bb${RUN}`, userId: "", session: new Map() },
  c: { username: `bc${RUN}`, userId: "", session: new Map() },
};
let today = "";

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const board = async (reason?: string) =>
  (await call(boardRoute(apiRequest(reason ? `/api/board?game=offbeat&reason=${reason}` : "/api/board?game=offbeat", { method: "GET" })))).body.board;
beforeAll(async () => {
  useLocalStack();
  const { rows } = await getPool().query<{ today: string }>("select private.today()::text as today");
  today = rows[0].today;
  await ensurePuzzle(today);
});

afterAll(async () => {
  // Deleting the auth users cascades to profiles, friendships and runs; then the fixture puzzle goes.
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeFixtures();
  await getPool().end();
});

describe("the live board over HTTP", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in three players, and makes a and b friends", async () => {
    for (const [key, p] of Object.entries(players)) {
      p.session = (await signIn(`${RUN}-${key}@example.test`)).session;
      expect((await call(createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } })))).status).toBe(201);
      const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${key}@example.test`]);
      p.userId = rows[0].id;
    }
    await getPool().query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [
      players.a.userId,
      players.b.userId,
    ]);
  });

  it("shows a friend who hasn't played", async () => {
    useSession(players.a.session);
    expect(await board()).toMatchObject({
      finished: false,
      friends: [{ username: players.b.username, name: players.b.username, state: "not_started", question: null, points: null }],
    });
  });

  it("shows a friend who has started, and what they have, from the start", async () => {
    useSession(players.a.session);
    expect((await startTodaysRun()).status).toBe(200);
    useSession(players.b.session);
    expect((await board()).friends[0]).toEqual({
      userId: players.a.userId,
      username: players.a.username,
      name: players.a.username,
      state: "playing",
      question: 1,
      // Their points so far (src/friends/board.ts).
      points: 0,
      // Fragments' score: always null on Offbeat's board.
      score: null,
      // Reactions on runs wait for the viewer's run too (M08 8b).
      reactions: null,
    });
  });

  it("logs a refetch after a reconnect, so reconnects are counted", async () => {
    useSession(players.a.session);
    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((line: string) => void lines.push(line));
    try {
      await board("reconnect");
      await board();
    } finally {
      spy.mockRestore();
    }
    expect(lines.map((l) => JSON.parse(l))).toEqual([expect.objectContaining({ level: "info", msg: "board refetch after reconnect", userId: players.a.userId })]);
  });

  it("gives the browser what its Realtime client needs, and the player's own id for the topic", async () => {
    useSession(players.a.session);
    const { status, body } = await call(sessionRoute(apiRequest("/api/realtime/session", { method: "GET" })));
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, url: localStack().apiUrl, userId: players.a.userId });
    expect(body.publishableKey).toMatch(/^sb_publishable_/);
    expect(typeof body.accessToken).toBe("string");
    expect(body.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });

  it("shows a playing friend's question to a viewer who has not played", async () => {
    await getPool().query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [
      players.b.userId,
      players.c.userId,
    ]);
    useSession(players.c.session);
    expect((await startTodaysRun()).status).toBe(200);
    useSession(players.b.session);
    expect((await board()).friends.find((f: { username: string }) => f.username === players.c.username)).toMatchObject({
      state: "playing",
      question: 1,
    });
  });

  // M19 19f: is the live board late? The end of a run's clock is a reading inside private.run_status, so nothing is written
  // or sent when time runs out (ROADMAP, M07 7c). The board broadcasts from triggers on insert into private.run, private.clock_answer
  // and private.clock_finish only, so a friend's row on an open board changes at the next read.
  // The update below is this test's clock, not the app's write: it has no trigger, so a new answer row or a new Realtime
  // message could only come from the app, and none does.
  it("a friend whose time ran out changes on the board only at the next read: nothing is written or sent when time runs out", async () => {
    const db = getPool();
    const sent = async () =>
      (await db.query<{ n: number }>("select count(*)::int as n from realtime.messages where payload ->> 'username' = $1", [players.c.username])).rows[0].n;
    const eventRows = async () =>
      (await db.query<{ n: number }>("select count(*)::int as n from private.clock_answer where user_id = $1", [players.c.userId])).rows[0].n;
    const friendC = async () => (await board()).friends.find((f: { username: string }) => f.username === players.c.username);

    useSession(players.b.session);
    expect(await friendC()).toMatchObject({ state: "playing", question: 1 });
    const before = { sent: await sent(), events: await eventRows() };
    // Starting c's run sent at least one message, so the count is a real measure.
    expect(before.sent).toBeGreaterThan(0);

    // A run's clock starts at 20 seconds (private.clock_start_ms): 21 seconds back is past it.
    await db.query("update private.run set started_at = started_at - interval '21 seconds' where user_id = $1 and puzzle_date = $2::date", [
      players.c.userId,
      today,
    ]);

    expect({ sent: await sent(), events: await eventRows() }).toEqual(before);
    expect(await friendC()).toMatchObject({ state: "finished", question: null, points: 0 });
    // Reading the board writes nothing either.
    expect({ sent: await sent(), events: await eventRows() }).toEqual(before);
  });
});
