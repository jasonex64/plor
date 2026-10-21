// The insights route against the local stack (`npm run test:db`): a signed-in player who isn't an admin gets 403, an
// admin gets the day's report, and the report names no player. Other local runs for today may exist, so the counts
// are checked as lower bounds here; the exact maths is in src/insights/report.test.ts.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GAME_ID, type Puzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { dayInsights } from "@/insights/queries";
import { apiRequest } from "@/test/request-scope";
import { GET } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
let today = "";
let puzzle: Puzzle;
let tomorrow = "";
let createdPuzzle = false;
let createdTomorrow = false;
const fixturePlayers: string[] = [];

const report = () => GET(apiRequest("/api/admin/insights", { method: "GET" }));

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  ({ today, tomorrow } = (await db.query<{ today: string; tomorrow: string }>(
    "select private.today()::text as today, (private.today() + 1)::text as tomorrow",
  )).rows[0]);
  // A published day that hasn't started: its host answers must stay out of the report (D5; M03 review).
  const ahead = await db.query("select 1 from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, tomorrow]);
  if (!ahead.rows.length) {
    const future = { ...JSON.parse(readFileSync("content/offbeat/2026-10-26.json", "utf8")), date: tomorrow };
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, tomorrow, future]);
    createdTomorrow = true;
  }
  const existing = await db.query<{ content: Puzzle }>("select content from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
  if (existing.rows.length) puzzle = existing.rows[0].content;
  else {
    puzzle = { ...JSON.parse(readFileSync("content/offbeat/2026-10-26.json", "utf8")), date: today };
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, today, puzzle]);
    createdPuzzle = true;
  }
  // Six fixture players on question 1: two give the host answer, four give an entry outside the host bank.
  const q = puzzle.questions[0];
  const outside = q.entries.find((e) => !q.host_bank.includes(e.id))!.id;
  for (let i = 0; i < 6; i++) {
    const id = randomUUID();
    fixturePlayers.push(id);
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${RUN}-f${i}@example.test`]);
    await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [id, GAME_ID, today]);
    const caught = i < 2;
    await db.query(
      "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 0, $4, $5)",
      [id, GAME_ID, today, caught ? q.host_answers[0] : outside, caught],
    );
  }
  await db.query("insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed) values ($1, $2, $3::date, 0, 'okapi')", [
    fixturePlayers[2], GAME_ID, today,
  ]);
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  if (createdPuzzle) await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
  if (createdTomorrow) await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, tomorrow]);
  await db.end();
});

describe("GET /api/admin/insights", () => {
  it("refuses a signed-in player who isn't an admin with 403 admins_only", async () => {
    useSession((await signIn(`${RUN}-player@example.test`)).session);
    const response = await report();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "admins_only" });
  });

  it("shows an admin today's report with the fixture's numbers, and no player", async () => {
    useSession((await signIn(`${RUN}-admin@example.test`)).session);
    await getPool().query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-admin@example.test`]);
    const response = await report();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.days[0]).toBe(today);
    const q1 = body.report.questions[0];
    // Other local runs for today may exist; the fixture adds 6 answers, 2 of them caught.
    expect(q1.answered).toBeGreaterThanOrEqual(6);
    expect(q1.caught).toBeGreaterThanOrEqual(2);
    expect(q1.misses).toEqual(expect.arrayContaining([expect.objectContaining({ text: "okapi" })]));
    expect(body.report.finished).toBe(false);
    // D4: no user ID or email anywhere in the report.
    const text = JSON.stringify(body);
    for (const id of fixturePlayers) expect(text).not.toContain(id);
    expect(text).not.toContain("@example.test");
  });

  it("refuses a malformed date", async () => {
    const response = await GET(apiRequest("/api/admin/insights?date=yesterday", { method: "GET" }));
    expect(response.status).toBe(400);
  });

  it("refuses a well-formed date that names no real day with 400, not a 500 from Postgres (M02 2f, B2)", async () => {
    for (const date of ["2026-02-30", "2026-13-01"]) {
      const response = await GET(apiRequest(`/api/admin/insights?date=${date}`, { method: "GET" }));
      expect(await response.json()).toEqual({ ok: false, error: "bad_request" });
      expect(response.status).toBe(400);
    }
  });

  it("has no report, and no entry in the day list, for a published day that hasn't started", async () => {
    const response = await GET(apiRequest(`/api/admin/insights?date=${tomorrow}`, { method: "GET" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "not_available" });
    const days = (await (await report()).json()).days;
    expect(days).not.toContain(tomorrow);
  });
});

// B3 (M02 2f): with no puzzle today, the default report is the last finished day, so the page and its day list stay
// reachable. Runs on its own client in a transaction that is rolled back, so the shared fixtures stay as they were.
describe("dayInsights with no date, when today has no puzzle", () => {
  it("reports the newest published day before today", async () => {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      await client.query("delete from private.run where game_id = $1 and puzzle_date = private.today()", [GAME_ID]);
      await client.query("delete from private.puzzle where game_id = $1 and puzzle_date = private.today()", [GAME_ID]);
      const earlier = (await client.query<{ day: string }>("select (private.today() - 3)::text as day")).rows[0].day;
      await client.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3) on conflict do nothing", [
        GAME_ID,
        earlier,
        { ...puzzle, date: earlier },
      ]);
      const newest = (
        await client.query<{ day: string }>(
          "select max(puzzle_date)::text as day from private.puzzle where game_id = $1 and puzzle_date < private.today()",
          [GAME_ID],
        )
      ).rows[0].day;
      expect(await dayInsights(client, null)).toMatchObject({ date: newest, finished: true });
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});
