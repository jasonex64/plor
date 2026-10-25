// Learning from misses through the answer route (docs/milestones/M13-13b-learning-from-misses.md), on the fixture
// day against the local stack: the route works out what private.record_miss needs (the normalized text, whether it's a
// near-typo, whether it holds a listed word), and an accepted text is an answer from the next day on. The rules
// themselves are in supabase/tests/misses.test.sql.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { POST as answerRoute } from "@/app/api/run/answer/route";
import { POST as startRoute } from "@/app/api/run/start/route";
import type { ApprovedPuzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, removeCreatedPuzzles } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { resolveTyped } from "./matching";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
// A new word, a word holding a listed one (LDNOOBW's "2g1c"), and a near-typo: "horze" is one edit from both horse and
// horde, so it's refused as a tie (the fixture). The first two are this run's own; "horze" is the fixture's, so a
// review of it left by an earlier run is cleared first.
const NEW = `Jackalope ${RUN}`;
const LISTED = `${RUN} 2g1c`;
const NEAR = "horze";
// RACED: crossed by two players at once.
const RACED = `bunyip ${RUN}`;
const texts = [NEW.toLowerCase(), LISTED, NEAR, RACED];
let today: ApprovedPuzzle;
let tomorrow: ApprovedPuzzle;

const review = async (text: string) =>
  (await getPool().query<{ outcome: string; thing_id: string | null }>(
    "select outcome, thing_id::text from private.miss_review where category = 'fixture_animal' and text = $1",
    [text],
  )).rows[0];

async function clearReviews(): Promise<void> {
  const db = getPool();
  const { rows } = await db.query<{ thing_id: string }>(
    "delete from private.miss_review where category = 'fixture_animal' and text = any($1) returning thing_id",
    [texts],
  );
  await db.query("delete from private.thing where id = any($1)", [rows.map((r) => r.thing_id).filter(Boolean)]);
}

beforeAll(async () => {
  useLocalStack();
  const { rows } = await getPool().query<{ today: string; tomorrow: string }>(
    "select private.today()::text as today, (private.today() + 1)::text as tomorrow",
  );
  today = await ensurePuzzle(rows[0].today);
  tomorrow = await ensurePuzzle(rows[0].tomorrow);
  await clearReviews();
});

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await clearReviews();
  await removeCreatedPuzzles();
  await db.end();
});

async function playerMisses(n: number): Promise<void> {
  await signIn(`${RUN}-m${n}@example.test`).then(({ session }) => useSession(session));
  expect((await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: `m${n}${RUN}` } }))).status).toBe(201);
  expect((await startRoute(apiRequest("/api/run/start", { method: "POST" }))).status).toBe(200);
  for (const text of [NEW, LISTED, NEAR]) {
    const r = await answerRoute(apiRequest("/api/run/answer", { method: "POST", body: { index: 0, text } }));
    expect(await r.json()).toMatchObject({ ok: true, notInList: true });
  }
}

describe("three players typing the same misses for a category", () => {
  it("decides nothing after two players", async () => {
    await playerMisses(1);
    await playerMisses(2);
    expect((await Promise.all(texts.map(review))).filter(Boolean)).toEqual([]);
  });

  it("decides each text at the third: a new word, a held word, and a near-typo", async () => {
    await playerMisses(3);
    expect(await review(NEW.toLowerCase())).toMatchObject({ outcome: "accepted", thing_id: expect.any(String) });
    expect(await review(LISTED)).toEqual({ outcome: "held", thing_id: null });
    expect(await review(NEAR)).toEqual({ outcome: "near_typo", thing_id: null });
  });

  it("makes the new word an answer from tomorrow, not today", async () => {
    const { thing_id } = await review(NEW.toLowerCase());
    expect(await resolveTyped(getPool(), today, 0, NEW, [])).toBeNull();
    expect(await resolveTyped(getPool(), tomorrow, 0, NEW, [])).toEqual({ thingId: thing_id, caught: false });
  });
});

// The advisory lock in private.record_miss (CLAUDE.md: concurrency is tested; 13b review): two misses crossing the
// threshold in open transactions at once decide the text once, and the second waits instead of failing on the
// review's unique key.
describe("two players crossing the threshold at the same moment", () => {
  it("decides the text once, and neither request fails", async () => {
    const db = getPool();
    const users: string[] = [];
    for (let n = 1; n <= 4; n++) {
      const { rows } = await db.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [
        `${RUN}-r${n}@example.test`,
      ]);
      await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, 'offbeat', $2::date)", [rows[0].id, today.date]);
      users.push(rows[0].id);
    }
    const miss = (c: { query: typeof db.query }, user: string) =>
      c.query<{ logged: boolean }>("select private.record_miss($1, 'offbeat', $2::date, 0, $3, $3, false, false, 3, 1) as logged", [user, today.date, RACED]);
    await miss(db, users[0]);
    await miss(db, users[1]);
    const [a, b] = [await db.connect(), await db.connect()];
    try {
      await a.query("begin");
      await b.query("begin");
      await miss(a, users[2]);
      const second = miss(b, users[3]);
      await expect
        .poll(async () => (await db.query<{ n: number }>("select count(*)::int as n from pg_locks where locktype = 'advisory' and not granted")).rows[0].n)
        .toBe(1);
      await a.query("commit");
      expect((await second).rows).toEqual([{ logged: true }]);
      await b.query("commit");
    } finally {
      a.release();
      b.release();
    }
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from private.miss_review where text = $1", [RACED]);
    expect(rows[0].n).toBe(1);
  });
});
