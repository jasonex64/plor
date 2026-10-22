// The admin puzzle routes against the local stack (`npm run test:db`; docs/milestones/M06-puzzle-entry.md): who may use
// them, saving a day's questions, and approving a drafted day with the host answers an admin chose. The drafted days
// are the real files in content/offbeat; a day this file approves is deleted again afterwards.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GAME_ID, type Puzzle } from "@/content/puzzle";
import { readDrafts } from "@/admin/puzzles";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { GET } from "./route";
import { POST as saveQuestions } from "./questions/route";
import { POST as approve } from "./approve/route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const seven = ["Name a fruit", "Name a pet", "Name a city", "Name a tool", "Name a sport", "Name a color", "Name a planet"];
let today = "";
let ahead = "";
let yesterday = "";
let draftDate = "";
let draft: Puzzle;
let approvedHere = false;
let createdToday = false;
const sessions = new Map<string, Map<string, string>>();

// Signs in once per role, inside a test (signIn polls the local inbox, which only works within a test). The admin
// is added to private.admin the first time.
async function sessionFor(role: "admin" | "player"): Promise<Map<string, string>> {
  if (!sessions.has(role)) {
    sessions.set(role, (await signIn(`${RUN}-${role}@example.test`)).session);
    if (role === "admin") {
      await getPool().query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-admin@example.test`]);
    }
  }
  return sessions.get(role)!;
}

const list = () => GET(apiRequest("/api/admin/puzzles", { method: "GET" }));
const save = (body: unknown) => saveQuestions(apiRequest("/api/admin/puzzles/questions", { method: "POST", body }));
const approveDay = (body: unknown) => approve(apiRequest("/api/admin/puzzles/approve", { method: "POST", body }));

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  ({ today, ahead, yesterday } = (
    await db.query<{ today: string; ahead: string; yesterday: string }>(
      "select private.today()::text as today, (private.today() + 500)::text as ahead, (private.today() - 1)::text as yesterday",
    )
  ).rows[0]);
  // A future drafted day this database hasn't approved yet, latest first; the human may approve days locally.
  const approved = new Set(
    (await db.query<{ date: string }>("select puzzle_date::text as date from private.puzzle where game_id = $1", [GAME_ID])).rows.map((r) => r.date),
  );
  const open = [...readDrafts().values()].filter((d) => d.date > today && !approved.has(d.date));
  expect(open.length, "every drafted day is already approved locally; this test needs one that isn't").toBeGreaterThan(0);
  draft = open[open.length - 1];
  draftDate = draft.date;
});

afterAll(async () => {
  const db = getPool();
  if (createdToday) await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
  if (approvedHere) await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, draftDate]);
  await db.query("delete from private.puzzle_questions where game_id = $1 and puzzle_date = $2::date", [GAME_ID, ahead]);
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.end();
});

describe("who may use the admin puzzle routes", () => {
  it("answers 401 when signed out", async () => {
    useSession(new Map());
    for (const response of [await list(), await save({ date: ahead, questions: seven }), await approveDay({ date: draftDate, hostAnswers: [] })]) {
      expect(response.status).toBe(401);
    }
  });

  it("answers 403 admins_only to a signed-in player who isn't an admin, before reading anything else", async () => {
    useSession(await sessionFor("player"));
    for (const response of [await list(), await save({ date: ahead, questions: seven }), await approveDay({ date: draftDate, hostAnswers: [] })]) {
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ ok: false, error: "admins_only" });
    }
  });
});

describe("saving a day's questions", () => {
  it("saves 7 questions for a future day, and the list shows them", async () => {
    useSession(await sessionFor("admin"));
    expect((await save({ date: ahead, questions: seven })).status).toBe(200);
    const body = await (await list()).json();
    expect(body.today).toBe(today);
    expect(body.days.find((d: { date: string }) => d.date === ahead).questions).toEqual(seven);
  });

  it("refuses the wrong number of questions with 400 questions_invalid", async () => {
    const response = await save({ date: ahead, questions: seven.slice(1) });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "questions_invalid" });
  });

  it("refuses a day that has started with 409 puzzle_started", async () => {
    const db = getPool();
    const has = await db.query("select 1 from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
    if (!has.rows.length) {
      await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, today, { ...draft, date: today }]);
      createdToday = true;
    }
    const response = await save({ date: today, questions: seven });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "puzzle_started" });
  });

  it("refuses a day that is over with 409 day_past", async () => {
    const response = await save({ date: yesterday, questions: seven });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "day_past" });
  });
});

describe("approving a drafted day", () => {
  it("lists the drafted day with its suggested host answers", async () => {
    const day = (await (await list()).json()).days.find((d: { date: string }) => d.date === draftDate);
    expect(day.live).toBeNull();
    expect(day.draft.map((q: { hostAnswers: string[] }) => q.hostAnswers)).toEqual(draft.questions.map((q) => q.host_answers));
  });

  it("refuses a host answer that breaks the rules with 422 and the problems, and saves nothing", async () => {
    const hostAnswers = draft.questions.map((q) => q.host_answers);
    hostAnswers[0] = ["not-an-entry"];
    const response = await approveDay({ date: draftDate, hostAnswers });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("puzzle_invalid");
    expect(body.problems.join("\n")).toContain("not-an-entry");
    const stored = await getPool().query("select 1 from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, draftDate]);
    expect(stored.rows.length).toBe(0);
  });

  it("approves the day with a changed host answer, and players' table holds that answer", async () => {
    const q1 = draft.questions[0];
    const other = q1.entries.find((e) => !q1.host_answers.includes(e.id))!.id;
    const hostAnswers = [[other], ...draft.questions.slice(1).map((q) => q.host_answers)];
    const response = await approveDay({ date: draftDate, hostAnswers });
    expect(response.status).toBe(200);
    approvedHere = true;
    const stored = await getPool().query<{ content: Puzzle }>("select content from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, draftDate]);
    expect(stored.rows[0].content.questions[0].host_answers).toEqual([other]);
    expect(stored.rows[0].content.questions[0].host_bank).toContain(other);
    const day = (await (await list()).json()).days.find((d: { date: string }) => d.date === draftDate);
    expect(day.live[0].hostAnswers).toEqual([other]);
  });

  it("answers 404 no_draft for a day with no drafted file", async () => {
    const response = await approveDay({ date: ahead, hostAnswers: [] });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "no_draft" });
  });
});
