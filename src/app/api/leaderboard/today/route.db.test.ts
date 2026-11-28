// Today's standings against the local stack (run with `npm run test:db`; docs/milestones/M22-todays-board.md). V is the
// viewer; F and P are V's friends; S is in V's group but not V's friend; X is in neither. Runs are played through the
// routes, so each score is checked against what the player's own result screen was given. Fragments' runs use a few
// words of this file's own, as the real list isn't in git. P only starts Fragments: a Fragments run between rounds stays
// in progress whatever its clock says, so P stays "playing" however long the file takes. Overall counts only the games
// with a par, which is Fragments alone while Offbeat has none (M23 23f-2, answer 60). Today's Offbeat day is the fixture's day on a
// clock, which scores a run by the points of its answers: a common answer 10, an uncommon one 25.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as finishRoute } from "@/app/api/run/finish/route";
import { POST as offbeatNext } from "@/app/api/run/next/route";
import { POST as startOffbeat } from "@/app/api/run/start/route";
import { POST as fragmentsNext } from "@/app/api/substrings/next/route";
import { POST as startFragments } from "@/app/api/substrings/start/route";
import { POST as tryWord } from "@/app/api/substrings/try/route";
import { PAR_POINTS } from "@/config/tunables";
import { parScore, scoreAverage, scoreTotal } from "@/game/par";
import { scoreRun } from "@/game/substring-scoring";
import { getPool } from "@/lib/db";
import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as todayRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const ROUNDS = ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"];
const WORDS = ["aqkb", "aqmb", "aqnpb", "aqrsb", "aqtvb", "aqwxb", "aqyzb"];
type Player = { username: string; userId: string; session: Map<string, string> };
const player = (tag: string): Player => ({ username: `${tag}${RUN}`, userId: "", session: new Map() });
const [V, F, P, S, X] = ["tv", "tf", "tp", "ts", "tx"].map(player);
let today = "";
let club = "";
// What each player's result screen was given for their Offbeat run: its points.
const shown = new Map<string, number>();

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}
const board = async (game: string, group?: string) => {
  const r = await call(todayRoute(apiRequest(`/api/leaderboard/today?game=${game}${group ? `&group=${group}` : ""}`, { method: "GET" })));
  expect(r.status).toBe(200);
  return r.body.board;
};
const rows = (b: { entries: { username: string; points: number; you: boolean }[] }) => b.entries.map((e) => [e.username, e.points, e.you]);
const waiting = (b: { rest: { username: string; state: string }[] }) => b.rest.map((r) => [r.username, r.state]);

// These act as whoever is signed in: a test picks the player first (the linter reads useSession as a React hook, so it
// isn't called from a helper or a loop).
async function answer(index: number, text: string) {
  const r = await call(answerRoute(apiRequest("/api/run/answer", { method: "POST", body: { index, text } })));
  expect(r.status).toBe(200);
  return r.body.run;
}
// Starts the run, gives each of these texts to its question, goes on to the last question and Finishes.
async function playOffbeat(who: Player, texts: string[]) {
  expect((await call(startOffbeat(apiRequest("/api/run/start", { method: "POST" })))).status).toBe(200);
  let run;
  for (const [index, text] of texts.entries()) {
    if (index > 0) expect((await call(offbeatNext(apiRequest("/api/run/next", { method: "POST", body: { index: index - 1 } })))).status).toBe(200);
    run = await answer(index, text);
  }
  for (let index = texts.length - 1; index < 2; index++) {
    expect((await call(offbeatNext(apiRequest("/api/run/next", { method: "POST", body: { index } })))).status).toBe(200);
  }
  const finished = await call(finishRoute(apiRequest("/api/run/finish", { method: "POST" })));
  expect(finished.status).toBe(200);
  expect(finished.body.run.status).toBe("over");
  shown.set(who.username, finished.body.run.points);
  return run;
}
async function playFragments() {
  expect((await call(startFragments(apiRequest("/api/substrings/start", { method: "POST" })))).status).toBe(200);
  for (let i = 0; i < ROUNDS.length; i++) {
    const r = await call(tryWord(apiRequest("/api/substrings/try", { method: "POST", body: { text: WORDS[i] } })));
    expect(r.body.outcome).toBe("accepted");
    if (i < ROUNDS.length - 1) expect((await call(fragmentsNext(apiRequest("/api/substrings/next", { method: "POST" })))).status).toBe(200);
  }
}
const fragmentsPoints = scoreRun(WORDS, "j").total;
const fragmentsPar = parScore(fragmentsPoints, PAR_POINTS.substrings!);

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  today = (await db.query<{ d: string }>("select private.today()::text as d")).rows[0].d;
  await ensurePuzzle(today);
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

describe("today's board", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in five players; F and P are V's friends, and S is in V's group", async () => {
    const db = getPool();
    for (const [tag, p] of [["v", V], ["f", F], ["p", P], ["s", S], ["x", X]] as const) {
      p.session = (await signIn(`${RUN}-${tag}@example.test`)).session;
      expect((await call(createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } })))).status).toBe(201);
      p.userId = (await db.query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${tag}@example.test`])).rows[0].id;
    }
    for (const p of [F, P]) {
      await db.query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [V.userId, p.userId]);
    }
    // The creator must be a member by the statement's end, so the group and its members go in together.
    club = (
      await db.query<{ id: string }>(
        `with g as (insert into private.player_group (name, creator_id, invite_code) values ('Club', $1, $3) returning id),
              m as (insert into private.group_member (group_id, user_id) select g.id, $1 from g union all select g.id, $2 from g)
         select id from g`,
        [V.userId, S.userId, RUN.padEnd(10, "x").slice(0, 10)],
      )
    ).rows[0].id;
  });

  it("says there's no board for a game with no day today", async () => {
    useSession(V.session);
    expect(await board(SUBSTRINGS_ID)).toEqual({ date: today, games: [], open: false, entries: [], rest: [] });
  });

  it("is closed, with no score and no one's state, until the viewer has finished", async () => {
    useSession(F.session);
    await playOffbeat(F, ["cat", "apple"]);
    useSession(V.session);
    const closed = await board(GAME_ID);
    expect(closed).toEqual({ date: today, games: [GAME_ID], open: false, entries: [], rest: [] });
    expect(JSON.stringify(closed)).not.toContain(F.username);
    expect(await board(GAME_ID, club)).toEqual({ date: today, games: [GAME_ID], open: false, entries: [], rest: [] });
  });

  it("opens once the viewer has finished: finished players ranked with their result screen's score, then the rest", async () => {
    useSession(V.session);
    await playOffbeat(V, ["dog"]);
    const open = await board(GAME_ID);
    expect(open.open).toBe(true);
    // F: cat (uncommon, 25) and apple (common, 10); V: dog (common, 10).
    expect([shown.get(F.username), shown.get(V.username)]).toEqual([35, 10]);
    expect(rows(open)).toEqual([
      [F.username, 35, false],
      [V.username, 10, true],
    ]);
    // A friend who hasn't played; never a stranger.
    expect(waiting(open)).toEqual([[P.username, "not_played"]]);
    expect(JSON.stringify(open)).not.toContain(X.username);
  });

  it("shows a group's members, friends or not, and refuses a non-member", async () => {
    useSession(V.session);
    const group = await board(GAME_ID, club);
    expect(rows(group)).toEqual([[V.username, shown.get(V.username), true]]);
    expect(waiting(group)).toEqual([[S.username, "not_played"]]);
    useSession(X.session);
    const refused = await call(todayRoute(apiRequest(`/api/leaderboard/today?game=${GAME_ID}&group=${club}`, { method: "GET" })));
    expect(refused.status).toBe(404);
    expect(refused.body.error).toBe("group_not_found");
  });

  it("keeps Fragments, and Overall, closed until the viewer has finished Fragments too", async () => {
    const db = getPool();
    // This test's own Fragments day: an existing one fails the insert.
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [
      SUBSTRINGS_ID,
      today,
      { format: 1, game_id: SUBSTRINGS_ID, date: today, rounds: ROUNDS, bonus_letter: "j" },
    ]);
    useSession(P.session);
    expect((await call(startFragments(apiRequest("/api/substrings/start", { method: "POST" })))).status).toBe(200);
    useSession(F.session);
    await playFragments();
    useSession(V.session);
    expect(await board(SUBSTRINGS_ID)).toEqual({ date: today, games: [SUBSTRINGS_ID], open: false, entries: [], rest: [] });
    // Offbeat has no par, so it is no part of Overall: only Fragments is asked, and V has not finished it.
    expect(await board("overall")).toEqual({ date: today, games: [SUBSTRINGS_ID], open: false, entries: [], rest: [] });
  });

  it("shows Fragments as points (issue #265), and Overall as Fragments' par scores alone, Offbeat having none", async () => {
    useSession(V.session);
    await playFragments();
    const fragments = await board(SUBSTRINGS_ID);
    expect(rows(fragments)).toEqual([
      [F.username, fragmentsPoints, false],
      [V.username, fragmentsPoints, true],
    ].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
    expect(waiting(fragments)).toEqual([[P.username, "playing"]]);

    const overall = await board("overall");
    expect(overall.games).toEqual([SUBSTRINGS_ID]);
    expect(rows(overall)).toEqual([
      [F.username, scoreTotal([fragmentsPar]), false],
      [V.username, scoreTotal([fragmentsPar]), true],
    ]);
    expect(overall.entries.find((e: { you: boolean }) => e.you).average).toBe(scoreAverage([fragmentsPar]));
    // P has started Fragments only: playing.
    expect(waiting(overall)).toEqual([[P.username, "playing"]]);

    // S played Offbeat only, which is no part of Overall: on the group's Overall still to play Fragments.
    useSession(S.session);
    await playOffbeat(S, ["dog"]);
    useSession(V.session);
    const group = await board("overall", club);
    expect(rows(group)).toEqual([[V.username, scoreTotal([fragmentsPar]), true]]);
    expect(waiting(group)).toEqual([[S.username, "not_played"]]);
  });

  it("writes no ledger row for today", async () => {
    const { rows: written } = await getPool().query("select from private.points_ledger where puzzle_date = $1::date and user_id = any($2::uuid[])", [
      today,
      [V, F, P, S].map((p) => p.userId),
    ]);
    expect(written).toHaveLength(0);
  });
});
