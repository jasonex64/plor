// The run routes end to end against the local stack (run with `npm run test:db`): real sign-in, the real game
// tables and their triggers, and route handlers called the way the browser calls them.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseError, Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { GET as stateRoute } from "@/app/api/run/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import { GAME_ID, type Puzzle, type Question } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { matchAnswer } from "./matching";
import { startRun } from "./runs";
import { publicQuestion } from "./payload";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const created: { date: string }[] = [];
let today = "";
let yesterday = "";
let puzzle: Puzzle;
let yesterdayPuzzle: Puzzle;

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
const answerText = (index: number, text: string) => call(answerRoute(apiRequest("/api/run/answer", { method: "POST", body: { index, text } })));
// Types the entry's name, as a player would. The name comes from the puzzle of the run being answered: today's,
// or yesterday's for a run from a day that has ended (the two can differ on a local stack with published days).
const nameIn = (p: Puzzle, index: number, entryId: string) => p.questions[index].entries.find((e) => e.id === entryId)!.name;
const answer = (index: number, entryId: string) => answerText(index, nameIn(puzzle, index, entryId));

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
  yesterdayPuzzle = await ensurePuzzle(yesterday);
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
      body: { ok: true, run: { date: today, status: "not_started", total: puzzle.questions.length, answered: [], question: null, msLeft: null } },
    });
  });

  it("starts today's run on the first question, and starting again returns the same run", async () => {
    const first = await start();
    expect(first.status).toBe(200);
    expect(first.body.run).toMatchObject({ date: today, status: "in_progress", answered: [] });
    // The question is exactly the public view of question 1: nothing about the host is added on the way out.
    expect(first.body.run.question).toEqual(publicQuestion(puzzle, 0));
    // Starting again is the same run: everything matches except the time left, which has only gone down.
    const again = await start();
    expect({ ...again, body: { ...again.body, run: { ...again.body.run, msLeft: 0 } } }).toEqual({ ...first, body: { ...first.body, run: { ...first.body.run, msLeft: 0 } } });
    expect(again.body.run.msLeft).toBeLessThanOrEqual(first.body.run.msLeft);
  });

  it("never sends host data for a question that hasn't been answered", async () => {
    const { body } = await state();
    expect(JSON.stringify(body.run.question)).not.toMatch(/host|match_group/);
    expect(body.run.answered).toEqual([]);
  });

  it("refuses empty text with 400", async () => {
    expect(await answerText(0, "   ")).toEqual({ status: 400, body: { ok: false, error: "bad_request" } });
  });

  it("refuses to skip ahead", async () => {
    expect(await answer(1, safeEntry(puzzle.questions[1]))).toEqual({ status: 409, body: { ok: false, error: "out_of_order" } });
  });

  it("answers a question, reveals its host answers and serves the next question", async () => {
    const q = puzzle.questions[0];
    const entryId = safeEntry(q);
    const { status, body } = await answer(0, entryId);
    expect(status).toBe(200);
    expect(body.notInList).toBe(false);
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

  it("treats text that names no entry as a free retry logged as a miss, and rejects (without logging) more than 40 characters", async () => {
    const count = async () =>
      (await getPool().query<{ n: number }>("select count(*)::int as n from private.missed_answer where user_id = $1", [player.userId])).rows[0].n;
    const retry = await answerText(3, "  a thing nobody listed  ");
    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({ ok: true, notInList: true, run: { status: "in_progress", question: { index: 3 } } });
    expect(retry.body.run.answered).toHaveLength(3);
    expect(await answerText(3, "x".repeat(41))).toEqual({ status: 400, body: { ok: false, error: "text_invalid" } });
    expect(await answerText(5, "later question")).toEqual({ status: 409, body: { ok: false, error: "not_current_question" } });
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
    const entryId = safeEntry(yesterdayPuzzle.questions[0]);
    expect(await answerText(0, nameIn(yesterdayPuzzle, 0, entryId))).toEqual({ status: 409, body: { ok: false, error: "day_over" } });
  });

  it("shows a retried answer from a day that has ended as an abandoned run, not a blank state (2b review)", async () => {
    const player = await newPlayer("r");
    useSession(player.session);
    const entryId = safeEntry(yesterdayPuzzle.questions[0]);
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
    const retry = await answerText(0, nameIn(yesterdayPuzzle, 0, entryId));
    expect(retry.status).toBe(200);
    expect(retry.body.run).toMatchObject({ date: yesterday, status: "abandoned", question: null });
  });

  it("needs a username before a run can start", async () => {
    useSession((await signIn(`${RUN}-n@example.test`)).session);
    expect(await start()).toEqual({ status: 409, body: { ok: false, error: "no_profile" } });
  });
});

// B1 (M02 2f): a run has two foreign keys, and only the one to private.puzzle means "nothing published today".
// Each case runs on its own client inside a transaction that is rolled back, so the shared fixtures stay as they were.
// M13 13c-2: 20 seconds per question (human, 2026-10-21). Time passing is simulated by moving the run's stored
// times back: a question starts at the last answer's created_at, or the run's started_at (the timer migration).
describe("the 20-second timer", () => {
  async function ageRun(userId: string, seconds: number) {
    const db = getPool();
    await db.query("update private.run set started_at = started_at - make_interval(secs => $2) where user_id = $1 and puzzle_date = $3::date", [userId, seconds, today]);
    await db.query("update private.run_event set created_at = created_at - make_interval(secs => $2) where user_id = $1 and puzzle_date = $3::date", [userId, seconds, today]);
  }
  const events = async (userId: string) =>
    (await getPool().query<{ n: number }>("select count(*)::int as n from private.run_event where user_id = $1", [userId])).rows[0].n;

  it("gives the question 20 seconds from Start, and a refresh keeps the same deadline", async () => {
    const player = await newPlayer("t1");
    useSession(player.session);
    const { body } = await start();
    expect(body.run.msLeft).toBeGreaterThan(19_000);
    expect(body.run.msLeft).toBeLessThanOrEqual(20_000);
    await ageRun(player.userId, 5);
    const after = (await state()).body.run;
    expect(after.status).toBe("in_progress");
    expect(after.msLeft).toBeGreaterThan(14_000);
    expect(after.msLeft).toBeLessThanOrEqual(15_000);
  });

  it("counts an answer just before the deadline, and the next question gets its own 20 seconds", async () => {
    const player = await newPlayer("t2");
    useSession(player.session);
    await start();
    await ageRun(player.userId, 18);
    const { status, body } = await answer(0, safeEntry(puzzle.questions[0]));
    expect(status).toBe(200);
    expect(body.run).toMatchObject({ status: "in_progress", question: { index: 1 } });
    expect(body.run.msLeft).toBeGreaterThan(19_000);
  });

  it("ends the run when an answer comes after the deadline, and stores nothing for it", async () => {
    const player = await newPlayer("t3");
    useSession(player.session);
    await start();
    await answer(0, safeEntry(puzzle.questions[0]));
    await ageRun(player.userId, 21);
    const { status, body } = await answer(1, safeEntry(puzzle.questions[1]));
    expect(status).toBe(200);
    expect(body.run).toMatchObject({ status: "timed_out", question: null, msLeft: null });
    expect(body.run.answered).toHaveLength(1);
    expect(await events(player.userId)).toBe(1);
  });

  it("shows a run whose time ran out with no answer as timed out, without a write", async () => {
    const player = await newPlayer("t4");
    useSession(player.session);
    await start();
    await ageRun(player.userId, 21);
    expect((await state()).body.run).toMatchObject({ status: "timed_out", answered: [], question: null });
  });

  it("shows the ending, not a 409, for text that names no entry after the deadline", async () => {
    const player = await newPlayer("t5");
    useSession(player.session);
    await start();
    await ageRun(player.userId, 21);
    const { status, body } = await answerText(0, "a thing nobody listed");
    expect(status).toBe(200);
    expect(body).toMatchObject({ notInList: false, run: { status: "timed_out" } });
  });
});

describe("startRun's foreign keys", () => {
  async function inRolledBackTransaction(fn: (client: PoolClient) => Promise<void>): Promise<void> {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      await fn(client);
    } finally {
      await client.query("rollback");
      client.release();
    }
  }

  it("maps the puzzle foreign key to 404 no_puzzle_today", async () => {
    const { userId } = await newPlayer("f");
    await inRolledBackTransaction(async (client) => {
      await client.query("delete from private.run where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
      await client.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, today]);
      await expect(startRun(client, userId)).rejects.toMatchObject({ code: "no_puzzle_today", status: 404 });
    });
  });

  it("leaves the user foreign key as the database error, a 500 at the route", async () => {
    await inRolledBackTransaction(async (client) => {
      const failure = startRun(client, randomUUID());
      await expect(failure).rejects.toBeInstanceOf(DatabaseError);
      await expect(failure).rejects.toMatchObject({ code: "23503", constraint: "run_user_id_fkey" });
    });
  });
});
