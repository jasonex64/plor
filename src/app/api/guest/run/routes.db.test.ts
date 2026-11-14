// The guest run routes end to end against the local stack (run with `npm run test:db`; docs/milestones/M18-guest-play.md,
// 18c). The routes connect as postgres locally; the guest module's own work as plor_app, with its grants, is in
// src/game/guest-runs.plor-app.db.test.ts. The bot check calls the real Siteverify with Cloudflare's published test
// secrets (developers.cloudflare.com/turnstile/troubleshooting/testing/); only "unreachable" stubs the call.
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type ApprovedPuzzle } from "@/content/puzzle";
import { hashKey } from "@/lib/auth-limits";
import { getPool } from "@/lib/db";
import { GAME_ID } from "@/platform/game";
import { TURNSTILE_TEST_PASS_SECRET, useLocalStack } from "@/test/local-stack";
import { ensurePuzzle, hostName, removeFixtures, safeEntries, typeableName } from "@/test/puzzles";
import { apiRequest, cookieJar, cookieOptions } from "@/test/request-scope";
import { resolveTyped } from "@/game/matching";
import { POST as answerRoute } from "./answer/route";
import { POST as nextRoute } from "./next/route";
import { GET as stateRoute } from "./route";
import { POST as startRoute } from "./start/route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));
// The real matcher, wrapped so a test can see whether it was called (audit W1: matching long text is the cost).
vi.mock("@/game/matching", async (importActual) => {
  const actual = await importActual<typeof import("@/game/matching")>();
  return { ...actual, resolveTyped: vi.fn(actual.resolveTyped) };
});

const PASS_SECRET = TURNSTILE_TEST_PASS_SECRET;
const FAIL_SECRET = "2x0000000000000000000000000000000AA";
const DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const COOKIE = "plor_guest";

let today = "";
let yesterday = "";
let puzzle: ApprovedPuzzle;

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const start = (body: unknown = { turnstileToken: DUMMY_TOKEN }) => call(startRoute(apiRequest("/api/guest/run/start", { method: "POST", body })));
const state = () => call(stateRoute(apiRequest("/api/guest/run", { method: "GET" })));
const next = () => call(nextRoute(apiRequest("/api/guest/run/next", { method: "POST" })));
const answerText = (index: number, text: string) => call(answerRoute(apiRequest("/api/guest/run/answer", { method: "POST", body: { index, text } })));
const answerEntry = (index: number, entryId: string) => answerText(index, typeableName(puzzle, index, entryId)!);
const safe = (index: number) => safeEntries(puzzle, index)[0];

const tokenHash = () => hashKey(cookieJar.get(COOKIE)!);

// How many rows, in every guest table, carry this hash.
async function rowsWith(hash: string): Promise<number> {
  const tables = ["guest_run", "guest_run_event", "guest_question_open", "guest_round_word", "guest_round_reject"];
  const { rows } = await getPool().query<{ n: number }>(
    `select (${tables.map((t) => `(select count(*) from private.${t} where token_hash = $1)`).join(" + ")})::int as n`,
    [hash],
  );
  return rows[0].n;
}
async function guestRuns(): Promise<number> {
  return (await getPool().query<{ n: number }>("select count(*)::int as n from private.guest_run")).rows[0].n;
}
async function tallied(date: string, index: number, entryId: string): Promise<number> {
  const { rows } = await getPool().query<{ n: number }>(
    "select coalesce(sum(n), 0)::int as n from private.guest_tally where puzzle_date = $1::date and question_idx = $2 and entry_id = $3",
    [date, index, entryId],
  );
  return rows[0].n;
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

beforeEach(() => {
  cookieJar.clear();
  cookieOptions.clear();
  // A test below may have swapped the secret.
  vi.stubEnv("TURNSTILE_SECRET_KEY", PASS_SECRET);
});

afterAll(async () => {
  const db = getPool();
  // The fixture days are ours alone (ensurePuzzle refuses a real one), so what guests left on them goes: their runs, which
  // reference the puzzle, and the tally, which has no foreign key and no other way out.
  await db.query("delete from private.guest_run where puzzle_date = any($1::date[])", [[today, yesterday]]);
  await db.query("delete from private.guest_tally where puzzle_date = any($1::date[])", [[today, yesterday]]);
  await removeFixtures();
  await db.end();
});

describe("a guest run, step by step", () => {
  it("starts with the cookie set as designed, plays to a catch, shows the result again and keeps the run until its day closes", async () => {
    const started = await start();
    expect(started.status).toBe(200);
    expect(started.body.run).toMatchObject({ status: "in_progress", answered: [], question: { index: 0 } });
    // A session cookie, readable by no script, sent only to the guest routes (M18 ticket, Design, "The token").
    expect(cookieJar.get(COOKIE)).toMatch(/^[A-Za-z0-9_-]{27}$/);
    expect(cookieOptions.get(COOKIE)).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/api/guest" });
    const hash = tokenHash();
    expect(await rowsWith(hash)).toBe(1);

    const first = await answerEntry(0, safe(0));
    expect(first.status).toBe(200);
    expect(first.body.run.answered).toHaveLength(1);
    expect((await next()).body.run.question.index).toBe(1);
    expect((await state()).body.run).toMatchObject({ status: "in_progress", question: { index: 1 } });

    // The host's own answer catches the guest: the response is the whole result, and the run's rows stay (M19 answers 3 and 10).
    const last = await answerText(1, hostName(puzzle, 1));
    expect(last.status).toBe(200);
    expect(last.body.run).toMatchObject({ status: "died", question: null });
    expect(last.body.run.answered).toHaveLength(2);
    expect(await rowsWith(hash)).toBe(4);

    // A retry of the final answer is the stored result, as a player's is; Next on a run that is over is 409 run_over.
    expect(await answerText(1, hostName(puzzle, 1))).toMatchObject({ status: 200, body: { run: { status: "died" } } });
    expect(await next()).toEqual({ status: 409, body: { ok: false, error: "run_over" } });
    expect((await state()).body.run).toMatchObject({ status: "died", question: null });

    // One play a day: a new bot check and a Start show the same result, under the same cookie.
    expect((await start()).body.run).toMatchObject({ status: "died", question: null });
    expect(await rowsWith(hash)).toBe(4);
  });

  it("returns the open run when started again", async () => {
    await start();
    await answerEntry(0, safe(0));
    const again = await start();
    expect(again.body.run).toMatchObject({ status: "in_progress", question: null });
    expect(again.body.run.answered).toHaveLength(1);
    expect(await guestRuns()).toBeGreaterThanOrEqual(1);
    expect(await rowsWith(tokenHash())).toBe(2);
  });

  it("counts a retried answer once, and refuses a different answer to the same question", async () => {
    await start();
    const [entry, other] = safeEntries(puzzle, 0);
    const before = await tallied(today, 0, entry);
    expect((await answerEntry(0, entry)).status).toBe(200);
    expect(await tallied(today, 0, entry)).toBe(before + 1);
    const retry = await answerEntry(0, entry);
    expect(retry.status).toBe(200);
    expect(retry.body.run.answered).toHaveLength(1);
    expect(await tallied(today, 0, entry)).toBe(before + 1);
    expect(await answerEntry(0, other)).toEqual({ status: 409, body: { ok: false, error: "already_answered" } });
  });

  it("treats text that names no answer as a free retry that is stored nowhere, and refuses another question's", async () => {
    await start();
    const retry = await answerText(0, "  zzz zzz  ");
    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({ ok: true, notInList: true, run: { status: "in_progress", question: { index: 0 } } });
    expect(retry.body.run.answered).toHaveLength(0);
    const { rows } = await getPool().query<{ n: number }>("select count(*)::int as n from private.missed_answer where typed = 'zzz zzz'");
    expect(rows[0].n).toBe(0);
    expect(await answerText(3, "zzz zzz")).toEqual({ status: 409, body: { ok: false, error: "not_current_question" } });
  });

  it("ends a run whose clock ran out when it is next read, and keeps its rows for the day", async () => {
    await start();
    const hash = tokenHash();
    await getPool().query("update private.guest_run set started_at = started_at - interval '21 seconds' where token_hash = $1", [hash]);
    expect((await state()).body.run).toMatchObject({ status: "timed_out", question: null });
    expect(await rowsWith(hash)).toBe(1);
    expect(await answerEntry(0, safe(0))).toMatchObject({ status: 200, body: { run: { status: "timed_out" } } });
  });

  it("refuses typed text over 40 characters before it is matched", async () => {
    await start();
    vi.mocked(resolveTyped).mockClear();
    expect(await answerText(0, "x".repeat(41))).toEqual({ status: 400, body: { ok: false, error: "text_invalid" } });
    expect(resolveTyped).not.toHaveBeenCalled();
  });
});

// M19 19d, answers 2, 3 and 10: a finished run is kept until its day's purge, so its result can be read again.
describe("a finished guest run", () => {
  async function playToCatch() {
    await start();
    await answerEntry(0, safe(0));
    await next();
    await answerText(1, hostName(puzzle, 1));
  }

  it("is shown again by Start, in place of a new run (answer 2)", async () => {
    await playToCatch();
    const hash = tokenHash();
    const rows = await rowsWith(hash);
    const again = await start();
    expect(again.status).toBe(200);
    expect(again.body.run).toMatchObject({ status: "died", question: null });
    expect(again.body.run.answered).toHaveLength(2);
    expect(await rowsWith(hash)).toBe(rows);
    expect(rows).toBeGreaterThan(0);
  });

  it("is shown every time it is read, whether it ended by an answer or by the clock (answer 3)", async () => {
    await playToCatch();
    const first = (await state()).body.run;
    expect(first).toMatchObject({ status: "died", question: null });
    expect((await state()).body.run.answered).toEqual(first.answered);
    expect((await state()).body.run.status).toBe("died");

    cookieJar.clear();
    await start();
    await getPool().query("update private.guest_run set started_at = started_at - interval '21 seconds' where token_hash = $1", [tokenHash()]);
    expect((await state()).body.run).toMatchObject({ status: "timed_out", question: null });
    expect((await state()).body.run).toMatchObject({ status: "timed_out", question: null });
  });

  it("adds nothing to the tally when it is read or started again", async () => {
    await start();
    const entry = safe(0);
    const before = await tallied(today, 0, entry);
    await answerEntry(0, entry);
    await next();
    await answerText(1, hostName(puzzle, 1));
    const counted = await tallied(today, 0, entry);
    expect(counted).toBe(before + 1);
    await state();
    await state();
    await start();
    expect(await tallied(today, 0, entry)).toBe(counted);
  });

  it("answers a retried final answer and a late Next with a 4xx or the stored result, never a 500", async () => {
    await playToCatch();
    const retry = await answerText(1, hostName(puzzle, 1));
    expect(retry.status).toBeLessThan(500);
    expect((await next()).status).toBeLessThan(500);
    expect((await state()).body.run.status).toBe("died");
  });

  it("is cleared with its day's other guest runs by the next Start after the day closes", async () => {
    const old = randomBytes(20).toString("base64url");
    const oldHash = hashKey(old);
    const db = getPool();
    await db.query("insert into private.guest_run (token_hash, game_id, puzzle_date) values ($1, $2, $3::date)", [oldHash, GAME_ID, yesterday]);
    await db.query(
      "insert into private.guest_run_event (token_hash, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 0, $4, true)",
      [oldHash, GAME_ID, yesterday, safe(0)],
    );
    expect((await db.query("select status from private.guest_run_status where token_hash = $1", [oldHash])).rows[0].status).toBe("died");
    cookieJar.clear();
    expect((await start()).status).toBe(200);
    expect(await rowsWith(oldHash)).toBe(0);
  });
});

describe("a guest run of a closed day", () => {
  it("is not resumed, and the next guest start deletes it with its answers", async () => {
    // A run of yesterday, left at a reveal: the test's own role writes it (nothing ends it by itself).
    const old = randomBytes(20).toString("base64url");
    const oldHash = hashKey(old);
    const db = getPool();
    await db.query("insert into private.guest_run (token_hash, game_id, puzzle_date) values ($1, $2, $3::date)", [oldHash, GAME_ID, yesterday]);
    await db.query(
      "insert into private.guest_run_event (token_hash, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 0, $4, false)",
      [oldHash, GAME_ID, yesterday, safe(0)],
    );
    expect(await rowsWith(oldHash)).toBe(2);

    // Its owner sees today as not started and may not answer it; nothing is deleted by reading.
    cookieJar.set(COOKIE, old);
    expect((await state()).body.run.status).toBe("not_started");
    expect(await answerEntry(1, safe(1))).toEqual({ status: 409, body: { ok: false, error: "run_over" } });
    expect(await rowsWith(oldHash)).toBe(2);

    // Another guest's start deletes it.
    cookieJar.clear();
    expect((await start()).status).toBe(200);
    expect(await rowsWith(oldHash)).toBe(0);
  });

  it("lets its owner start a fresh run under the same cookie", async () => {
    const old = randomBytes(20).toString("base64url");
    await getPool().query("insert into private.guest_run (token_hash, game_id, puzzle_date) values ($1, $2, $3::date)", [hashKey(old), GAME_ID, yesterday]);
    cookieJar.set(COOKIE, old);
    expect((await start()).body.run).toMatchObject({ status: "in_progress", answered: [] });
    expect(await rowsWith(hashKey(old))).toBe(1);
  });
});

describe("the bot check", () => {
  // Each of these must create no guest run (a db count before and after) and set no cookie.
  it.each([
    ["a failed check (the always-fail test secret)", FAIL_SECRET, { turnstileToken: DUMMY_TOKEN }, 400, "captcha_failed"],
    ["a missing token", PASS_SECRET, {}, 400, "captcha_failed"],
  ])("%s creates no run", async (_, secret, body, status, error) => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", secret);
    const before = await guestRuns();
    expect(await start(body)).toEqual({ status, body: { ok: false, error } });
    expect(await guestRuns()).toBe(before);
    expect(cookieJar.size).toBe(0);
  });

  // Cloudflare's test secrets cannot produce a real timeout-or-duplicate (the always-pass secret passes every token), so
  // this stubs only the network edge with the reply Siteverify gives for a token already redeemed.
  it("answers 400 captcha_failed and creates no run when Siteverify says the token was already used", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, "error-codes": ["timeout-or-duplicate"] }), { status: 200 })));
    try {
      const before = await guestRuns();
      expect(await start({ turnstileToken: DUMMY_TOKEN })).toEqual({ status: 400, body: { ok: false, error: "captcha_failed" } });
      expect(await guestRuns()).toBe(before);
      expect(cookieJar.size).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("answers 503 captcha_unavailable and creates no run when Siteverify can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    try {
      const before = await guestRuns();
      expect(await start()).toEqual({ status: 503, body: { ok: false, error: "captcha_unavailable" } });
      expect(await guestRuns()).toBe(before);
      expect(cookieJar.size).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
