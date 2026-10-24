// The admin puzzle routes against the local stack (`npm run test:db`; docs/milestones/M06-puzzle-entry.md): who may use
// them, saving a day's questions, and approving a drafted day with the host answers an admin chose. The drafted day is
// the fixture day (src/test/answer-fixture.ts), written to content/offbeat for this file and removed afterwards, with
// the day it approves.
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GAME_ID, type ApprovedPuzzle, type Puzzle } from "@/content/puzzle";
import { fixtureDraft, fixtureId } from "@/test/answer-fixture";
import { ensureFixtureBase, fixture } from "@/test/puzzles";
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
const DRAFTS = join(process.cwd(), "content", "offbeat");
let draftFile = "";
let createdDraftsFolder = false;
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
  draftDate = (await db.query<{ d: string }>("select (private.today() + 400)::text as d")).rows[0].d;
  await ensureFixtureBase();
  draft = fixtureDraft(draftDate);
  createdDraftsFolder = !existsSync(DRAFTS);
  mkdirSync(DRAFTS, { recursive: true });
  draftFile = join(DRAFTS, `${draftDate}.json`);
  if (existsSync(draftFile)) throw new Error(`${draftFile} exists; this test writes its own draft there`);
  writeFileSync(draftFile, JSON.stringify(draft));
});

afterAll(async () => {
  if (draftFile) rmSync(draftFile);
  if (createdDraftsFolder && readdirSync(DRAFTS).length === 0) {
    rmdirSync(DRAFTS);
    rmdirSync(join(process.cwd(), "content"));
  }
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
      await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, today, fixture(today)]);
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

  const refused = async (hostAnswers: string[][]) => {
    const response = await approveDay({ date: draftDate, hostAnswers });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("puzzle_invalid");
    const stored = await getPool().query("select 1 from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, draftDate]);
    expect(stored.rows.length).toBe(0);
    return body.problems as string[];
  };

  it("refuses a host answer from another category with 422 and the problem, and saves nothing", async () => {
    const hostAnswers = draft.questions.map((q) => q.host_answers);
    hostAnswers[0] = [fixtureId(1, "banana")];
    expect(await refused(hostAnswers)).toEqual([`${draftDate} q1: host bank entry ${fixtureId(1, "banana")} is not a fixture_animal`]);
  });

  it("refuses a host answer whose name needs a stolen letter", async () => {
    const hostAnswers = draft.questions.map((q) => q.host_answers);
    hostAnswers[1] = [fixtureId(1, "cherry")];
    expect(await refused(hostAnswers)).toEqual([`${draftDate} q2 thing "${fixtureId(1, "cherry")}": host answer's name "cherry" can't be typed without C`]);
  });

  it("approves the day with a changed host answer, and players' table holds that answer", async () => {
    const other = fixtureId(0, "cat");
    const hostAnswers = [[other], ...draft.questions.slice(1).map((q) => q.host_answers)];
    const response = await approveDay({ date: draftDate, hostAnswers });
    expect(response.status).toBe(200);
    approvedHere = true;
    const stored = await getPool().query<{ content: ApprovedPuzzle }>("select content from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, draftDate]);
    const content = stored.rows[0].content;
    expect(content.questions[0].host_answers).toEqual([other]);
    expect(content.questions[0].host_bank).toContain(other);
    // What approval adds: the moment answers are resolved as of, and each question's root and member count.
    expect(Date.parse(content.approved_at)).not.toBeNaN();
    expect(content.questions.map((q) => q.members)).toEqual(fixture(draftDate).questions.map((q) => q.members));
    expect(content.questions[0].root).toBe(fixture(draftDate).questions[0].root);
    const day = (await (await list()).json()).days.find((d: { date: string }) => d.date === draftDate);
    expect(day.live[0].hostAnswers).toEqual([other]);
  });

  it("answers 404 no_draft for a day with no drafted file", async () => {
    const response = await approveDay({ date: ahead, hostAnswers: [] });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "no_draft" });
  });
});
