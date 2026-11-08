// Game 2's routes against the local stack (`npm run test:db`; docs/milestones/M16-16d-playing-it.md, 16d-2): who may play,
// what each response shows, and that a player only ever reaches their own run. The day is today's, added here, with a
// few words of its own, as the real list isn't in git.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubstringRun } from "@/game/substring-state";
import { getPool } from "@/lib/db";
import { SUBSTRINGS_ID } from "@/platform/game";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { POST as next } from "./next/route";
import { GET } from "./route";
import { POST as start } from "./start/route";
import { POST as tryWord } from "./try/route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const ROUNDS = ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"];
const WORDS = ["aqkb", "aqkqmb", "aqmb", "aqmjb", "aqnpb", "aqrsb", "aqtvb", "aqwxb", "aqyzb", "aqyzc", "aqyzd", "aqyzeeee"];
let today = "";
const sessions = new Map<string, Map<string, string>>();

type Body = { ok: boolean; run: SubstringRun | null; error?: string };
type TryBody = Body & { outcome: string; word?: string };
const state = async () => (await (await GET(apiRequest("/api/substrings", { method: "GET" }))).json()) as Body;
const startRun = () => start(apiRequest("/api/substrings/start", { method: "POST" }));
const send = (text: unknown) => tryWord(apiRequest("/api/substrings/try", { method: "POST", body: { text } }));
const sent = async (text: string) => (await (await send(text)).json()) as TryBody;
const nextRound = () => next(apiRequest("/api/substrings/next", { method: "POST" }));

async function sessionFor(name: string): Promise<Map<string, string>> {
  if (!sessions.has(name)) {
    const email = `${RUN}-${name}@example.test`;
    sessions.set(name, (await signIn(email)).session);
    await getPool().query("insert into private.profile (user_id, username) select id, $2 from auth.users where email = $1", [email, `${name}${RUN}`]);
  }
  return sessions.get(name)!;
}

const unlock = () => getPool().query("update private.round_reject set rejected_at = rejected_at - interval '1 second'");
const timeOut = async () => {
  await getPool().query("update private.run set started_at = started_at - interval '21 seconds' where game_id = $1", [SUBSTRINGS_ID]);
  await getPool().query("update private.question_open set opened_at = opened_at - interval '21 seconds' where game_id = $1", [SUBSTRINGS_ID]);
};

beforeAll(async () => {
  useLocalStack();
  today = (await getPool().query<{ d: string }>("select private.today()::text as d")).rows[0].d;
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [SUBSTRINGS_ID, today]);
  await db.query("delete from private.dictionary_word where word_key = any($1)", [WORDS]);
  await db.end();
});

describe("who may play", () => {
  beforeEach(() => useSession(new Map()));

  it("answers 401 when signed out, on every route", async () => {
    for (const res of [await GET(apiRequest("/api/substrings", { method: "GET" })), await startRun(), await send("x"), await nextRound()]) expect(res.status).toBe(401);
  });

  it("answers client_outdated without the protocol header, on every route", async () => {
    useSession(await sessionFor("a"));
    const old = { protocol: null };
    for (const res of [
      await GET(apiRequest("/api/substrings", { method: "GET", ...old })),
      await start(apiRequest("/api/substrings/start", { method: "POST", ...old })),
      await tryWord(apiRequest("/api/substrings/try", { method: "POST", body: { text: "x" }, ...old })),
      await next(apiRequest("/api/substrings/next", { method: "POST", ...old })),
    ]) {
      expect((await res.json()).error).toBe("client_outdated");
    }
  });

  it("answers 409 no_profile to a player with no username yet", async () => {
    useSession((await signIn(`${RUN}-new@example.test`)).session);
    const res = await startRun();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("no_profile");
  });
});

describe("a day of game 2", () => {
  beforeEach(async () => useSession(await sessionFor("a")));

  it("says when there's no puzzle, and refuses to start", async () => {
    expect((await state()).run).toBeNull();
    for (const res of [await startRun(), await send("x"), await nextRound()]) {
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe("no_puzzle_today");
    }
  });

  it("shows nothing of the day before the run starts", async () => {
    const db = getPool();
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [SUBSTRINGS_ID, today, { format: 1, game_id: SUBSTRINGS_ID, date: today, rounds: ROUNDS, bonus_letter: "j" }]);
    await db.query("insert into private.dictionary_word (word_key, spelling, plain, everyday) select w, w, w, true from unnest($1::text[]) as w on conflict do nothing", [WORDS]);
    // One spelling isn't its letters: a hyphen and a j with a caron, so a score read from the spelling would be wrong
    // twice over (6 letters, and no plain j).
    await db.query("update private.dictionary_word set spelling = $2, plain = 'aqm-jb' where word_key = $1", ["aqmjb", "aqm-ǰb"]);
    const { run } = await state();
    expect(run).toMatchObject({ status: "not_started", total: 7, bonusLetter: null, open: null, rounds: [] });
    for (const letters of ROUNDS) expect(JSON.stringify(run)).not.toContain(`"${letters}"`);
  });

  it("answers no_run to a try or Next before the start", async () => {
    for (const res of [await send("aqkb"), await nextRound()]) {
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe("no_run");
    }
  });

  it("starts, with round 1's letters and no others", async () => {
    const run = ((await (await startRun()).json()) as Body).run!;
    expect(run.status).toBe("in_progress");
    expect(run.bonusLetter).toBe("j");
    expect(run.open).toMatchObject({ index: 0, letters: "qk" });
    expect(run.open!.msLeft).toBeGreaterThan(19_000);
    for (const letters of ROUNDS.slice(1)) expect(JSON.stringify(run)).not.toContain(`"${letters}"`);
  });

  it("starting again returns the same run", async () => {
    const before = (await (await startRun()).json()) as Body;
    expect(before.run!.open!.index).toBe(0);
  });

  it("refuses Next during round 1", async () => {
    const res = await nextRound();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("round_running");
  });

  it("answers 400 for a try that isn't text", async () => {
    expect((await send(7)).status).toBe(400);
  });

  it("says why a try failed", async () => {
    expect((await sent("zzzqqqzz")).outcome).toBe("not_a_word");
    await unlock();
    expect((await sent("aqmb")).outcome).toBe("needs_letters");
    expect((await sent("aqkb")).outcome).toBe("locked");
    await unlock();
  });

  it("ignores a try with no letters", async () => {
    expect((await sent("")).outcome).toBe("empty");
    expect((await sent("123")).outcome).toBe("empty");
    expect((await sent("aqkqmb")).outcome).toBe("accepted");
  });

  it("refuses another word for a round that has one", async () => {
    expect((await sent("aqkb")).outcome).toBe("already_answered");
  });

  it("hides the next letters until Next, and gives no clock between rounds", async () => {
    const { run } = await state();
    expect(run).toMatchObject({ status: "in_progress", open: null, rounds: [{ letters: "qk", word: "aqkqmb", examples: [] }] });
    // Where the run stands comes only once it's finished (16e-2).
    expect(run!.standing).toBeNull();
    for (const letters of ROUNDS.slice(1)) expect(JSON.stringify(run)).not.toContain(`"${letters}"`);
  });

  it("a player's tries and Next reach only their own run", async () => {
    useSession(await sessionFor("b"));
    await startRun();
    expect((await sent("aqkb")).word).toBe("aqkb");
    await nextRound();
    expect((await state()).run!.rounds[0].word).toBe("aqkb");
    useSession(await sessionFor("a"));
    const { run } = await state();
    expect(run!.open).toBeNull();
    expect(run!.rounds[0].word).toBe("aqkqmb");
  });

  it("a run left unfinished yesterday leaves today fresh", async () => {
    const db = getPool();
    const yesterday = (await db.query<{ d: string }>("select (private.today() - 1)::text as d")).rows[0].d;
    useSession(await sessionFor("c"));
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [SUBSTRINGS_ID, yesterday, { format: 1, game_id: SUBSTRINGS_ID, date: yesterday, rounds: ROUNDS, bonus_letter: "j" }]);
    await db.query("insert into private.run (user_id, game_id, puzzle_date) select id, $2, $3::date from auth.users where email = $1", [`${RUN}-c@example.test`, SUBSTRINGS_ID, yesterday]);
    try {
      expect((await state()).run).toMatchObject({ date: today, status: "not_started" });
    } finally {
      await db.query("delete from private.run where game_id = $1 and puzzle_date = $2::date", [SUBSTRINGS_ID, yesterday]);
      await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [SUBSTRINGS_ID, yesterday]);
    }
  });

  it("refuses Next while a round runs, and takes a second tap", async () => {
    const opened = ((await (await nextRound()).json()) as Body).run!;
    expect(opened.open).toMatchObject({ index: 1, letters: "qm" });
    const again = ((await (await nextRound()).json()) as Body).run!;
    expect(again.open!.index).toBe(1);
  });

  it("says a word was already used this run", async () => {
    expect((await sent("aqkqmb")).outcome).toBe("already_used");
    await unlock();
  });

  it("scores a word by its letters alone as it's accepted, with the bonus letter's points when it holds it", async () => {
    expect((await sent("aqmjb")).outcome).toBe("accepted");
    const { run } = await state();
    expect(run!.rounds[1]).toEqual({ letters: "qm", word: "aqm-ǰb", points: 30, bonus: 120, examples: [] });
    expect(run!.score).toEqual({ words: 70, bonus: 120, letters: 65, used: "abjkmq", total: 255 });
  });

  it("keeps examples back until the run ends, then shows a missed round's", async () => {
    // Next opens round 3, rounds 3 to 6 run out, and round 7 is the one with examples.
    for (let i = 1; i < 6; i++) {
      await timeOut();
      await nextRound();
    }
    const round7 = (await state()).run!;
    expect(round7.open).toMatchObject({ index: 6, letters: "qyz" });
    expect(JSON.stringify(round7)).not.toContain("aqyzb");
    await timeOut();
    const ended = (await state()).run!;
    expect(ended.status).toBe("finished");
    expect(ended.open).toBeNull();
    expect(ended.rounds).toHaveLength(7);
    expect(ended.rounds[0]).toEqual({ letters: "qk", word: "aqkqmb", points: 40, bonus: 0, examples: [] });
    expect(ended.rounds[6]).toEqual({ letters: "qyz", word: null, points: 0, bonus: 0, examples: ["aqyzb", "aqyzc", "aqyzd"] });
    // Six letters, a to q, are cashed in at the end, and the missed rounds score nothing.
    expect(ended.score).toEqual({ words: 70, bonus: 120, letters: 65, used: "abjkmq", total: 255 });
  });

  it("answers run_over to Next once it has ended", async () => {
    const res = await nextRound();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("run_over");
  });

  // 16e-2: a finished run's standing so far today, and nothing in it of anyone else's run but the rank.
  it("ranks a finished run among the friends who've finished, once one has", async () => {
    const db = getPool();
    const ids = (await db.query<{ email: string; id: string }>("select email, id::text from auth.users where email = any($1)", [[`${RUN}-a@example.test`, `${RUN}-b@example.test`]])).rows;
    const id = (name: string) => ids.find((r) => r.email === `${RUN}-${name}@example.test`)!.id;
    await db.query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [id("a"), id("b")]);
    // b's run has one round played, so no rank yet: fewer than 10 have finished, and b hasn't.
    expect((await state()).run!.standing).toEqual({ percent: null, friends: null });

    // b finishes, with aqkb: 25 for the word and 50 for its four letters, under a's 255.
    useSession(await sessionFor("b"));
    for (let i = 1; i < 7; i++) {
      await timeOut();
      await nextRound();
    }
    await timeOut();
    const b = (await state()).run!;
    expect(b.status).toBe("finished");
    expect(b.score!.total).toBe(75);
    expect(b.standing).toEqual({ percent: null, friends: { rank: 2, of: 2 } });
    useSession(await sessionFor("a"));
    expect((await state()).run!.standing).toEqual({ percent: null, friends: { rank: 1, of: 2 } });
  });
});
