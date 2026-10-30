// The admin puzzle routes against the local stack (`npm run test:db`; docs/milestones/M06-puzzle-entry.md): who may use
// them, and approving a drafted day with the host answers an admin chose. The drafted day is
// the fixture day (src/test/answer-fixture.ts), written to content/offbeat for this file and removed afterwards, with
// the day it approves; a second drafted day names a thing the base doesn't have, which the listing marks.
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type ApprovedPuzzle, type Puzzle } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import { fixtureDraft, fixtureId } from "@/test/answer-fixture";
import { ensureFixtureBase, fixture, removeFixtures } from "@/test/puzzles";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { GET } from "./route";
import { POST as approve } from "./approve/route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
let ahead = "";
let draftDate = "";
let draft: Puzzle;
let approvedHere = false;
const DRAFTS = join(process.cwd(), "content", "offbeat");
let draftFile = "";
let missingFile = "";
let missingDate = "";
const NOT_LOADED = fixtureId(0, "not-loaded");
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
const approveDay = (body: unknown) => approve(apiRequest("/api/admin/puzzles/approve", { method: "POST", body }));

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  ({ ahead } = (
    await db.query<{ ahead: string }>(
      "select (private.today() + 500)::text as ahead",
    )
  ).rows[0]);
  draftDate = (await db.query<{ d: string }>("select (private.today() + 400)::text as d")).rows[0].d;
  await ensureFixtureBase();
  draft = fixtureDraft(draftDate);
  // A bank answer players can't type: cherry, once C is gone at question 2 (the page marks it, M14 14b-2b-2b).
  draft.questions[1].host_bank.push(fixtureId(1, "cherry"));
  createdDraftsFolder = !existsSync(DRAFTS);
  mkdirSync(DRAFTS, { recursive: true });
  draftFile = join(DRAFTS, `${draftDate}.json`);
  if (existsSync(draftFile)) throw new Error(`${draftFile} exists; this test writes its own draft there`);
  writeFileSync(draftFile, JSON.stringify(draft));
  // A drafted day whose first question's host answer isn't in this database (plor.app's answer database is empty by
  // choice; 13f-3b-2).
  missingDate = (await db.query<{ d: string }>("select (private.today() + 401)::text as d")).rows[0].d;
  const missing = fixtureDraft(missingDate);
  missing.questions[0].host_bank.push(NOT_LOADED);
  missing.questions[0].host_answers = [NOT_LOADED];
  missingFile = join(DRAFTS, `${missingDate}.json`);
  if (existsSync(missingFile)) throw new Error(`${missingFile} exists; this test writes its own draft there`);
  writeFileSync(missingFile, JSON.stringify(missing));
});

afterAll(async () => {
  if (draftFile) rmSync(draftFile);
  if (missingFile) rmSync(missingFile);
  if (createdDraftsFolder && readdirSync(DRAFTS).length === 0) {
    rmdirSync(DRAFTS);
    rmdirSync(join(process.cwd(), "content"));
  }
  const db = getPool();
  if (approvedHere) await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, draftDate]);
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeFixtures();
  await db.end();
});

describe("who may use the admin puzzle routes", () => {
  it("answers 401 when signed out", async () => {
    useSession(new Map());
    for (const response of [await list(), await approveDay({ date: draftDate, hostAnswers: [] })]) {
      expect(response.status).toBe(401);
    }
  });

  it("answers 403 admins_only to a signed-in player who isn't an admin, before reading anything else", async () => {
    useSession(await sessionFor("player"));
    for (const response of [await list(), await approveDay({ date: draftDate, hostAnswers: [] })]) {
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ ok: false, error: "admins_only" });
    }
  });
});

describe("approving a drafted day", () => {
  beforeEach(async () => useSession(await sessionFor("admin")));

  it("lists the drafted day with its suggested host answers", async () => {
    const day = (await (await list()).json()).days.find((d: { date: string }) => d.date === draftDate);
    expect(day.live).toBeNull();
    expect(day.draft.map((q: { hostAnswers: string[] }) => q.hostAnswers)).toEqual(draft.questions.map((q) => q.host_answers));
    // Each bank answer says which stolen letter its name has, by the rule approving checks (M14 14b-2b-2b): cherry
    // can't be typed once C is gone at question 2, and the suggested host answers can all be typed.
    type Choice = { id: string; stolen: string | null };
    expect(day.draft[1].hostBank.find((a: Choice) => a.id === fixtureId(1, "cherry")).stolen).toBe("c");
    const suggested = day.draft.flatMap((q: { hostAnswers: string[]; hostBank: Choice[] }) => q.hostBank.filter((a) => q.hostAnswers.includes(a.id)));
    expect(suggested.map((a: Choice) => a.stolen)).toEqual(suggested.map(() => null));
  });

  it("lists a host answer the base doesn't have with no name, never its ID as one", async () => {
    const day = (await (await list()).json()).days.find((d: { date: string }) => d.date === missingDate);
    expect(day.draft[0].hostAnswers).toEqual([NOT_LOADED]);
    expect(day.draft[0].hostBank.find((a: { id: string }) => a.id === NOT_LOADED)).toEqual({ id: NOT_LOADED, name: null, stolen: null });
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
    const stored = await getPool().query<{ content: ApprovedPuzzle & { approved_at: string } }>("select content from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, draftDate]);
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
