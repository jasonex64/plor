// The guest run routes end to end against the local stack (run with `npm run test:db`; docs/milestones/M18-guest-play.md,
// 18c), on the fixture's day on a clock (docs/milestones/M23-23c-the-run-on-a-clock.md). The routes connect as postgres locally;
// the guest module's own work as plor_app, with its grants, is in src/game/clock-runs.plor-app.db.test.ts. The bot check calls the
// real Siteverify with Cloudflare's published test secrets (developers.cloudflare.com/turnstile/troubleshooting/testing/); only
// "unreachable" stubs the call.
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashKey } from "@/lib/auth-limits";
import { getPool } from "@/lib/db";
import { GAME_ID } from "@/platform/game";
import { fixtureId } from "@/test/answer-fixture";
import { TURNSTILE_TEST_PASS_SECRET, useLocalStack } from "@/test/local-stack";
import { ensurePuzzle, removeFixtures } from "@/test/puzzles";
import { apiRequest, cookieJar, cookieOptions } from "@/test/request-scope";
import { resolveTyped } from "@/game/matching";
import { POST as answerRoute } from "./answer/route";
import { POST as finishRoute } from "./finish/route";
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

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const start = (body: unknown = { turnstileToken: DUMMY_TOKEN }) => call(startRoute(apiRequest("/api/guest/run/start", { method: "POST", body })));
const state = () => call(stateRoute(apiRequest("/api/guest/run", { method: "GET" })));
const next = (index: number) => call(nextRoute(apiRequest("/api/guest/run/next", { method: "POST", body: { index } })));
const finish = () => call(finishRoute(apiRequest("/api/guest/run/finish", { method: "POST" })));
const answerText = (index: number, text: string) => call(answerRoute(apiRequest("/api/guest/run/answer", { method: "POST", body: { index, text } })));

const tokenHash = () => hashKey(cookieJar.get(COOKIE)!);

// How many rows, in every guest table, carry this hash.
async function rowsWith(hash: string): Promise<number> {
  const tables = ["guest_run", "guest_clock_answer", "guest_clock_finish", "guest_question_open", "guest_round_word", "guest_round_reject"];
  const { rows } = await getPool().query<{ n: number }>(
    `select (${tables.map((t) => `(select count(*) from private.${t} where token_hash = $1)`).join(" + ")})::int as n`,
    [hash],
  );
  return rows[0].n;
}
async function guestRuns(): Promise<number> {
  return (await getPool().query<{ n: number }>("select count(*)::int as n from private.guest_run")).rows[0].n;
}
// Yesterday's run left behind, with one answer: the test's own role writes it (nothing ends it by itself).
async function oldRun(hash: string) {
  const db = getPool();
  await db.query("insert into private.guest_run (token_hash, game_id, puzzle_date) values ($1, $2, $3::date)", [hash, GAME_ID, yesterday]);
  await db.query("insert into private.guest_clock_answer (token_hash, game_id, puzzle_date, question_idx, entry_id, tier, added_ms, points, created_at) values ($1, $2, $3::date, 0, $4, 'common', 3000, 10, now())", [
    hash,
    GAME_ID,
    yesterday,
    fixtureId(0, "dog"),
  ]);
}

beforeAll(async () => {
  useLocalStack();
  const { rows } = await getPool().query<{ today: string; yesterday: string }>(
    "select private.today()::text as today, (private.today() - 1)::text as yesterday",
  );
  ({ today, yesterday } = rows[0]);
  await ensurePuzzle(today);
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
  // reference the puzzle.
  await db.query("delete from private.guest_run where puzzle_date = any($1::date[])", [[today, yesterday]]);
  await removeFixtures();
  await db.end();
});

describe("a guest run, step by step", () => {
  it("starts with the cookie set as designed, plays to Finish, shows the result again and keeps the run until its day closes", async () => {
    const started = await start();
    expect(started.status).toBe(200);
    expect(started.body.run).toMatchObject({ format: 4, status: "in_progress", answers: [], question: { index: 0 } });
    // A session cookie, readable by no script, sent only to the guest routes (M18 ticket, Design, "The token").
    expect(cookieJar.get(COOKIE)).toMatch(/^[A-Za-z0-9_-]{27}$/);
    expect(cookieOptions.get(COOKIE)).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/api/guest" });
    const hash = tokenHash();
    expect(await rowsWith(hash)).toBe(1);

    const first = await answerText(0, "dog");
    expect(first.status).toBe(200);
    expect(first.body.run.answers).toHaveLength(1);
    expect((await next(0)).body.run.question.index).toBe(1);
    expect((await state()).body.run).toMatchObject({ status: "in_progress", question: { index: 1 } });
    expect((await next(1)).body.run.question.index).toBe(2);

    // Finish ends the run: the response is the whole result, and the run's rows stay (M19 answers 3 and 10).
    const last = await finish();
    expect(last.status).toBe(200);
    expect(last.body.run).toMatchObject({ status: "over", question: null });
    expect(last.body.run.answers).toHaveLength(1);
    expect(await rowsWith(hash)).toBe(5);
    // Next on a run that is over is 409 run_over; the result is read again.
    expect(await next(2)).toEqual({ status: 409, body: { ok: false, error: "run_over" } });
    expect((await state()).body.run).toMatchObject({ status: "over", question: null });

    // One play a day: a new bot check and a Start show the same result, under the same cookie.
    expect((await start()).body.run).toMatchObject({ status: "over", question: null });
    expect(await rowsWith(hash)).toBe(5);
  });

  it("returns the open run when started again", async () => {
    await start();
    await answerText(0, "dog");
    const again = await start();
    expect(again.body.run).toMatchObject({ status: "in_progress", question: { index: 0 } });
    expect(again.body.run.answers).toHaveLength(1);
    expect(await guestRuns()).toBeGreaterThanOrEqual(1);
    expect(await rowsWith(tokenHash())).toBe(2);
  });

  it("counts a repeated answer once", async () => {
    await start();
    expect((await answerText(0, "dog")).body).toMatchObject({ repeat: false, run: { points: 10 } });
    const repeat = await answerText(0, "dog");
    expect(repeat.status).toBe(200);
    expect(repeat.body).toMatchObject({ repeat: true, run: { points: 10 } });
    expect(repeat.body.run.answers).toHaveLength(1);
    expect(await rowsWith(tokenHash())).toBe(2);
  });

  it("treats text that names no answer as a free retry that is stored nowhere, and refuses another question's", async () => {
    await start();
    const retry = await answerText(0, "  zzz zzz  ");
    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({ ok: true, notInList: true, run: { status: "in_progress", question: { index: 0 } } });
    expect(retry.body.run.answers).toHaveLength(0);
    const { rows } = await getPool().query<{ n: number }>("select count(*)::int as n from private.missed_answer where typed = 'zzz zzz'");
    expect(rows[0].n).toBe(0);
    expect(await answerText(2, "dog")).toEqual({ status: 409, body: { ok: false, error: "not_open" } });
  });

  it("ends a run whose clock ran out when it is next read, and keeps its rows for the day", async () => {
    await start();
    const hash = tokenHash();
    await getPool().query("update private.guest_run set started_at = started_at - interval '21 seconds' where token_hash = $1", [hash]);
    expect((await state()).body.run).toMatchObject({ status: "over", question: null });
    expect(await rowsWith(hash)).toBe(1);
    expect(await answerText(0, "dog")).toMatchObject({ status: 200, body: { run: { status: "over" } } });
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
  async function playToFinish() {
    await start();
    await answerText(0, "dog");
    await next(0);
    await next(1);
    await finish();
  }

  it("is shown again by Start, in place of a new run (answer 2)", async () => {
    await playToFinish();
    const hash = tokenHash();
    const rows = await rowsWith(hash);
    const again = await start();
    expect(again.status).toBe(200);
    expect(again.body.run).toMatchObject({ status: "over", question: null });
    expect(again.body.run.answers).toHaveLength(1);
    expect(await rowsWith(hash)).toBe(rows);
    expect(rows).toBeGreaterThan(0);
  });

  it("is shown every time it is read, whether it ended by Finish or by the clock (answer 3)", async () => {
    await playToFinish();
    const first = (await state()).body.run;
    expect(first).toMatchObject({ status: "over", question: null });
    expect((await state()).body.run.answers).toEqual(first.answers);
    expect((await state()).body.run.status).toBe("over");

    cookieJar.clear();
    await start();
    await getPool().query("update private.guest_run set started_at = started_at - interval '21 seconds' where token_hash = $1", [tokenHash()]);
    expect((await state()).body.run).toMatchObject({ status: "over", question: null });
    expect((await state()).body.run).toMatchObject({ status: "over", question: null });
  });

  it("answers a second Finish and a late Next with a 4xx or the stored result, never a 500", async () => {
    await playToFinish();
    expect((await finish()).status).toBeLessThan(500);
    expect((await next(2)).status).toBeLessThan(500);
    expect((await state()).body.run.status).toBe("over");
  });

  it("is cleared with its day's other guest runs by the next Start after the day closes", async () => {
    const oldHash = hashKey(randomBytes(20).toString("base64url"));
    await oldRun(oldHash);
    expect(await rowsWith(oldHash)).toBe(2);
    cookieJar.clear();
    expect((await start()).status).toBe(200);
    expect(await rowsWith(oldHash)).toBe(0);
  });
});

describe("a guest run of a closed day", () => {
  it("is not resumed, and the next guest start deletes it with its answers", async () => {
    const old = randomBytes(20).toString("base64url");
    const oldHash = hashKey(old);
    await oldRun(oldHash);
    expect(await rowsWith(oldHash)).toBe(2);

    // Its owner sees today as not started and may not answer it; nothing is deleted by reading.
    cookieJar.set(COOKIE, old);
    expect((await state()).body.run.status).toBe("not_started");
    expect(await answerText(1, "apple")).toEqual({ status: 409, body: { ok: false, error: "run_over" } });
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
    expect((await start()).body.run).toMatchObject({ status: "in_progress", answers: [] });
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
