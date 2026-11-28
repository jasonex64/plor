// Fragments' live board over HTTP against the local stack (run with `npm run test:db`;
// docs/milestones/M16-16f-the-shared-pieces.md, 16f-6; the human's answers 4, 33 and 55): each game has its own board; a
// friend shows not started, started, on round k of the day's rounds, and finished with their score, and a viewer who
// hasn't finished Fragments is told only whether the friend has started. Runs are played through the routes with a few
// words of this file's own, as the real list isn't in git. V is the viewer; F and W are V's friends; W doesn't finish.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as reactRoute } from "@/app/api/reactions/route";
import { POST as startOffbeat } from "@/app/api/run/start/route";
import { POST as next } from "@/app/api/substrings/next/route";
import { POST as startRun } from "@/app/api/substrings/start/route";
import { POST as tryWord } from "@/app/api/substrings/try/route";
import { scoreRun } from "@/game/substring-scoring";
import { getPool } from "@/lib/db";
import { SUBSTRINGS_ID } from "@/platform/game";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as boardRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const ROUNDS = ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"];
const WORDS = ["aqkb", "aqmb", "aqnpb", "aqrsb", "aqtvb", "aqwxb", "aqyzb"];
type Player = { username: string; userId: string; session: Map<string, string> };
const player = (tag: string): Player => ({ username: `${tag}${RUN}`, userId: "", session: new Map() });
const [V, F, W] = ["bv", "bf", "bw"].map(player);
let today = "";

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const board = (game: string | null = SUBSTRINGS_ID) => call(boardRoute(apiRequest(game === null ? "/api/board" : `/api/board?game=${game}`, { method: "GET" })));
const friendOf = async (who: Player, game: string = SUBSTRINGS_ID) => {
  const { body } = await board(game);
  return { board: body.board, row: body.board.friends.find((f: { username: string }) => f.username === who.username) };
};
// These act as whoever is signed in: a test picks the player first (the linter reads useSession as a React hook, so it
// isn't called from a helper or a loop).
const start = () => call(startRun(apiRequest("/api/substrings/start", { method: "POST" })));
const pressNext = () => call(next(apiRequest("/api/substrings/next", { method: "POST" })));
// A word in each round from to (excluded), pressing Next between them but not after the last.
async function playRounds(from: number, to: number) {
  for (let i = from; i < to; i++) {
    const r = await call(tryWord(apiRequest("/api/substrings/try", { method: "POST", body: { text: WORDS[i] } })));
    expect(r.body.outcome).toBe("accepted");
    if (i < to - 1) expect((await pressNext()).status).toBe(200);
  }
}

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  today = (await db.query<{ d: string }>("select private.today()::text as d")).rows[0].d;
  await ensurePuzzle(today);
  // This test's own Fragments day: an existing one fails the insert.
  await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [
    SUBSTRINGS_ID,
    today,
    { format: 1, game_id: SUBSTRINGS_ID, date: today, rounds: ROUNDS, bonus_letter: "j" },
  ]);
  await db.query("insert into private.dictionary_word (word_key, spelling, plain, everyday) select w, w, w, true from unnest($1::text[]) as w on conflict do nothing", [WORDS]);
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [SUBSTRINGS_ID, today]);
  await db.query("delete from private.dictionary_word where word_key = any($1)", [WORDS]);
  await removeFixtures();
  await db.end();
});

describe("Fragments' live board over HTTP", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in three players, and makes V a friend of F and of W", async () => {
    for (const [tag, p] of [["v", V], ["f", F], ["w", W]] as const) {
      p.session = (await signIn(`${RUN}-${tag}@example.test`)).session;
      expect((await call(createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } })))).status).toBe(201);
      p.userId = (await getPool().query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${tag}@example.test`])).rows[0].id;
    }
    for (const p of [F, W]) {
      await getPool().query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [V.userId, p.userId]);
    }
  });

  it("names its game: a request without one, or with another, is refused", async () => {
    useSession(V.session);
    for (const game of [null, "chess", "overall"]) {
      const r = await board(game);
      expect(r.status).toBe(400);
      expect(r.body.error).toBe("unknown_game");
    }
  });

  it("shows a friend who hasn't played, with the day's rounds and the games played today", async () => {
    useSession(V.session);
    const { board: b, row } = await friendOf(F);
    expect(b).toMatchObject({ game: SUBSTRINGS_ID, date: today, finished: false, mine: null, rounds: 7, games: ["offbeat", SUBSTRINGS_ID] });
    expect(row).toMatchObject({ state: "not_started", question: null, ended: null, score: null });
  });

  it("shows a friend who started, and one on round 2, only as started while the viewer hasn't finished", async () => {
    useSession(F.session);
    await start();
    await playRounds(0, 1);
    await pressNext();
    useSession(V.session);
    const { row } = await friendOf(F);
    // No place either, until the viewer has finished (M25 25a).
    expect(row).toMatchObject({ state: "started", question: null, ended: null, score: null, reactions: null, place: null });
    // The fields themselves are absent of the friend's words and running score, not only unshown.
    expect(JSON.stringify((await board()).body)).not.toContain(WORDS[0]);
  });

  it("gives a friend's row exactly the fields it did, plus the score", async () => {
    useSession(V.session);
    expect(Object.keys((await friendOf(F)).row).sort()).toEqual(["ended", "name", "place", "question", "reactions", "score", "state", "userId", "username"]);
  });

  it("shows 'on round 2' once the viewer has finished, and no words or score", async () => {
    useSession(V.session);
    await start();
    await playRounds(0, 7);
    const { board: b, row } = await friendOf(F);
    expect(b.finished).toBe(true);
    // A Fragments board has no Offbeat place list: how a run ended is Offbeat's.
    expect(b.mine).toBeNull();
    // A friend still playing has no place: today's leaderboard ranks only finished runs.
    expect(row).toMatchObject({ state: "playing", question: 2, ended: null, score: null, place: null });
    const text = JSON.stringify((await board()).body);
    for (const word of WORDS) expect(text).not.toContain(`"${word}"`);
  });

  it("follows a friend round by round", async () => {
    useSession(F.session);
    await playRounds(1, 3);
    useSession(V.session);
    expect((await friendOf(F)).row).toMatchObject({ state: "playing", question: 4 });
  });

  it("shows a friend's score once they and the viewer have both finished, and never their words", async () => {
    useSession(F.session);
    await pressNext();
    await playRounds(3, 7);
    useSession(V.session);
    const { row } = await friendOf(F);
    expect(row).toMatchObject({ state: "finished", question: null, ended: null, score: scoreRun(WORDS, "j").total });
    // Their place today among the two who have finished (W, V's other friend, has not): F and V played the same words, so
    // they tie and go by name, one 1st and the other 2nd, each seeing the other's place (M25 25a).
    expect(row.place).toMatchObject({ of: 2 });
    useSession(F.session);
    const back = (await friendOf(V)).row;
    expect([row.place!.place, back.place!.place].sort()).toEqual([1, 2]);
    expect(back.place).toMatchObject({ of: 2 });
    useSession(V.session);
    const text = JSON.stringify((await board()).body);
    for (const word of WORDS) expect(text).not.toContain(`"${word}"`);
  });

  it("tells a viewer who hasn't finished only that a friend who has finished has started", async () => {
    useSession(W.session);
    // W's only friend here is V, who has finished: W sees V as started, though V is done and scored.
    const { row } = await friendOf(V);
    expect(row).toMatchObject({ state: "started", question: null, ended: null, score: null, reactions: null, place: null });
  });

  it("lets the viewer react to a friend's Fragments run, counted on Fragments' board and not Offbeat's", async () => {
    useSession(V.session);
    const r = await call(reactRoute(apiRequest("/api/reactions", { method: "POST", body: { game: SUBSTRINGS_ID, date: today, target: { type: "run", userId: F.userId }, emoji: "👍" } })));
    expect(r.status).toBe(200);
    expect((await friendOf(F)).row.reactions).toEqual({ counts: [{ emoji: "👍", count: 1, names: [] }], mine: "👍" });
    expect((await friendOf(F, "offbeat")).row).toMatchObject({ state: "not_started", reactions: null });
  });

  it("keeps Offbeat's board its own: a Fragments run is not an Offbeat run", async () => {
    useSession(V.session);
    await call(startOffbeat(apiRequest("/api/run/start", { method: "POST" })));
    const { board: b, row } = await friendOf(F, "offbeat");
    expect(b).toMatchObject({ game: "offbeat", rounds: null, finished: false });
    expect(row).toMatchObject({ state: "not_started" });
  });
});
