// The live board's HTTP side against the local stack (run with `npm run test:db`): two friends play today's puzzle
// and each one's board shows the other, with how a run ended only after the viewer's own run is over
// (docs/milestones/M07-friends-and-live-board.md, 7c), and before then only whether the other has started
// (docs/milestones/M12-12d-decided-fixes.md). The Realtime side is in e2e/live-board.e2e.ts.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import type { ApprovedPuzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, hostName, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as sessionRoute } from "../realtime/session/route";
import { GET as boardRoute } from "./route";

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
let puzzle: ApprovedPuzzle;

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const board = async (reason?: string) =>
  (await call(boardRoute(apiRequest(reason ? `/api/board?reason=${reason}` : "/api/board", { method: "GET" })))).body.board;
// Plays as whoever is signed in now, and gets caught on question 1.
async function playAndGetCaught() {
  expect((await call(startRoute(apiRequest("/api/run/start", { method: "POST" })))).status).toBe(200);
  const r = await call(answerRoute(apiRequest("/api/run/answer", { method: "POST", body: { index: 0, text: hostName(puzzle, 0) } })));
  expect(r.body.run.status).toBe("died");
}

beforeAll(async () => {
  useLocalStack();
  const { rows } = await getPool().query<{ today: string }>("select private.today()::text as today");
  puzzle = await ensurePuzzle(rows[0].today);
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
      mine: null,
      friends: [{ username: players.b.username, name: players.b.username, state: "not_started", question: null, ended: null }],
    });
  });

  it("shows a friend playing, then caught, only as started while the viewer hasn't finished", async () => {
    const started = {
      userId: players.a.userId,
      username: players.a.username,
      name: players.a.username,
      state: "started",
      question: null,
      ended: null,
      // Reactions on runs wait for the viewer's run too (M08 8b).
      reactions: null,
    };
    useSession(players.a.session);
    expect((await call(startRoute(apiRequest("/api/run/start", { method: "POST" })))).status).toBe(200);
    useSession(players.b.session);
    expect((await board()).friends[0]).toEqual(started);
    useSession(players.a.session);
    await playAndGetCaught();
    useSession(players.b.session);
    const seen = await board();
    expect(seen.friends[0]).toEqual(started);
    // No spoiler anywhere in what the viewer receives.
    expect(JSON.stringify(seen)).not.toContain(hostName(puzzle, 0));
  });

  it("shows how a friend's run ended once the viewer has finished", async () => {
    useSession(players.b.session);
    await playAndGetCaught();
    const after = await board();
    expect(after.friends[0].ended).toEqual({ result: "caught", question: 1, answer: hostName(puzzle, 0) });
    // The viewer's own ending, which 7d places among the friends'.
    expect(after.mine).toEqual({ result: "caught", question: 1, answer: hostName(puzzle, 0) });
    useSession(players.a.session);
    expect(await board()).toMatchObject({ finished: true, friends: [{ username: players.b.username, ended: { result: "caught", question: 1 } }] });
  });

  it("logs a refetch after a reconnect, so reconnects are counted", async () => {
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
    expect(body).toMatchObject({ ok: true, url: "http://127.0.0.1:54321", userId: players.a.userId });
    expect(body.publishableKey).toMatch(/^sb_publishable_/);
    expect(typeof body.accessToken).toBe("string");
    expect(body.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });

  it("shows a playing friend's question once the viewer has finished", async () => {
    await getPool().query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [
      players.b.userId,
      players.c.userId,
    ]);
    useSession(players.c.session);
    expect((await call(startRoute(apiRequest("/api/run/start", { method: "POST" })))).status).toBe(200);
    useSession(players.b.session);
    expect((await board()).friends.find((f: { username: string }) => f.username === players.c.username)).toMatchObject({
      state: "playing",
      question: 1,
      ended: null,
    });
  });

  // M19 19f: is the live board late? The deadline is a clock reading inside private.run_status, so nothing is written
  // or sent when a question's time runs out (ROADMAP, M07 7c). The board broadcasts from triggers on insert into
  // private.run and private.run_event only, so a friend's row on an open board changes at the next read.
  // The update below is this test's clock (the same way as src/game/runs.db.test.ts's ageRun), not the app's write:
  // it has no trigger, so a new run_event row or a new Realtime message could only come from the app, and none does.
  it("a friend whose time ran out changes on the board only at the next read: nothing is written or sent when time runs out", async () => {
    const db = getPool();
    const sent = async () =>
      (await db.query<{ n: number }>("select count(*)::int as n from realtime.messages where payload ->> 'username' = $1", [players.c.username])).rows[0].n;
    const eventRows = async () =>
      (await db.query<{ n: number }>("select count(*)::int as n from private.run_event where user_id = $1", [players.c.userId])).rows[0].n;
    const friendC = async () => (await board()).friends.find((f: { username: string }) => f.username === players.c.username);

    useSession(players.b.session);
    expect(await friendC()).toMatchObject({ state: "playing", question: 1, ended: null });
    const before = { sent: await sent(), events: await eventRows() };
    // Starting c's run sent at least one message, so the count is a real measure.
    expect(before.sent).toBeGreaterThan(0);

    // Question 1 starts at the run's started_at; 21 seconds is past its 20-second timer (src/game/runs.db.test.ts).
    await db.query("update private.run set started_at = started_at - interval '21 seconds' where user_id = $1 and puzzle_date = $2::date", [
      players.c.userId,
      puzzle.date,
    ]);

    expect({ sent: await sent(), events: await eventRows() }).toEqual(before);
    expect(await friendC()).toMatchObject({ state: "finished", question: null, ended: { result: "timed_out", question: 1 } });
    // Reading the board writes nothing either.
    expect({ sent: await sent(), events: await eventRows() }).toEqual(before);
  });
});
