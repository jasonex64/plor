// The live board's HTTP side on a day on a clock, against the local stack (run with `npm run test:db`; docs/milestones/
// M23-23d-the-screens.md, "The live board"; the human's answer 47): a friend's question and points show from their first answer,
// to a viewer who has not played too, and the points stay when the run ends. A friend's answers are never in what is read. The
// Realtime side is in e2e/clock.e2e.ts.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as finishRoute } from "@/app/api/run/finish/route";
import { POST as nextRoute } from "@/app/api/run/next/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { getPool } from "@/lib/db";
import { GAME_ID } from "@/platform/game";
import { fixtureClockDay, loadFixtureBase, removeFixtureBase } from "@/test/answer-fixture";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { GET as boardRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
type Player = { username: string; userId: string; session: Map<string, string> };
// a and b are friends.
const players: Record<"a" | "b", Player> = {
  a: { username: `ka${RUN}`, userId: "", session: new Map() },
  b: { username: `kb${RUN}`, userId: "", session: new Map() },
};
let today = "";

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const post = (route: (r: Request) => Promise<Response>, path: string, body?: unknown) => call(route(apiRequest(path, { method: "POST", body })));
const board = async () => (await call(boardRoute(apiRequest("/api/board?game=offbeat", { method: "GET" })))).body.board;

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  today = (await db.query<{ today: string }>("select private.today()::text as today")).rows[0].today;
  const { rowCount } = await db.query("select from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
  if (rowCount) throw new Error(`${today} has a puzzle already; this test needs it free for a clock day`);
  const base = await loadFixtureBase(db);
  await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, today, fixtureClockDay(today, base)]);
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
  await removeFixtureBase(db);
  await db.end();
});

describe("the live board on a day on a clock", () => {
  it("signs in two players, and makes them friends", async () => {
    for (const [key, p] of Object.entries(players)) {
      p.session = (await signIn(`${RUN}-${key}@example.test`)).session;
      expect((await post(createProfile, "/api/profile", { username: p.username })).status).toBe(201);
      const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${key}@example.test`]);
      p.userId = rows[0].id;
    }
    await getPool().query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [
      players.a.userId,
      players.b.userId,
    ]);
  });

  it("shows a friend's question and points mid-run to a viewer who has not played, then their points once it has ended", async () => {
    useSession(players.b.session);
    expect((await post(startRoute, "/api/run/start")).status).toBe(200);
    expect((await post(answerRoute, "/api/run/answer", { index: 0, text: "cat" })).body.run.points).toBe(25);

    useSession(players.a.session);
    const mid = await board();
    expect(mid).toMatchObject({ game: "offbeat", finished: false, mine: null, questions: 3, rounds: null });
    expect(mid.friends).toEqual([
      expect.objectContaining({ username: players.b.username, state: "playing", question: 1, points: 25, ended: null, score: null, reactions: null, place: null }),
    ]);

    useSession(players.b.session);
    expect((await post(nextRoute, "/api/run/next", { index: 0 })).status).toBe(200);
    await post(answerRoute, "/api/run/answer", { index: 1, text: "apple" });
    useSession(players.a.session);
    expect((await board()).friends[0]).toMatchObject({ state: "playing", question: 2, points: 35 });

    useSession(players.b.session);
    await post(nextRoute, "/api/run/next", { index: 1 });
    expect((await post(finishRoute, "/api/run/finish")).status).toBe(200);
    useSession(players.a.session);
    const done = await board();
    // No place until the viewer's own run is over, as on today's leaderboard (M25 25a; M22).
    expect(done.friends[0]).toMatchObject({ state: "finished", question: null, points: 35, ended: null, place: null });
    // No answer anywhere in what the viewer receives.
    expect(JSON.stringify(done)).not.toMatch(/cat|apple/);
  });

  it("gives a finished friend's place among those who have finished, once the viewer has finished too", async () => {
    useSession(players.a.session);
    expect((await post(startRoute, "/api/run/start")).status).toBe(200);
    expect((await post(answerRoute, "/api/run/answer", { index: 0, text: "dog" })).body.run.points).toBe(10);
    await post(nextRoute, "/api/run/next", { index: 0 });
    await post(nextRoute, "/api/run/next", { index: 1 });
    expect((await post(finishRoute, "/api/run/finish")).status).toBe(200);
    const both = await board();
    expect(both.finished).toBe(true);
    // b's 35 points are ahead of a's 10: first of the two who have finished.
    expect(both.friends[0]).toMatchObject({ username: players.b.username, points: 35, place: { place: 1, of: 2 } });
    useSession(players.b.session);
    expect((await board()).friends[0]).toMatchObject({ username: players.a.username, points: 10, place: { place: 2, of: 2 } });
  });
});
