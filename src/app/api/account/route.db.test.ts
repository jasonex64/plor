// The account page's data against the local stack (run with `npm run test:db`; docs/milestones/M12-account.md, 12a).
// A real player signs in; their runs are written directly (yesterday can't be played now), as the friends leaderboard
// test does, and answered today, so they earn no rarity bonus (M09 D8) and each total is its ladder.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { GAME_ID, type Puzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { ensurePuzzle, removeCreatedPuzzles, safeEntry } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { GET as accountRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const email = `${RUN}-acct@example.test`;
const username = `acct${RUN}`;
let userId = "";
let session = new Map<string, string>();
const days: Record<"today" | "yesterday" | "earlier" | "longAgo", string> = { today: "", yesterday: "", earlier: "", longAgo: "" };

async function call() {
  const r = await accountRoute(apiRequest("/api/account", { method: "GET" }));
  return { status: r.status, body: await r.json() };
}
const ledgerRows = async () => (await getPool().query("select from private.points_ledger where user_id = $1", [userId])).rows.length;

// A run on that day: safe on question 1, then caught by the host on question 2, so its ladder is question 1's points.
async function survivedOne(date: string, puzzle: Puzzle) {
  const db = getPool();
  await db.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [userId, GAME_ID, date]);
  await db.query(
    "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 0, $4, false)",
    [userId, GAME_ID, date, safeEntry(puzzle, 0)],
  );
  await db.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, 1)", [
    userId,
    GAME_ID,
    date,
  ]);
  await db.query(
    "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, $2, $3::date, 1, $4, true)",
    [userId, GAME_ID, date, puzzle.questions[1].host_answers[0]],
  );
}

// A run and its ledger row written directly, as if settled long ago.
async function settled(date: string, points: number) {
  await ensurePuzzle(date);
  await getPool().query("insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)", [userId, GAME_ID, date]);
  await getPool().query(
    "insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, $2, $3::date, $4, 0)",
    [userId, GAME_ID, date, points],
  );
}

beforeAll(async () => {
  useLocalStack();
  const { rows } = await getPool().query<{ today: string; yesterday: string; earlier: string; longAgo: string }>(
    `select private.today()::text as today, (private.today() - 1)::text as yesterday, (private.today() - 3)::text as earlier,
            (private.today() - 40)::text as "longAgo"`,
  );
  Object.assign(days, rows[0]);
});

afterAll(async () => {
  // Deleting the auth user cascades to the profile, runs and ledger rows; then the fixture puzzles go.
  await getPool().query("delete from auth.users where email = $1", [email]);
  await removeCreatedPuzzles();
  await getPool().end();
});

describe("the account page's data", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in a player with a username, and no points yet", async () => {
    session = (await signIn(email)).session;
    useSession(session);
    expect((await createProfile(apiRequest("/api/profile", { method: "POST", body: { username } }))).status).toBe(201);
    userId = (await getPool().query<{ id: string }>("select id from auth.users where email = $1", [email])).rows[0].id;
    expect(await call()).toEqual({ status: 200, body: { ok: true, account: { username, displayName: null, allTimePoints: 0 } } });
  });

  it("sums every week's ledger rows, settling a finished run on a closed day first, and not today's (M09 D3, D9)", async () => {
    // Two settled days weeks apart: 1000 and 100. Yesterday's run survived question 1 and isn't settled yet. Today's
    // did the same, and today isn't closed.
    await settled(days.longAgo, 1000);
    await settled(days.earlier, 100);
    await survivedOne(days.yesterday, await ensurePuzzle(days.yesterday));
    await survivedOne(days.today, await ensurePuzzle(days.today));
    expect(await ledgerRows()).toBe(2);

    useSession(session);
    const r = await call();
    expect(r.status).toBe(200);
    // 1000 + 100 + yesterday's 25 (question 1's points); today's 25 waits for midnight.
    expect(r.body.account.allTimePoints).toBe(1125);
    expect(await ledgerRows()).toBe(3);
    // Again: the same total, and nothing settled twice.
    expect((await call()).body.account.allTimePoints).toBe(1125);
    expect(await ledgerRows()).toBe(3);
  });
});
