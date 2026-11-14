// The Me tab with both games against the local stack (run with `npm run test:db`;
// docs/milestones/M16-16f-the-shared-pieces.md, 16f-1; human, 2026-11-13: "Started counts", "Add both games", "Played
// or not", "Best, average, days"). F plays on four days before today, T-4 to T-1, with an approved day in only one game
// on each. Written directly with the triggers off, as route.db.test.ts does. By hand, with the scoring function's
// numbers for round 1's word on a day whose bonus letter is j (src/app/api/leaderboard/substrings.db.test.ts):
//   T-4  Fragments, "abcdefg": 50 + 75 = 125.
//   T-3  Offbeat, a run with 125 in the ledger.
//   T-2  Fragments, "abc": 20 + 45 = 65.
//   T-1  Fragments, started and no word: 0.
// Points all time 125 + 125 + 65 + 0 = 315; days played 4 (T-3 is Offbeat's, the other three Fragments'; T-1 is
// started and unfinished); streak and longest 4; Fragments best 125, average (125 + 65 + 0) / 3, 3 days.
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as meRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const F = { email: `${RUN}-mf@example.test`, username: `mf${RUN}`, userId: "", session: new Map<string, string>() };
const admin = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
const day: Record<number, string> = {};
const fragmentsDays: string[] = [];

beforeAll(useLocalStack);

afterAll(async () => {
  const db = getPool();
  await db.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await db.query("delete from private.puzzle where game_id = $1 and puzzle_date = any($2::date[])", [SUBSTRINGS_ID, fragmentsDays]);
  await removeFixtures();
  await db.end();
  await admin.end();
});

describe("the Me tab with both games", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in F and writes the days", async () => {
    F.session = (await signIn(F.email)).session;
    const made = await createProfile(apiRequest("/api/profile", { method: "POST", body: { username: F.username } }));
    expect(made.status).toBe(201);
    F.userId = (await getPool().query<{ id: string }>("select id from auth.users where email = $1", [F.email])).rows[0].id;
    const { rows } = await getPool().query<{ k: number; date: string }>("select k, (private.today() - k)::text as date from generate_series(1, 4) k");
    for (const r of rows) day[r.k] = r.date;

    // Each day is free of a puzzle of the other game, so only one game had a day on it: ensurePuzzle refuses a real
    // Offbeat day, and the Fragments days must be inserted fresh.
    await ensurePuzzle(day[3]);
    const { rows: taken } = await getPool().query("select puzzle_date::text from private.puzzle where puzzle_date = any($1::date[]) and game_id <> $2", [
      [day[1], day[2], day[3], day[4]],
      GAME_ID,
    ]);
    expect(taken).toEqual([]);
    for (const k of [4, 2, 1]) {
      await getPool().query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [
        SUBSTRINGS_ID,
        day[k],
        { format: 1, game_id: SUBSTRINGS_ID, date: day[k], rounds: ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"], bonus_letter: "j" },
      ]);
      fragmentsDays.push(day[k]);
    }

    const client = await admin.connect();
    try {
      await client.query("begin");
      await client.query("set local session_replication_role = replica");
      const run = (game: string, k: number) =>
        client.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [F.userId, game, day[k]]);
      const word = (k: number, w: string) =>
        client.query("insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word) values ($1, $2, $3::date, 0, $4, $4)", [
          F.userId,
          SUBSTRINGS_ID,
          day[k],
          w,
        ]);
      await run(SUBSTRINGS_ID, 4);
      await word(4, "abcdefg");
      await run(GAME_ID, 3);
      await client.query("insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, $2, $3::date, 125, 0)", [
        F.userId,
        GAME_ID,
        day[3],
      ]);
      await run(SUBSTRINGS_ID, 2);
      await word(2, "abc");
      await run(SUBSTRINGS_ID, 1);
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  });

  it("counts a started day of either game as played, and adds both games' points (16f-1)", async () => {
    useSession(F.session);
    const { status, body } = await (async () => {
      const r = await meRoute(apiRequest("/api/me", { method: "GET" }));
      return { status: r.status, body: await r.json() };
    })();
    expect(status).toBe(200);
    expect(body.me.totals).toEqual({ points: 315, daysPlayed: 4, streak: 4, longestStreak: 4 });
    expect(body.me.fragments).toMatchObject({ best: 125, daysPlayed: 3 });
    expect(body.me.fragments.average).toBeCloseTo(190 / 3, 5);
    // Played or not: the month's days say which were started, in either game.
    const played = body.me.month.days.filter((d: { played: boolean }) => d.played).map((d: { date: string }) => d.date);
    expect(played).toEqual([day[4], day[3], day[2], day[1]].filter((d) => d.startsWith(body.me.month.today.slice(0, 7))).sort());
  });
});
