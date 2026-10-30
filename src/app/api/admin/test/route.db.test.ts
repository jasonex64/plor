// The test-run route against the local stack (`npm run test:db`; docs/milestones/M14-14b-11-test-runs.md): who may use
// it, an approved day played past, today and upcoming, a draft played with the page's own host answers or refused with
// approval's problems, the same results as play, and nothing written. The draft is the fixture day
// (src/test/answer-fixture.ts), written to content/offbeat for this file and removed afterwards.
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as nextRoute } from "@/app/api/run/next/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { POST as approveRoute } from "@/app/api/admin/puzzles/approve/route";
import { type ApprovedPuzzle, type Puzzle } from "@/content/puzzle";
import type { AnsweredQuestion } from "@/game/runs";
import { getPool } from "@/lib/db";
import { fixtureDraft, fixtureId } from "@/test/answer-fixture";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, hostName, removeFixtures, safeEntry, typeableName } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { POST } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const DRAFTS = join(process.cwd(), "content", "offbeat");
let createdDraftsFolder = false;
let draftFile = "";
let today = "";
let ahead = "";
let past = "";
let empty = "";
let draftDate = "";
let puzzle: ApprovedPuzzle;
let draft: Puzzle;
const sessions = new Map<string, Map<string, string>>();

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
type Moves = { texts?: string[]; open?: boolean; timedOut?: boolean; text?: string | null; hostAnswers?: string[][] };
const play = (date: string, { texts = [], open = false, timedOut = false, text = null, hostAnswers }: Moves = {}) =>
  call(POST(apiRequest("/api/admin/test", { method: "POST", body: { date, texts, open, timedOut, text, hostAnswers } })));
const safe = (p: ApprovedPuzzle, index: number) => typeableName(p, index, safeEntry(p, index))!;

// What a test run must leave as it was (answer 2: "Nothing at all").
const TABLES = ["puzzle", "run", "run_event", "question_open", "missed_answer", "miss_review", "points_ledger", "thing_alias", "category_extra"];
async function counts(): Promise<number[]> {
  const { rows } = await getPool().query<{ n: number[] }>(`select array[${TABLES.map((t) => `(select count(*)::int from private.${t})`).join(", ")}] as n`);
  return rows[0].n;
}

// Signs in once per role, inside a test (signIn polls the local inbox). The admin is added to private.admin and given
// a profile, which play's routes need, the first time; the profile is written directly, as this file tests no profile.
async function sessionFor(role: "admin" | "player"): Promise<Map<string, string>> {
  if (!sessions.has(role)) {
    const { session } = await signIn(`${RUN}-tr${role}@example.test`);
    sessions.set(role, session);
    if (role === "admin") {
      const email = `${RUN}-tradmin@example.test`;
      await getPool().query("insert into private.admin (user_id) select id from auth.users where email = $1", [email]);
      await getPool().query("insert into private.profile (user_id, username) select id, $2 from auth.users where email = $1", [email, `tradmin${RUN}`]);
    }
  }
  return sessions.get(role)!;
}

beforeAll(async () => {
  useLocalStack();
  ({ today, ahead, past, empty, draftDate } = (
    await getPool().query<{ today: string; ahead: string; past: string; empty: string; draftDate: string }>(
      `select private.today()::text as today, (private.today() + 420)::text as ahead, (private.today() - 420)::text as past,
              (private.today() + 430)::text as empty, (private.today() + 440)::text as "draftDate"`,
    )
  ).rows[0]);
  puzzle = await ensurePuzzle(today);
  await ensurePuzzle(ahead);
  await ensurePuzzle(past);
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
  // Deleting the auth users cascades to the admin row, the profile and the run played through play's routes.
  await db.query("delete from auth.users where email like $1", [`${RUN}-tr%@example.test`]);
  await removeFixtures();
  await db.end();
});

describe("who may play a test run", () => {
  it("answers 401 when signed out", async () => {
    useSession(new Map());
    expect((await play(today)).status).toBe(401);
  });

  it("answers 403 admins_only to a player who isn't an admin, before reading the date", async () => {
    useSession(await sessionFor("player"));
    const response = await call(POST(apiRequest("/api/admin/test", { method: "POST", body: { date: "not a date" } })));
    expect(response).toEqual({ status: 403, body: { ok: false, error: "admins_only" } });
  });
});

describe("a test run of an approved day", () => {
  beforeEach(async () => useSession(await sessionFor("admin")));

  it("plays today's day step by step, as play's state, and writes nothing", async () => {
    const before = await counts();
    expect((await play(today)).body.run).toMatchObject({ status: "not_started", total: 7, question: null });

    const opened = (await play(today, { open: true })).body.run;
    expect(opened).toMatchObject({ status: "in_progress", question: { index: 0, prompt: puzzle.questions[0].prompt } });
    // The question's 20 seconds, from private.question_deadline (DECISIONS.md, Game 1: Timer).
    expect(opened.msLeft).toBeGreaterThan(19_000);
    expect(opened.msLeft).toBeLessThanOrEqual(20_000);

    const retry = (await play(today, { open: true, text: "zzqx not a thing" })).body;
    expect(retry.notInList).toBe(true);
    expect(retry.run).toMatchObject({ status: "in_progress", question: { index: 0 } });

    const revealed = (await play(today, { open: true, text: safe(puzzle, 0) })).body;
    expect(revealed.notInList).toBe(false);
    expect(revealed.run).toMatchObject({ status: "in_progress", question: null, next: { steals: "c" } });
    expect(revealed.run.answered[0]).toMatchObject({ index: 0, matched: false, points: 25 });

    const second = (await play(today, { texts: [safe(puzzle, 0)], open: true })).body.run;
    expect(second).toMatchObject({ status: "in_progress", question: { index: 1, stolen: ["c"] } });
    const caught = (await play(today, { texts: [safe(puzzle, 0)], open: true, text: hostName(puzzle, 1) })).body.run;
    expect(caught.status).toBe("died");
    expect(caught.answered[1]).toMatchObject({ matched: true, points: 0 });

    expect(await counts()).toEqual(before);
  });

  it("ends a run whose time ran out in the browser", async () => {
    expect((await play(today, { texts: [safe(puzzle, 0)], open: true, timedOut: true })).body.run.status).toBe("timed_out");
  });

  it("refuses a stolen letter as play does, and an answer to a question that isn't open", async () => {
    expect((await play(today, { texts: [safe(puzzle, 0)], open: true, text: "cherry" })).body).toEqual({ ok: false, error: "stolen_letter" });
    expect((await play(today, { texts: [safe(puzzle, 0)], text: safe(puzzle, 1) })).status).toBe(409);
  });

  it("plays an upcoming day and a past one", async () => {
    for (const date of [ahead, past]) {
      const p = await ensurePuzzle(date);
      const run = (await play(date, { open: true, text: safe(p, 0) })).body.run;
      expect(run.date).toBe(date);
      expect(run.answered[0]).toMatchObject({ matched: false });
    }
  });

  it("answers 404 for a day with no approved puzzle", async () => {
    expect((await play(empty)).body).toEqual({ ok: false, error: "no_puzzle" });
  });

  it("gives the same results as play for the same texts", async () => {
    const texts = [safe(puzzle, 0), hostName(puzzle, 1)];
    const test = (await play(today, { texts, open: true })).body.run;
    expect((await call(startRoute(apiRequest("/api/run/start", { method: "POST" })))).status).toBe(200);
    await call(answerRoute(apiRequest("/api/run/answer", { method: "POST", body: { index: 0, text: texts[0] } })));
    await call(nextRoute(apiRequest("/api/run/next", { method: "POST" })));
    const real = (await call(answerRoute(apiRequest("/api/run/answer", { method: "POST", body: { index: 1, text: texts[1] } })))).body.run;
    const results = (answered: AnsweredQuestion[]) => answered.map(({ answer, matched, hostAnswers, points, bonus }) => ({ answer, matched, hostAnswers, points, bonus }));
    expect(test.status).toBe(real.status);
    expect(results(test.answered)).toEqual(results(real.answered));
  });
});

describe("a test run of a draft", () => {
  beforeEach(async () => useSession(await sessionFor("admin")));
  const drawn = () => draft.questions.map((q) => q.host_answers);
  const bear = () => typeableName(puzzle, 0, fixtureId(0, "bear"))!;

  it("plays the draft with the host answers the page shows, saved or not, and writes nothing", async () => {
    const before = await counts();
    // As drawn, the Wind says bear; with dog chosen on the page instead, bear climbs and dog is caught (answer 9).
    expect((await play(draftDate, { open: true, text: bear(), hostAnswers: drawn() })).body.run.answered[0].matched).toBe(true);
    const changed = [[fixtureId(0, "dog")], ...drawn().slice(1)];
    expect((await play(draftDate, { open: true, text: bear(), hostAnswers: changed })).body.run.answered[0].matched).toBe(false);
    expect((await play(draftDate, { open: true, text: "dog", hostAnswers: changed })).body.run.answered[0].matched).toBe(true);
    expect(await counts()).toEqual(before);
  });

  it("refuses a draft approval would refuse, with approval's own problems (answer 11)", async () => {
    const wrong = [[fixtureId(1, "apple")], ...drawn().slice(1)];
    const test = await play(draftDate, { hostAnswers: wrong });
    expect(test.status).toBe(422);
    const approval = await call(approveRoute(apiRequest("/api/admin/puzzles/approve", { method: "POST", body: { date: draftDate, hostAnswers: wrong } })));
    expect(approval.status).toBe(422);
    expect(test.body).toEqual(approval.body);
  });

  it("answers 404 for a date with no draft", async () => {
    expect((await play(empty, { hostAnswers: drawn() })).body).toEqual({ ok: false, error: "no_draft" });
  });
});
