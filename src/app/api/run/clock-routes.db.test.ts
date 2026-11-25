// The run routes on a day on a clock, against the local stack (run with `npm run test:db`; docs/milestones/
// M23-23c-the-run-on-a-clock.md): each route chooses the clock's module by the day's format, for a signed-in player and for a
// guest, and Finish exists only there. The run's rules are in src/game/clock-runs.plor-app.db.test.ts and the SQL tests.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { getPool } from "@/lib/db";
import { GAME_ID } from "@/platform/game";
import { fixtureClockDay, loadFixtureBase, removeFixtureBase } from "@/test/answer-fixture";
import { signIn, useLocalStack } from "@/test/local-stack";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { POST as guestAnswer } from "../guest/run/answer/route";
import { POST as guestFinish } from "../guest/run/finish/route";
import { POST as guestNext } from "../guest/run/next/route";
import { GET as guestState } from "../guest/run/route";
import { POST as guestStart } from "../guest/run/start/route";
import { POST as answer } from "./answer/route";
import { POST as finish } from "./finish/route";
import { POST as next } from "./next/route";
import { GET as state } from "./route";
import { POST as start } from "./start/route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
let today = "";

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const post = (route: (r: Request) => Promise<Response>, path: string, body?: unknown) => call(route(apiRequest(path, { method: "POST", body })));

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  today = (await db.query<{ today: string }>("select private.today()::text as today")).rows[0].today;
  const { rowCount } = await db.query("select from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
  if (rowCount) throw new Error(`${today} has a puzzle already; this test needs it free for a clock day`);
  const base = await loadFixtureBase(db);
  await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, today, fixtureClockDay(today, base)]);
});

beforeEach(() => {
  cookieJar.clear();
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.query("delete from private.guest_run where puzzle_date = $1::date", [today]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
  await removeFixtureBase(db);
  await db.end();
});

describe("the run routes on a clock day", () => {
  it("plays a signed-in player's run from Start to Finish", async () => {
    await signIn(`${RUN}-p@example.test`);
    expect((await post(createProfile, "/api/profile", { username: `cl${RUN}` })).status).toBe(201);
    expect((await call(state(apiRequest("/api/run", { method: "GET" })))).body.run).toMatchObject({ format: 4, status: "not_started" });
    expect((await post(start, "/api/run/start")).body.run).toMatchObject({ format: 4, status: "in_progress", question: { index: 0 } });

    expect((await post(answer, "/api/run/answer", { index: 0, text: "dog" })).body).toMatchObject({ ok: true, notInList: false, repeat: false, run: { points: 10 } });
    expect((await post(answer, "/api/run/answer", { index: 0, text: "dog" })).body).toMatchObject({ repeat: true, run: { points: 10 } });
    expect((await post(answer, "/api/run/answer", { index: 0, text: "zzz qqq" })).body).toMatchObject({ notInList: true, run: { points: 10 } });

    // Next names the question the tab shows; Finish waits for the last one.
    expect(await post(next, "/api/run/next")).toEqual({ status: 400, body: { ok: false, error: "bad_request" } });
    expect(await post(finish, "/api/run/finish")).toEqual({ status: 409, body: { ok: false, error: "not_last_question" } });
    expect((await post(next, "/api/run/next", { index: 0 })).body.run.question.index).toBe(1);
    expect((await post(next, "/api/run/next", { index: 1 })).body.run.question.index).toBe(2);
    const done = await post(finish, "/api/run/finish");
    expect(done).toMatchObject({ status: 200, body: { run: { status: "over", points: 10, question: null } } });
    expect((await call(state(apiRequest("/api/run", { method: "GET" })))).body.run).toMatchObject({ status: "over", points: 10 });
  });

  it("plays a guest's run the same way", async () => {
    const started = await post(guestStart, "/api/guest/run/start", { turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" });
    expect(started.body.run).toMatchObject({ format: 4, status: "in_progress", question: { index: 0 } });
    expect((await post(guestAnswer, "/api/guest/run/answer", { index: 0, text: "cat" })).body).toMatchObject({ notInList: false, repeat: false, run: { points: 25 } });
    expect((await post(guestAnswer, "/api/guest/run/answer", { index: 0, text: "cat" })).body).toMatchObject({ repeat: true, run: { points: 25 } });
    expect(await post(guestFinish, "/api/guest/run/finish")).toEqual({ status: 409, body: { ok: false, error: "not_last_question" } });
    await post(guestNext, "/api/guest/run/next", { index: 0 });
    await post(guestNext, "/api/guest/run/next", { index: 1 });
    expect(await post(guestFinish, "/api/guest/run/finish")).toMatchObject({ status: 200, body: { run: { status: "over", points: 25 } } });
    expect((await call(guestState(apiRequest("/api/guest/run", { method: "GET" })))).body.run).toMatchObject({ status: "over", points: 25 });
  });
});
