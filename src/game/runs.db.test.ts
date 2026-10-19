// The run routes end to end against the local stack (run with `npm run test:db`): real sign-in, the real game
// tables and their triggers, and route handlers called the way the browser calls them.
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as missRoute } from "@/app/api/run/miss/route";
import { GET as stateRoute } from "@/app/api/run/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { GAME_ID, type Puzzle, type Question } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { matchAnswer } from "./matching";
import { publicQuestion } from "./payload";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const created: { date: string }[] = [];
let today = "";
let yesterday = "";
let puzzle: Puzzle;

// A real puzzle file under another date: its content is valid format 1 and has QUESTIONS_PER_DAY questions.
function fixture(date: string): Puzzle {
  return { ...JSON.parse(readFileSync("content/offbeat/2026-10-26.json", "utf8")), date };
}

// Uses the puzzle already published for a day, or adds the fixture (removed again in afterAll).
async function ensurePuzzle(date: string): Promise<Puzzle> {
  const db = getPool();
  const { rows } = await db.query<{ content: Puzzle }>("select content from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, date]);
  if (rows.length) return rows[0].content;
  await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, date, fixture(date)]);
  created.push({ date });
  return fixture(date);
}

function safeEntry(q: Question): string {
  const id = q.entries.map((e) => e.id).find((entryId) => matchAnswer(q, entryId) === "not_matched");
  if (!id) throw new Error(`no safe answer for "${q.prompt}"`);
  return id;
}

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const state = () => call(stateRoute(apiRequest("/api/run", { method: "GET" })));
const start = () => call(startRoute(apiRequest("/api/run/start", { method: "POST" })));
const answer = (index: number, entryId: string) => call(answerRoute(apiRequest("/api/run/answer", { method: "POST", body: { index, entryId } })));
const miss = (index: number, text: string) => call(missRoute(apiRequest("/api/run/miss", { method: "POST", body: { index, text } })));

async function newPlayer(name: string): Promise<{ userId: string; session: Map<string, string> }> {
  const { session } = await signIn(`${RUN}-${name}@example.test`);
  const r = await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: `${name}${RUN}` } }));
  expect(r.status).toBe(201);
  const { rows } = await getPool().query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${name}@example.test`]);
  return { userId: rows[0].id, session };
}

beforeAll(async () => {
  useLocalStack();
  const { rows } = await getPool().query<{ today: string; yesterday: string }>(
    "select private.today()::text as today, (private.today() - 1)::text as yesterday",
  );
  ({ today, yesterday } = rows[0]);
  puzzle = await ensurePuzzle(today);
  await ensurePuzzle(yesterday);
});

afterAll(async () => {
  const db = getPool();
  // Deleting the auth users cascades to profiles, runs, answers and misses; then the fixture puzzles go.
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  for (const { date } of created) await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, date]);
  await db.end();
});

describe("a run, step by step", () => {
  let player: { userId: string; session: Map<string, string> };

  it("shows today's run as not started, with no question yet", async () => {
    player = await newPlayer("p");
    useSession(player.session);
    expect(await state()).toEqual({
      status: 200,
      body: { ok: true, run: { date: today, status: "not_started", total: puzzle.questions.length, answered: [], question: null } },
    });
  });

  it("starts today's run on the first question, and starting again returns the same run", async () => {
    const first = await start();
    expect(first.status).toBe(200);
    expect(first.body.run).toMatchObject({ date: today, status: "in_progress", answered: [] });
    // The question is exactly the public view of question 1: nothing about the host is added on the way out.
    expect(first.body.run.question).toEqual(publicQuestion(puzzle, 0));
    expect(await start()).toEqual(first);
  });

  it("never sends host data for a question that hasn't been answered", async () => {
    const { body } = await state();
    expect(JSON.stringify(body.run.question)).not.toMatch(/host|match_group/);
    expect(body.run.answered).toEqual([]);
  });

  it("rejects an entry that isn't in the question's accepted bank", async () => {
    expect(await answer(0, "not-an-entry")).toEqual({ status: 400, body: { ok: false, error: "invalid_entry" } });
  });

  it("refuses to skip ahead", async () => {
    expect(await answer(1, safeEntry(puzzle.questions[1]))).toEqual({ status: 409, body: { ok: false, error: "out_of_order" } });
  });

  it("answers a question, reveals its host answers and serves the next question", async () => {
    const q = puzzle.questions[0];
    const entryId = safeEntry(q);
    const { status, body } = await answer(0, entryId);
    expect(status).toBe(200);
    expect(body.run.answered).toEqual([
      {
        index: 0,
        prompt: q.prompt,
        answer: { id: entryId, name: q.entries.find((e) => e.id === entryId)!.name },
        matched: false,
        hostAnswers: q.host_answers.map((id) => ({ id, name: q.entries.find((e) => e.id === id)!.name })),
      },
    ]);
    expect(body.run.question).toEqual(publicQuestion(puzzle, 1));
    // Only question 1's host answers are in the response; question 2's are not marked anywhere.
    expect(JSON.stringify(body.run.question)).not.toMatch(/host/);
  });

  it("returns the stored result for a retry, and 409 already_answered for a different entry", async () => {
    const q = puzzle.questions[0];
    const again = await answer(0, safeEntry(q));
    expect(again.status).toBe(200);
    expect(again.body.run.answered).toHaveLength(1);
    const other = q.entries.map((e) => e.id).find((id) => id !== safeEntry(q))!;
    expect(await answer(0, other)).toEqual({ status: 409, body: { ok: false, error: "already_answered" } });
  });

  it("gives two concurrent identical answers the same result, never a 500 (ROADMAP item)", async () => {
    const entryId = safeEntry(puzzle.questions[1]);
    const results = await Promise.all([answer(1, entryId), answer(1, entryId)]);
    for (const r of results) expect([200, 409]).toContain(r.status);
    expect(results.some((r) => r.status === 200)).toBe(true);
    expect((await state()).body.run.answered).toHaveLength(2);
  });

  it("lets one of two concurrent different answers win and refuses the other with 409, never a 500", async () => {
    const q = puzzle.questions[2];
    const safe = q.entries.map((e) => e.id).filter((id) => matchAnswer(q, id) === "not_matched");
    const results = await Promise.all([answer(2, safe[0]), answer(2, safe[1])]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(results.find((r) => r.status === 409)!.body.error).toBe("already_answered");
  });

  it("logs a miss for the current question at no cost, and rejects (without logging) more than 40 characters", async () => {
    const count = async () =>
      (await getPool().query<{ n: number }>("select count(*)::int as n from private.missed_answer where user_id = $1", [player.userId])).rows[0].n;
    expect(await miss(3, "  a thing nobody listed  ")).toEqual({ status: 200, body: { ok: true } });
    expect(await miss(3, "x".repeat(41))).toEqual({ status: 400, body: { ok: false, error: "text_invalid" } });
    expect(await miss(5, "later question")).toEqual({ status: 409, body: { ok: false, error: "not_current_question" } });
    expect(await count()).toBe(1);
    const { rows } = await getPool().query<{ typed: string }>("select typed from private.missed_answer where user_id = $1", [player.userId]);
    expect(rows[0].typed).toBe("a thing nobody listed");
    expect((await state()).body.run).toMatchObject({ status: "in_progress", question: { index: 3 } });
  });

  it("ends the run on a host answer and refuses anything after it", async () => {
    const q = puzzle.questions[3];
    const { body } = await answer(3, q.host_answers[0]);
    expect(body.run.status).toBe("died");
    expect(body.run.question).toBeNull();
    expect(body.run.answered[3]).toMatchObject({ matched: true, answer: { id: q.host_answers[0] } });
    expect(await answer(4, safeEntry(puzzle.questions[4]))).toEqual({ status: 409, body: { ok: false, error: "run_over" } });
  });
});

describe("other ways a run ends", () => {
  it("survives when every question is answered without a match", async () => {
    const player = await newPlayer("s");
    useSession(player.session);
    await start();
    let last;
    for (let i = 0; i < puzzle.questions.length; i++) last = await answer(i, safeEntry(puzzle.questions[i]));
    expect(last!.body.run).toMatchObject({ status: "survived", question: null });
    expect(last!.body.run.answered).toHaveLength(puzzle.questions.length);
  });

  it("refuses an answer to a run from a day that has ended, with 409 day_over from the trigger", async () => {
    const player = await newPlayer("d");
    useSession(player.session);
    // A run started yesterday, as if the player had started just before midnight.
    await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [player.userId, GAME_ID, yesterday]);
    expect(await answer(0, safeEntry(puzzle.questions[0]))).toEqual({ status: 409, body: { ok: false, error: "day_over" } });
  });

  it("shows a retried answer from a day that has ended as an abandoned run, not a blank state (2b review)", async () => {
    const player = await newPlayer("r");
    useSession(player.session);
    const entryId = safeEntry(puzzle.questions[0]);
    // Yesterday's run with its first answer stored, as if answered just before midnight. The trigger rightly refuses
    // that insert today, so it goes in with triggers off for this one local superuser session.
    const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
    try {
      const client = await admin.connect();
      try {
        await client.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [player.userId, GAME_ID, yesterday]);
        await client.query("set session_replication_role = replica");
        await client.query(
          "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 0, $4, false)",
          [player.userId, GAME_ID, yesterday, entryId],
        );
      } finally {
        client.release();
      }
    } finally {
      await admin.end();
    }
    const retry = await answer(0, entryId);
    expect(retry.status).toBe(200);
    expect(retry.body.run).toMatchObject({ date: yesterday, status: "abandoned", question: null });
  });

  it("needs a username before a run can start", async () => {
    useSession((await signIn(`${RUN}-n@example.test`)).session);
    expect(await start()).toEqual({ status: 409, body: { ok: false, error: "no_profile" } });
  });
});
