// Fragments' test-run route against the local stack (`npm run test:db`; docs/milestones/M15-15f-fragments-test-run.md,
// 15f-2): who may use it, a draft or an approved day played by its date, a draft refused with its problems, a whole test
// day judged and scored as the real routes judge and score the same day, and nothing written. The days and their words
// are this file's own, as the real list isn't in git; the draft files are written to content/substrings for this file and
// removed afterwards.
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as nextRoute } from "@/app/api/substrings/next/route";
import { GET as stateRoute } from "@/app/api/substrings/route";
import { POST as startRoute } from "@/app/api/substrings/start/route";
import { POST as tryRoute } from "@/app/api/substrings/try/route";
import { bonusPoints } from "@/game/substring-scoring";
import type { SubstringRun } from "@/game/substring-state";
import { getPool } from "@/lib/db";
import { SUBSTRINGS_ID } from "@/platform/game";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { POST } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const DRAFTS = join(process.cwd(), "content", "substrings");
const ROUNDS = ["zx", "zy", "zqp", "zrs", "ztv", "zwu", "zkl"];
// Three rounds have words of their own, for a missed round's examples; zqp's has a fourth that doesn't make the three.
const WORDS = ["azxb", "azxzyb", "azyb", "azqpb", "bzqpc", "czqpd", "dzqpeeee", "azrsb", "ajzklb", "azwub", "azwuc", "azwud", "aztvb", "aztvc", "aztvd"];
// A day whose third round differs from ROUNDS', to tell which of a draft and an approved day was played.
const OTHER_ROUNDS = ["zx", "zy", "zqq", "zrr", "ztt", "zww", "zkk"];
let today = "";
let approved = "";
let drafted = "";
let both = "";
let badDraft = "";
let nothing = "";
const sessions = new Map<string, Map<string, string>>();
let createdFolder = false;
const files: string[] = [];

type Body = { ok: boolean; run?: SubstringRun; outcome?: string; word?: string; played?: string; error?: string; problems?: string[] };
const call = async (response: Promise<Response>) => {
  const r = await response;
  return { status: r.status, body: (await r.json()) as Body };
};
type Moves = { words?: (string | null)[]; open?: boolean; text?: string | null };
const play = (date: string, { words = [], open = false, text = null }: Moves = {}) =>
  call(POST(apiRequest("/api/admin/test/substrings", { method: "POST", body: { date, words, open, text } })));

const dayOf = (date: string, rounds: string[]) => ({ format: 1, game_id: SUBSTRINGS_ID, date, rounds, bonus_letter: "j" });
const writeDraft = (date: string, content: unknown) => {
  const file = join(DRAFTS, `${date}.json`);
  if (existsSync(file)) throw new Error(`${file} exists; this test writes its own draft there`);
  writeFileSync(file, JSON.stringify(content));
  files.push(file);
  return file;
};

// What a test run must leave as it was ("Nothing at all", the ticket's answer 3).
const TABLES = ["puzzle", "run", "run_event", "question_open", "round_word", "round_reject", "points_ledger", "guest_run", "dictionary_word"];
async function counts(): Promise<number[]> {
  const { rows } = await getPool().query<{ n: number[] }>(`select array[${TABLES.map((t) => `(select count(*)::int from private.${t})`).join(", ")}] as n`);
  return rows[0].n;
}

async function sessionFor(role: "admin" | "player"): Promise<Map<string, string>> {
  if (!sessions.has(role)) {
    const email = `${RUN}-ftr${role}@example.test`;
    sessions.set(role, (await signIn(email)).session);
    await getPool().query("insert into private.profile (user_id, username) select id, $2 from auth.users where email = $1", [email, `ftr${role}${RUN}`]);
    if (role === "admin") await getPool().query("insert into private.admin (user_id) select id from auth.users where email = $1", [email]);
  }
  return sessions.get(role)!;
}

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  const { rows } = await db.query<Record<string, string>>(
    `select private.today()::text as today, (private.today() + 470)::text as approved, (private.today() + 471)::text as drafted,
            (private.today() + 472)::text as both, (private.today() + 473)::text as "badDraft", (private.today() + 474)::text as nothing`,
  );
  ({ today, approved, drafted, both, badDraft, nothing } = rows[0]);
  const taken = await db.query("select 1 from private.puzzle where game_id = $1 and puzzle_date = any($2::date[])", [SUBSTRINGS_ID, [today, approved, both]]);
  if (taken.rowCount) throw new Error("today's and the test dates' game 2 days must be free: this test adds its own");
  for (const date of [today, approved, both]) {
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [SUBSTRINGS_ID, date, dayOf(date, date === both ? OTHER_ROUNDS : ROUNDS)]);
  }
  await db.query("insert into private.dictionary_word (word_key, spelling, plain, everyday) select w, w, w, true from unnest($1::text[]) as w on conflict do nothing", [WORDS]);
  // A word whose spelling isn't its letters, so what is shown is the list's, as the real game shows it.
  await db.query("update private.dictionary_word set spelling = 'azy-b', plain = 'azy-b' where word_key = 'azyb'");
  createdFolder = !existsSync(DRAFTS);
  mkdirSync(DRAFTS, { recursive: true });
  writeDraft(drafted, dayOf(drafted, ROUNDS));
  writeDraft(both, dayOf(both, ROUNDS));
});

afterAll(async () => {
  for (const file of files) rmSync(file, { force: true });
  if (createdFolder && existsSync(DRAFTS) && readdirSync(DRAFTS).length === 0) rmdirSync(DRAFTS);
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-ftr%@example.test`]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = any($2::date[])", [SUBSTRINGS_ID, [today, approved, both]]);
  await db.query("delete from private.dictionary_word where word_key = any($1)", [WORDS]);
  await db.end();
});

describe("who may play a Fragments test run", () => {
  it("answers 401 when signed out", async () => {
    useSession(new Map());
    expect((await play(approved)).status).toBe(401);
  });

  it("answers 403 admins_only to a player who isn't an admin, before reading the date", async () => {
    useSession(await sessionFor("player"));
    const response = await call(POST(apiRequest("/api/admin/test/substrings", { method: "POST", body: { date: "not a date" } })));
    expect(response).toEqual({ status: 403, body: { ok: false, error: "admins_only" } });
  });

  it("reads no draft for a player who isn't an admin: a date with a broken draft is only refused", async () => {
    useSession(await sessionFor("player"));
    const file = writeDraft(badDraft, dayOf(badDraft, ["zx", "zy", "zqp", "zrs", "ztv", "zwu", "zjl"]));
    try {
      expect(await play(badDraft)).toEqual({ status: 403, body: { ok: false, error: "admins_only" } });
    } finally {
      rmSync(file);
      files.pop();
    }
  });
});

describe("what a test run plays", () => {
  beforeEach(async () => useSession(await sessionFor("admin")));

  it("plays an approved day, from the start, with round 1's letters alone", async () => {
    const before = await play(approved);
    expect(before.body.run).toMatchObject({ status: "not_started", total: 7, bonusLetter: null, open: null, rounds: [] });
    const { body } = await play(approved, { open: true });
    expect(body.run).toMatchObject({ status: "in_progress", bonusLetter: "j", open: { index: 0, letters: "zx" }, score: { total: 0 } });
    expect(body.played).toBe("approved");
    // The 20 seconds from the database's own rule, as if opened now.
    expect(body.run!.open!.msLeft).toBeGreaterThan(19_000);
    for (const letters of ROUNDS.slice(1)) expect(JSON.stringify(body.run)).not.toContain(`"${letters}"`);
  });

  it("plays a draft by its date, though no day is approved for it", async () => {
    const { body } = await play(drafted, { open: true });
    expect(body.run!.open).toMatchObject({ index: 0, letters: "zx" });
    expect(body.played).toBe("draft");
  });

  it("plays the draft when a date has both, as the Puzzles page shows it", async () => {
    // The approved day's third round is zqq; the draft's is zqp.
    const { body } = await play(both, { words: ["azxb", null], open: true });
    expect(body.run!.open).toMatchObject({ index: 2, letters: "zqp" });
    expect(body.played).toBe("draft");
  });

  it("answers 404 no_puzzle for a date with neither", async () => {
    expect(await play(nothing)).toEqual({ status: 404, body: { ok: false, error: "no_puzzle" } });
  });

  it("answers 422 puzzle_invalid, with the problems, for a draft the format refuses", async () => {
    const file = writeDraft(badDraft, dayOf(badDraft, ["zx", "zy", "zqp", "zrs", "ztv", "zwu", "zjl"]));
    try {
      const response = await play(badDraft);
      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({ ok: false, error: "puzzle_invalid" });
      expect(response.body.problems).toEqual([`substrings/${badDraft}.json: bonus letter "j" is in "zjl"`]);
    } finally {
      rmSync(file);
      files.pop();
    }
  });

  it("answers 400 for moves that can't be, and 409 for a try on a round that isn't open", async () => {
    expect((await play(approved, { words: ["azxb", "azxb"], open: true })).status).toBe(400);
    expect((await play(approved, { words: ["zzzzz"] })).status).toBe(400);
    expect((await play(approved, { words: [null, null, null, null, null, null, null, null] })).status).toBe(400);
    expect(await play(approved, { text: "azxb" })).toEqual({ status: 409, body: { ok: false, error: "not_open" } });
  });
});

// The browser's side of a test run, as src/app/substrings.tsx keeps it: the moves so far, sent whole each time.
function browser(date: string) {
  const moves: { words: (string | null)[]; open: boolean } = { words: [], open: false };
  return {
    open: async () => {
      moves.open = true;
      return (await play(date, moves)).body.run!;
    },
    timeUp: async () => {
      moves.words.push(null);
      moves.open = false;
      return (await play(date, moves)).body.run!;
    },
    try: async (text: string) => {
      const { body } = await play(date, { ...moves, text });
      if (body.outcome === "accepted") {
        moves.words.push(text);
        moves.open = false;
      }
      return body;
    },
    finish: async () => (await play(date, moves)).body.run!,
  };
}

// The real routes' side, for a throwaway player on today's day, which has the same rounds.
const unlock = () => getPool().query("update private.round_reject set rejected_at = rejected_at - interval '1 second'");
const timeOut = async () => {
  await getPool().query("update private.run set started_at = started_at - interval '21 seconds' where game_id = $1", [SUBSTRINGS_ID]);
  await getPool().query("update private.question_open set opened_at = opened_at - interval '21 seconds' where game_id = $1", [SUBSTRINGS_ID]);
};
const real = {
  start: () => startRoute(apiRequest("/api/substrings/start", { method: "POST" })),
  next: () => nextRoute(apiRequest("/api/substrings/next", { method: "POST" })),
  try: async (text: string) => {
    const body = (await (await tryRoute(apiRequest("/api/substrings/try", { method: "POST", body: { text } }))).json()) as Body;
    await unlock();
    return body;
  },
  state: async () => ((await (await stateRoute(apiRequest("/api/substrings", { method: "GET" }))).json()) as Body).run!,
};

describe("a whole test day, judged and scored as the real routes do", () => {
  // Round 1: not a word, a word without its letters, nothing, a word typed with a digit. Round 2: a word used in round 1,
  // then one the list spells with a hyphen. Round 3 times out; round 4 a word; rounds 5 and 6 time out; round 7 a word
  // with the bonus letter.
  const ROUND_1 = ["zzzzqqq", "azyb", "", "AZx3zyb"];
  const ROUND_2 = ["azxzyb", "azy3b"];
  const verdict = (body: Body) => ({ outcome: body.outcome, word: body.word });

  it("gives the verdicts, the words, the points and the examples the real game gives for the same day and tries", async () => {
    useSession(await sessionFor("admin"));
    const test = browser(approved);
    const mine = [];
    await test.open();
    for (const text of ROUND_1) mine.push(verdict(await test.try(text)));
    await test.open();
    for (const text of ROUND_2) mine.push(verdict(await test.try(text)));
    await test.open();
    const afterRound3 = await test.timeUp();
    await test.open();
    mine.push(verdict(await test.try("azrsb")));
    await test.open();
    await test.timeUp();
    await test.open();
    await test.timeUp();
    await test.open();
    mine.push(verdict(await test.try("ajzklb")));
    const finished = await test.finish();

    useSession(await sessionFor("player"));
    const theirs = [];
    await real.start();
    for (const text of ROUND_1) theirs.push(verdict(await real.try(text)));
    await real.next();
    for (const text of ROUND_2) theirs.push(verdict(await real.try(text)));
    await real.next();
    await timeOut();
    await real.next();
    theirs.push(verdict(await real.try("azrsb")));
    await real.next();
    await timeOut();
    await real.next();
    await timeOut();
    await real.next();
    theirs.push(verdict(await real.try("ajzklb")));
    const realRun = await real.state();

    expect(mine).toEqual(theirs);
    expect(mine.map((v) => v.outcome)).toEqual(["not_a_word", "needs_letters", "empty", "accepted", "already_used", "accepted", "accepted", "accepted"]);
    expect(afterRound3).toMatchObject({ status: "in_progress", open: null, rounds: [{}, {}, { word: null, points: 0, examples: [] }] });
    expect(finished.status).toBe("finished");
    expect(finished.rounds.map((r) => r.word)).toEqual(["azxzyb", "azy-b", null, "azrsb", null, null, "ajzklb"]);
    expect(finished.rounds[2].examples).toEqual(["azqpb", "bzqpc", "czqpd"]);
    expect(finished.rounds[4].examples).toEqual(["aztvb", "aztvc", "aztvd"]);
    expect(finished.rounds[5].examples).toEqual(["azwub", "azwuc", "azwud"]);
    expect(finished.score!.bonus).toBe(bonusPoints("ajzklb", "j"));
    // Everything a player sees, but the day it is and where it stands among players: a test run has no board.
    expect({ ...finished, date: "", standing: null }).toEqual({ ...realRun, date: "", standing: null });
  });

  it("writes nothing: no run, round, rejection or point, whatever is typed", async () => {
    useSession(await sessionFor("admin"));
    const before = await counts();
    const test = browser(approved);
    await test.open();
    for (const text of ["zzzzqqq", "azyb", "azxb"]) await test.try(text);
    await test.open();
    await test.timeUp();
    await test.open();
    await test.try("azqpb");
    await play(drafted, { words: [null, null, null, null, null, null, null] });
    expect(await counts()).toEqual(before);
  });
});
