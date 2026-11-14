// The endless feed's pages against the local stack (run with `npm run test:db`; docs/milestones/M16-16f-the-shared-pieces.md,
// 16f-4). Players sign in and make profiles through the route handlers; their runs, comments and reactions are written
// directly with the game's rules switched off (as src/app/api/comments/substrings.db.test.ts does), so each item's time
// is chosen: a day's items sit on minutes after that day's start. V is the viewer of the paging; F, P and E are friends
// of W, and F of V; S is a stranger; K was blocked by V, and L blocked V, each with the friendship left in place so only
// the block can hide them; G is in V's group Club but isn't V's friend.
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { type ApprovedPuzzle } from "@/content/puzzle";
import { FEED_PAGE_SIZE } from "@/config/tunables";
import { createGroup, getGroup, joinGroup } from "@/groups/groups";
import { scoreRun } from "@/game/substring-scoring";
import { getPool } from "@/lib/db";
import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import { commentReactions, runReactions } from "@/reactions/reactions";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, nameOf, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as itemsRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const player = (tag: string) => ({ email: `${RUN}-${tag}@example.test`, username: `${tag}${RUN}`, userId: "", session: new Map<string, string>() });
const [V, F, S, K, L, G, W, P, E] = ["pv", "pf", "ps", "pk", "pl", "pg", "pw", "pp", "pe"].map(player);
const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
let today = "";
let yesterday = "";
let puzzle: ApprovedPuzzle;
let club = "";

type Item = {
  kind: "comment" | "result";
  game: string;
  date: string;
  at: string;
  username: string;
  mine: boolean;
  id?: string;
  userId?: string;
  body?: string;
  group?: { id: string; name: string } | null;
  blurred?: boolean;
  ended?: unknown;
  score?: number;
  reactions?: { counts: { emoji: string; count: number }[]; mine: string | null };
};

async function page(cursor?: string) {
  const response = await itemsRoute(apiRequest(cursor === undefined ? "/api/feed/items" : `/api/feed/items?cursor=${encodeURIComponent(cursor)}`, { method: "GET" }));
  return { status: response.status, body: await response.json() };
}
// Every page from the first, in order.
async function pages(): Promise<Item[][]> {
  const out: Item[][] = [];
  let cursor: string | undefined;
  do {
    const { body } = await page(cursor);
    out.push(body.feed.items);
    cursor = body.feed.next ?? undefined;
  } while (cursor !== undefined);
  return out;
}
const flat = async () => (await pages()).flat();
const keyOf = (i: Item) => (i.kind === "comment" ? `c:${i.id}` : `r:${i.game}:${i.userId}:${i.date}`);

// An instant: `seconds` after the start of the day, as the feed prints it.
async function stamp(date: string, seconds: number): Promise<string> {
  const { rows } = await getPool().query<{ at: string }>(
    `select to_char(((($1::date)::timestamp at time zone 'America/Los_Angeles') + make_interval(secs => $2)) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at`,
    [date, seconds],
  );
  return rows[0].at;
}
const minute = (date: string, m: number) => stamp(date, m * 60);

// Everything below is one transaction with triggers and foreign-key checks off, so rows can be written as the app would
// have by a given time.
async function seed(write: (q: (sql: string, params: unknown[]) => Promise<{ rows: { id: string }[] }>) => Promise<void>) {
  const client = await admin.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    await write((sql, params) => client.query(sql, params));
    await client.query("commit");
  } finally {
    client.release();
  }
}
type Q = Parameters<Parameters<typeof seed>[0]>[0];

const runOf = (q: Q, p: { userId: string }, game: string, date: string, startedAt?: string) =>
  q("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, coalesce($4::timestamptz, now()))", [p.userId, game, date, startedAt ?? null]);
// Offbeat, caught on question 1 at an instant.
async function caught(q: Q, p: { userId: string }, date: string, at: string) {
  await runOf(q, p, GAME_ID, date);
  await q("insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched, created_at) values ($1, $2, $3::date, 0, $4, true, $5::timestamptz)", [
    p.userId,
    GAME_ID,
    date,
    puzzle.questions[0].host_answers[0],
    at,
  ]);
}
const WORD = "qyzx";
// Fragments, finished with a word in the last round at an instant.
async function fragments(q: Q, p: { userId: string }, date: string, at: string) {
  await runOf(q, p, SUBSTRINGS_ID, date);
  await q("insert into private.question_open (user_id, game_id, puzzle_date, question_idx, opened_at) values ($1, $2, $3::date, 6, $4::timestamptz)", [p.userId, SUBSTRINGS_ID, date, at]);
  await q("insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word, created_at) values ($1, $2, $3::date, 6, $4, $4, $5::timestamptz)", [p.userId, SUBSTRINGS_ID, date, WORD, at]);
}
const comment = async (q: Q, p: { userId: string }, game: string, date: string, body: string, at: string, group: string | null = null) =>
  (await q("insert into private.comment (user_id, game_id, puzzle_date, body, created_at, group_id) values ($1, $2, $3::date, $4, $5::timestamptz, $6) returning id::text as id", [p.userId, game, date, body, at, group])).rows[0].id;
const befriend = (q: Q, x: { userId: string }, y: { userId: string }) =>
  q("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [x.userId, y.userId]);

// What the paging test seeded, by key, for V.
const expected = new Map<string, { game: string; date: string }>();

beforeAll(async () => {
  useLocalStack();
  const db = getPool();
  const { rows } = await db.query<{ today: string; yesterday: string }>("select private.today()::text as today, (private.today() - 1)::text as yesterday");
  ({ today, yesterday } = rows[0]);
  await ensurePuzzle(today);
  puzzle = await ensurePuzzle(yesterday);
  // These Fragments days must be this test's own: an existing one fails the insert.
  for (const date of [today, yesterday]) {
    await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [
      SUBSTRINGS_ID,
      date,
      { format: 1, game_id: SUBSTRINGS_ID, date, rounds: ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"], bonus_letter: "j" },
    ]);
  }
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = any($2::date[])", [SUBSTRINGS_ID, [today, yesterday]]);
  await removeFixtures();
  await db.end();
  await admin.end();
});

describe("the feed's pages", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in nine players and makes their friendships, Club and its members", async () => {
    for (const p of [V, F, S, K, L, G, W, P, E]) p.session = (await signIn(p.email)).session;
    // Not a loop: the linter reads useSession as a React hook.
    useSession(V.session);
    await enroll(V);
    useSession(F.session);
    await enroll(F);
    useSession(S.session);
    await enroll(S);
    useSession(K.session);
    await enroll(K);
    useSession(L.session);
    await enroll(L);
    useSession(G.session);
    await enroll(G);
    useSession(W.session);
    await enroll(W);
    useSession(P.session);
    await enroll(P);
    useSession(E.session);
    await enroll(E);
    await seed(async (q) => {
      for (const p of [F, K, L, P]) await befriend(q, V, p);
      for (const p of [F, P, E]) await befriend(q, W, p);
      // Blocks written with the friendship trigger off, so the friendship stays: only the block can hide them.
      await q("insert into private.block (blocker, blocked) values ($1, $2), ($3, $4)", [V.userId, K.userId, L.userId, V.userId]);
    });
    club = (await createGroup(getPool(), V.userId, "Club")).id;
    await joinGroup(getPool(), G.userId, (await getGroup(getPool(), V.userId, club)).inviteCode);
  });

  it("seeds 45 items for V: 7 results and 38 comments over today and yesterday, with players V may not see among them", async () => {
    const result = (p: { userId: string }, game: string, date: string) => expected.set(`r:${game}:${p.userId}:${date}`, { game, date });
    const when = async (date: string, m: number) => minute(date, m);
    await seed(async (q) => {
      // Results: V's own and F's; the minutes 3 and 4 are shared with comments, so ties are broken by kind and tie.
      await caught(q, V, today, await when(today, 40));
      await fragments(q, V, today, await when(today, 41));
      await caught(q, V, yesterday, await when(yesterday, 40));
      await caught(q, F, today, await when(today, 3));
      await fragments(q, F, today, await when(today, 4));
      await caught(q, F, yesterday, await when(yesterday, 3));
      await fragments(q, F, yesterday, await when(yesterday, 4));
      for (const [p, game, date] of [
        [V, GAME_ID, today],
        [V, SUBSTRINGS_ID, today],
        [V, GAME_ID, yesterday],
        [F, GAME_ID, today],
        [F, SUBSTRINGS_ID, today],
        [F, GAME_ID, yesterday],
        [F, SUBSTRINGS_ID, yesterday],
      ] as const)
        result(p, game, date);

      // Comments, two to a minute, so some share an instant.
      const batch = async (p: typeof V, game: string, date: string, n: number, from: number, group: string | null = null) => {
        for (let i = 0; i < n; i++) {
          const id = await comment(q, p, game, date, `${p.username} ${game} ${date} ${i}`, await when(date, from + Math.floor(i / 2)), group);
          expected.set(`c:${id}`, { game, date });
        }
      };
      await batch(F, GAME_ID, today, 10, 1);
      await batch(F, SUBSTRINGS_ID, today, 8, 1);
      await batch(F, GAME_ID, yesterday, 6, 1);
      await batch(F, SUBSTRINGS_ID, yesterday, 4, 1);
      await caught(q, G, today, await when(today, 5));
      await batch(V, GAME_ID, today, 5, 20);
      await batch(G, GAME_ID, today, 5, 30, club);

      // Not for V: a stranger's, the blocked pair's, and a comment V reported.
      await caught(q, S, today, await when(today, 6));
      await caught(q, K, today, await when(today, 6));
      await caught(q, L, today, await when(today, 6));
      await fragments(q, S, today, await when(today, 7));
      await fragments(q, K, yesterday, await when(yesterday, 7));
      await comment(q, S, GAME_ID, today, "stranger", await when(today, 6));
      await comment(q, K, GAME_ID, today, "blocked by V", await when(today, 6));
      await comment(q, L, GAME_ID, today, "blocked V", await when(today, 6));
      const reported = await comment(q, F, GAME_ID, today, "reported by V", await when(today, 6));
      await q("insert into private.comment_report (comment_id, reporter_id) values ($1::bigint, $2)", [reported, V.userId]);
      // P's run is still going, so it is no item; G's own result is no item either, G not being V's friend.
      await runOf(q, P, GAME_ID, today);
    });
    expect(expected.size).toBe(45);
  });

  it("comes back as pages of 20, 20 and 5, newest first, with nothing repeated or missed", async () => {
    useSession(V.session);
    const all = await pages();
    expect(FEED_PAGE_SIZE).toBe(20);
    expect(all.map((p) => p.length)).toEqual([20, 20, 5]);
    const items = all.flat();
    expect(new Set(items.map(keyOf))).toEqual(new Set(expected.keys()));
    expect(items).toHaveLength(45);
    // Newest first: times never rise, and a day's items come before an earlier day's.
    for (let i = 1; i < items.length; i++) expect(items[i - 1].at >= items[i].at).toBe(true);
    for (let i = 1; i < items.length; i++) expect(items[i - 1].date >= items[i].date).toBe(true);
    // Each item says its game and puzzle day as they were written.
    for (const i of items) expect({ game: i.game, date: i.date }).toEqual(expected.get(keyOf(i)));
    // The second page crosses from today into yesterday.
    expect(new Set(all[1].map((i) => i.date))).toEqual(new Set([today, yesterday]));
    expect(all[2].every((i) => i.date === yesterday)).toBe(true);
  });

  it("holds its place when an item is added after the first page: pages 2 and 3 are the same", async () => {
    useSession(V.session);
    const before = await pages();
    const first = await page();
    let newId = "";
    await seed(async (q) => {
      newId = await comment(q, F, GAME_ID, today, "added between pages", await minute(today, 90));
    });
    try {
      const second = await page(first.body.feed.next);
      const third = await page(second.body.feed.next);
      expect(second.body.feed.items).toEqual(before[1]);
      expect(third.body.feed.items).toEqual(before[2]);
      expect(third.body.feed.next).toBeNull();
      expect((await page()).body.feed.items[0].id).toBe(newId);
    } finally {
      await seed(async (q) => {
        await q("delete from private.comment where id = $1::bigint", [newId]);
      });
    }
  });

  it("shows V the friends' and own results, and a group member's comment with its group, and nothing else", async () => {
    useSession(V.session);
    const items = await flat();
    const results = items.filter((i) => i.kind === "result");
    expect(results.map((i) => `${i.username}:${i.game}:${i.date}`).sort()).toEqual(
      [
        [V, GAME_ID, today],
        [V, SUBSTRINGS_ID, today],
        [V, GAME_ID, yesterday],
        [F, GAME_ID, today],
        [F, SUBSTRINGS_ID, today],
        [F, GAME_ID, yesterday],
        [F, SUBSTRINGS_ID, yesterday],
      ]
        .map(([p, game, date]) => `${(p as typeof V).username}:${game}:${date}`)
        .sort(),
    );
    expect(results.filter((i) => i.mine).map((i) => i.username)).toEqual([V.username, V.username, V.username]);
    // No stranger, blocked player (either way), group-only member or unfinished run.
    const names = new Set(items.map((i) => i.username));
    for (const p of [S, K, L, P]) expect(names.has(p.username)).toBe(false);
    expect(items.some((i) => i.kind === "result" && i.username === G.username)).toBe(false);
    const club5 = items.filter((i) => i.kind === "comment" && i.username === G.username);
    expect(club5).toHaveLength(5);
    expect(club5.every((i) => i.group?.id === club && i.group.name === "Club")).toBe(true);
    expect(items.filter((i) => i.kind === "comment" && i.username === F.username).every((i) => i.group === null)).toBe(true);
    expect(items.some((i) => i.body === "reported by V")).toBe(false);
  });

  it("has V's friends' reactions on a comment and on a result as the reactions' own readers count them", async () => {
    await seed(async (q) => {
      // V reacts to both of F's runs today.
      await q("insert into private.reaction (user_id, game_id, puzzle_date, run_user_id, emoji) values ($1, $2, $3::date, $4, '😂'), ($1, $5, $3::date, $4, '👍')", [
        V.userId,
        GAME_ID,
        today,
        F.userId,
        SUBSTRINGS_ID,
      ]);
    });
    useSession(V.session);
    const items = await flat();
    const own = items.find((i) => i.kind === "result" && i.game === GAME_ID && i.userId === F.userId && i.date === today)!;
    const theirs = await runReactions(getPool(), V.userId, GAME_ID, today, [F.userId]);
    expect(own.reactions).toEqual(theirs.get(F.userId));
    expect(own.reactions!.counts).toEqual([{ emoji: "😂", count: 1 }]);
    const frag = items.find((i) => i.kind === "result" && i.game === SUBSTRINGS_ID && i.userId === F.userId && i.date === today)!;
    expect(frag.reactions).toEqual((await runReactions(getPool(), V.userId, SUBSTRINGS_ID, today, [F.userId])).get(F.userId));

    // A Club member's reaction on a Club comment counts for every member, friend or not.
    const [target] = items.filter((i) => i.kind === "comment" && i.username === G.username);
    await seed(async (q) => {
      await q("insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji) values ($1, $2, $3::date, $4::bigint, '😮')", [G.userId, GAME_ID, today, target.id]);
    });
    const again = (await flat()).find((i) => i.id === target.id)!;
    expect(again.reactions).toEqual((await commentReactions(getPool(), V.userId, [target.id!])).get(target.id!));
    expect(again.reactions!.counts).toEqual([{ emoji: "😮", count: 1 }]);
  });

  it("blurs today's result of a game W hasn't finished: name, game and time, and nothing of the run or its reactions", async () => {
    await seed(async (q) => {
      await caught(q, W, today, await minute(today, 50));
      await comment(q, F, SUBSTRINGS_ID, today, "words about fragments", await minute(today, 60));
      // W reacts to F's runs and F's Fragments comment, so there is something to withhold.
      await q("insert into private.reaction (user_id, game_id, puzzle_date, run_user_id, emoji) values ($1, $2, $3::date, $4, '😂'), ($1, $5, $3::date, $4, '😢'), ($1, $5, $6::date, $4, '❤️')", [
        W.userId,
        GAME_ID,
        today,
        F.userId,
        SUBSTRINGS_ID,
        yesterday,
      ]);
    });
    useSession(W.session);
    const items = await flat();
    const find = (game: string, date: string, p = F) => items.find((i) => i.kind === "result" && i.game === game && i.date === date && i.userId === p.userId)!;

    const hidden = find(SUBSTRINGS_ID, today);
    expect(hidden).toEqual({
      kind: "result",
      game: SUBSTRINGS_ID,
      date: today,
      at: await minute(today, 4),
      username: F.username,
      name: F.username,
      mine: false,
      userId: F.userId,
      blurred: true,
    });
    expect(Object.keys(hidden).sort()).toEqual(["at", "blurred", "date", "game", "kind", "mine", "name", "userId", "username"]);

    // Offbeat is W's own finished game: whole. Yesterday's Fragments is whole whatever W played then.
    expect(find(GAME_ID, today)).toMatchObject({ blurred: false, ended: { result: "caught", question: 1, answer: nameOf(puzzle.questions[0].host_answers[0]) } });
    expect(find(GAME_ID, today).reactions).toEqual((await runReactions(getPool(), W.userId, GAME_ID, today, [F.userId])).get(F.userId));
    const yest = find(SUBSTRINGS_ID, yesterday);
    expect(yest).toMatchObject({ blurred: false, score: scoreRun([WORD], "j").total });
    expect(yest.reactions!.counts).toEqual([{ emoji: "❤️", count: 1 }]);
    expect(find(GAME_ID, today, W)).toMatchObject({ mine: true, blurred: false });

    // A friend's comment on the game W hasn't finished comes with its body.
    expect(items.find((i) => i.body === "words about fragments")).toMatchObject({ kind: "comment", game: SUBSTRINGS_ID, date: today });
  });

  it("shows the whole result once W has finished that game", async () => {
    await seed(async (q) => {
      await fragments(q, W, today, await minute(today, 51));
    });
    useSession(W.session);
    const shown = (await flat()).find((i) => i.kind === "result" && i.game === SUBSTRINGS_ID && i.date === today && i.userId === F.userId)!;
    expect(shown).toMatchObject({ blurred: false, score: scoreRun([WORD], "j").total });
    expect(shown.reactions).toEqual((await runReactions(getPool(), W.userId, SUBSTRINGS_ID, today, [F.userId])).get(F.userId));
    expect(shown.reactions!.counts).toEqual([{ emoji: "😢", count: 1 }]);
  });

  it("orders a run that ran out of time by its deadline, a finished one by its last answer or round, and gives their endings", async () => {
    await seed(async (q) => {
      // P: Offbeat yesterday started at minute 10 with no answer, so its 20 seconds ended at 10 minutes 20 seconds.
      await runOf(q, P, GAME_ID, yesterday, await minute(yesterday, 10));
      // E: Offbeat yesterday survived, its seventh answer at minute 20; Fragments yesterday with no word in its last round,
      // opened at minute 30, so ended at its 20 seconds.
      await runOf(q, E, GAME_ID, yesterday);
      for (let i = 0; i < puzzle.questions.length; i++) {
        await q("insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched, created_at) values ($1, $2, $3::date, $4, 'x', false, $5::timestamptz)", [
          E.userId,
          GAME_ID,
          yesterday,
          i,
          await minute(yesterday, 14 + i),
        ]);
      }
      await runOf(q, E, SUBSTRINGS_ID, yesterday);
      await q("insert into private.question_open (user_id, game_id, puzzle_date, question_idx, opened_at) values ($1, $2, $3::date, 6, $4::timestamptz)", [E.userId, SUBSTRINGS_ID, yesterday, await minute(yesterday, 30)]);
    });
    useSession(W.session);
    const items = await flat();
    const find = (p: typeof P, game: string) => items.find((i) => i.kind === "result" && i.userId === p.userId && i.game === game && i.date === yesterday)!;
    expect(find(P, GAME_ID)).toMatchObject({ at: await stamp(yesterday, 620), ended: { result: "timed_out", question: 1 } });
    expect(find(E, GAME_ID)).toMatchObject({ at: await minute(yesterday, 20), ended: { result: "survived" } });
    expect(find(E, SUBSTRINGS_ID)).toMatchObject({ at: await stamp(yesterday, 1820), score: 0 });
    // P's run today is still going, so it is no item.
    expect(items.some((i) => i.kind === "result" && i.userId === P.userId && i.date === today)).toBe(false);
  });

  it("refuses a malformed cursor with 400, and a signed-out request with 401", async () => {
    useSession(V.session);
    const real = (await page()).body.feed.next as string;
    const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
    for (const bad of ["", "nonsense", "!!!", encode({}), encode(["2026-01-01T00:00:00.000000Z", 0]), encode(["yesterday", 0, "x"]), encode(["2026-13-45T00:00:00.000000Z", 0, "x"]), encode(["2026-01-01T00:00:00.000000Z", 2, "x"]), encode(["2026-01-01T00:00:00.000000Z", 0, ""]), encode(["2026-01-01T00:00:00.000000Z", 0, 5])]) {
      expect(await page(bad), bad).toEqual({ status: 400, body: { ok: false, error: "bad_request" } });
    }
    expect((await page(real)).status).toBe(200);
    useSession(new Map());
    expect((await page()).status).toBe(401);
  });
});

// Makes the signed-in player's profile and reads their ID.
async function enroll(p: { username: string; email: string; userId: string }) {
  const response = await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: p.username } }));
  expect(response.status).toBe(201);
  p.userId = (await getPool().query<{ id: string }>("select id from auth.users where email = $1", [p.email])).rows[0].id;
}
