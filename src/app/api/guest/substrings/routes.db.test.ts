// The guest game 2 routes end to end against the local stack (run with `npm run test:db`; docs/milestones/M18-guest-play.md,
// 18d). Modelled on src/app/api/guest/run/routes.db.test.ts: the routes connect as postgres locally, and the bot check
// calls the real Siteverify with Cloudflare's published test secrets, but for "unreachable", which stubs the call. The
// day is today's, added here with a few words of its own, as the real list isn't in git (as src/app/api/substrings/route.db.test.ts).
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubstringRun } from "@/game/substring-state";
import { hashKey } from "@/lib/auth-limits";
import { getPool } from "@/lib/db";
import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import { TURNSTILE_TEST_PASS_SECRET, useLocalStack } from "@/test/local-stack";
import { ensurePuzzle, removeFixtures } from "@/test/puzzles";
import { apiRequest, cookieJar, cookieOptions } from "@/test/request-scope";
import { POST as nextRoute } from "./next/route";
import { GET as stateRoute } from "./route";
import { POST as startRoute } from "./start/route";
import { POST as tryRoute } from "./try/route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const PASS_SECRET = TURNSTILE_TEST_PASS_SECRET;
const FAIL_SECRET = "2x0000000000000000000000000000000AA";
const DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const COOKIE = "plor_guest";
const ROUNDS = ["xk", "xm", "xn", "xp", "xr", "xs", "xt"];
const WORDS = ["axkb", "axkc", "axmb", "axnb", "axpb", "axrb", "axsb", "axtb", "axtc"];
let today = "";
let yesterday = "";

type Body = { ok: boolean; run?: SubstringRun; outcome?: string; word?: string; error?: string };
async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: (await r.json()) as Body };
}
const start = (body: unknown = { turnstileToken: DUMMY_TOKEN }) => call(startRoute(apiRequest("/api/guest/substrings/start", { method: "POST", body })));
const state = () => call(stateRoute(apiRequest("/api/guest/substrings", { method: "GET" })));
const tryText = (text: unknown) => call(tryRoute(apiRequest("/api/guest/substrings/try", { method: "POST", body: { text } })));
const next = () => call(nextRoute(apiRequest("/api/guest/substrings/next", { method: "POST" })));

const tokenHash = () => hashKey(cookieJar.get(COOKIE)!);

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
// What a guest's run must never touch: the players' game 2 runs, words and ledger rows.
async function playerRows(): Promise<number[]> {
  const { rows } = await getPool().query<{ n: number[] }>(
    `select array[(select count(*) from private.run where game_id = $1), (select count(*) from private.round_word where game_id = $1),
                  (select count(*) from private.points_ledger where game_id = $1)]::int[] as n`,
    [SUBSTRINGS_ID],
  );
  return rows[0].n;
}
const unlock = () => getPool().query("update private.guest_round_reject set rejected_at = rejected_at - interval '1 second'");
const timeOut = async () => {
  const hash = tokenHash();
  await getPool().query("update private.guest_run set started_at = started_at - interval '21 seconds' where token_hash = $1", [hash]);
  await getPool().query("update private.guest_question_open set opened_at = opened_at - interval '21 seconds' where token_hash = $1", [hash]);
};

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  ({ today, yesterday } = (
    await db.query<{ today: string; yesterday: string }>("select private.today()::text as today, (private.today() - 1)::text as yesterday")
  ).rows[0]);
  for (const date of [today, yesterday]) {
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [
      SUBSTRINGS_ID,
      date,
      { format: 1, game_id: SUBSTRINGS_ID, date, rounds: ROUNDS, bonus_letter: "j" },
    ]);
  }
  await db.query("insert into private.dictionary_word (word_key, spelling, plain, everyday) select w, w, w, true from unnest($1::text[]) as w on conflict do nothing", [WORDS]);
  // A token may hold a game 1 run beside its game 2 one.
  await ensurePuzzle(today);
});

beforeEach(() => {
  cookieJar.clear();
  cookieOptions.clear();
  vi.stubEnv("TURNSTILE_SECRET_KEY", PASS_SECRET);
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from private.guest_run where puzzle_date = any($1::date[])", [[today, yesterday]]);
  await db.query("delete from private.guest_tally where puzzle_date = any($1::date[])", [[today, yesterday]]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = any($2::date[])", [SUBSTRINGS_ID, [today, yesterday]]);
  await db.query("delete from private.dictionary_word where word_key = any($1)", [WORDS]);
  await removeFixtures();
  await db.end();
});

describe("a guest game 2 run, step by step", () => {
  it("starts with the cookie set as designed, and the round 1 letters and no others", async () => {
    const started = await start();
    expect(started.status).toBe(200);
    expect(started.body.run).toMatchObject({ status: "in_progress", bonusLetter: "j", open: { index: 0, letters: "xk" } });
    expect(started.body.run!.open!.msLeft).toBeGreaterThan(19_000);
    for (const letters of ROUNDS.slice(1)) expect(JSON.stringify(started.body.run)).not.toContain(`"${letters}"`);
    expect(cookieJar.get(COOKIE)).toMatch(/^[A-Za-z0-9_-]{27}$/);
    expect(cookieOptions.get(COOKIE)).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/api/guest" });
    expect(await rowsWith(tokenHash())).toBe(1);
  });

  it("returns the open run when started again, and shows nothing of the day to a visitor with no run", async () => {
    await start();
    expect((await tryText("axkb")).body.outcome).toBe("accepted");
    const again = await start();
    expect(again.body.run).toMatchObject({ status: "in_progress", open: null, rounds: [{ letters: "xk", word: "axkb" }] });
    expect(await rowsWith(tokenHash())).toBe(2);
    cookieJar.clear();
    const none = await state();
    expect(none.body.run).toMatchObject({ status: "not_started", bonusLetter: null, open: null, rounds: [] });
    for (const letters of ROUNDS) expect(JSON.stringify(none.body.run)).not.toContain(`"${letters}"`);
  });

  it("says why a try failed, locks after a refused word, and takes a second Next tap", async () => {
    await start();
    expect((await tryText("zzzqqqzz")).body.outcome).toBe("not_a_word");
    expect((await tryText("axkb")).body.outcome).toBe("locked");
    await unlock();
    expect((await tryText("axmb")).body.outcome).toBe("needs_letters");
    await unlock();
    expect((await tryText("")).body.outcome).toBe("empty");
    expect((await tryText("axkb")).body.outcome).toBe("accepted");
    expect((await tryText("axkc")).body.outcome).toBe("already_answered");
    expect(await next()).toMatchObject({ status: 200, body: { run: { open: { index: 1, letters: "xm" } } } });
    expect(await next()).toMatchObject({ status: 200, body: { run: { open: { index: 1 } } } });
    expect(await next()).toMatchObject({ status: 200 });
  });

  it("refuses Next during round 1, and plays all seven rounds, shows the result every time, keeps the run for the day and adds nothing to the players", async () => {
    const players = await playerRows();
    await start();
    const hash = tokenHash();
    expect(await next()).toEqual({ status: 409, body: { ok: false, error: "round_running" } });
    // A guest's token may hold a game 1 run too: ending game 2's leaves it.
    await getPool().query("insert into private.guest_run (token_hash, game_id, puzzle_date) values ($1, $2, $3::date)", [hash, GAME_ID, today]);
    for (const word of ["axkb", "axmb", "axnb", "axpb", "axrb", "axsb"]) {
      expect((await tryText(word)).body.outcome).toBe("accepted");
      expect((await next()).status).toBe(200);
    }
    await timeOut();
    const ended = await state();
    expect(ended.status).toBe(200);
    const run = ended.body.run!;
    expect(run).toMatchObject({ status: "finished", open: null });
    expect(run.rounds).toHaveLength(7);
    expect(run.rounds[0]).toEqual({ letters: "xk", word: "axkb", points: 25, bonus: 0, examples: [] });
    // The local dictionary holds real words too, so the examples are checked for ours, not for their number.
    expect(run.rounds[6]).toMatchObject({ letters: "xt", word: null, points: 0, bonus: 0 });
    expect(run.rounds[6].examples).toEqual(expect.arrayContaining(["axtb", "axtc"]));
    // The percent is among the players' finished runs, read only; under the day's minimum it is null, and a guest has no friends.
    expect(run.standing).toEqual({ percent: null, friends: null });
    // Game 2's rows stay until the day's purge, beside game 1's under the same token (M19 answers 3 and 10).
    expect(await rowsWith(hash)).toBeGreaterThan(1);
    expect(await playerRows()).toEqual(players);

    // A try after the end is the judge's outcome, as a player's is; Next on a run that is over is 409 run_over.
    expect(await tryText("axtb")).toMatchObject({ status: 200, body: { outcome: "time_up", run: { status: "finished" } } });
    expect(await next()).toEqual({ status: 409, body: { ok: false, error: "run_over" } });
    expect((await state()).body.run).toMatchObject({ status: "finished", score: run.score });

    // One play a day: a new bot check and a Start show the same result, under the same cookie.
    expect((await start()).body.run).toMatchObject({ status: "finished", score: run.score });
  });

  it("answers no_run to a try or Next from a visitor with no cookie, and 400 to a try that isn't text", async () => {
    expect(await tryText("axkb")).toEqual({ status: 404, body: { ok: false, error: "no_run" } });
    expect(await next()).toEqual({ status: 404, body: { ok: false, error: "no_run" } });
    await start();
    expect(await tryText(7)).toEqual({ status: 400, body: { ok: false, error: "bad_request" } });
  });
});

// M19 19d, answers 2, 3 and 10: a finished run is kept until its day's purge, so its result can be read again.
describe("a finished guest game 2 run", () => {
  async function playToTheEnd() {
    await start();
    for (const word of ["axkb", "axmb", "axnb", "axpb", "axrb", "axsb"]) {
      expect((await tryText(word)).body.outcome).toBe("accepted");
      expect((await next()).status).toBe(200);
    }
    await timeOut();
  }

  it("is shown again by Start, in place of a new run (answer 2)", async () => {
    await playToTheEnd();
    const hash = tokenHash();
    const rows = await rowsWith(hash);
    const again = await start();
    expect(again.status).toBe(200);
    expect(again.body.run).toMatchObject({ status: "finished", open: null });
    expect(again.body.run!.rounds[0]).toMatchObject({ letters: "xk", word: "axkb", points: 25 });
    expect(await rowsWith(hash)).toBe(rows);
    expect(rows).toBeGreaterThan(0);
  });

  it("is shown every time it is read, including the read that finds the clock run out (answer 3)", async () => {
    await playToTheEnd();
    const first = (await state()).body.run!;
    expect(first).toMatchObject({ status: "finished", open: null });
    const second = (await state()).body.run!;
    expect(second.rounds).toEqual(first.rounds);
    expect(second.score).toEqual(first.score);
    expect((await state()).body.run!.status).toBe("finished");
  });

  it("answers a try or Next after the end with a 4xx or the stored result, never a 500", async () => {
    await playToTheEnd();
    expect((await tryText("axmb")).status).toBeLessThan(500);
    expect((await next()).status).toBeLessThan(500);
    expect((await state()).body.run!.status).toBe("finished");
  });
});

describe("a guest game 2 run of a closed day", () => {
  it("is not resumed, and the next guest start deletes it with its words", async () => {
    const old = randomBytes(20).toString("base64url");
    const oldHash = hashKey(old);
    const db = getPool();
    await db.query("insert into private.guest_run (token_hash, game_id, puzzle_date) values ($1, $2, $3::date)", [oldHash, SUBSTRINGS_ID, yesterday]);
    await db.query("insert into private.guest_round_word (token_hash, game_id, puzzle_date, round_idx, word_key, word) values ($1, $2, $3::date, 0, 'axkb', 'axkb')", [oldHash, SUBSTRINGS_ID, yesterday]);
    expect(await rowsWith(oldHash)).toBe(2);

    cookieJar.set(COOKIE, old);
    expect((await state()).body.run).toMatchObject({ date: today, status: "not_started" });
    expect(await tryText("axmb")).toEqual({ status: 409, body: { ok: false, error: "run_over" } });
    expect(await next()).toEqual({ status: 409, body: { ok: false, error: "run_over" } });
    expect(await rowsWith(oldHash)).toBe(2);

    cookieJar.clear();
    expect((await start()).status).toBe(200);
    expect(await rowsWith(oldHash)).toBe(0);
  });
});

describe("the bot check", () => {
  // Each must create no guest run and set no cookie, and a cookie from an earlier run buys no start without a check.
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

  it("is asked again for a start by a guest who has a cookie", async () => {
    await start();
    const hash = tokenHash();
    await getPool().query("delete from private.guest_run where token_hash = $1", [hash]);
    const before = await guestRuns();
    expect(await start({})).toEqual({ status: 400, body: { ok: false, error: "captcha_failed" } });
    expect(await guestRuns()).toBe(before);
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
