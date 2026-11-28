// A player's all-time points against the local stack (run with `npm run test:db`; docs/milestones/M12-account.md, 12a,
// where the account page showed them; Me's totals since M14 14a-3a, which moved this case from GET /api/account's test
// in 14a-3b). A real player signs in; their runs are written directly (yesterday can't be played now), as the friends
// leaderboard test does. A closed day's answers are given at its noon, as an answer after its midnight counts nothing
// (M16 16e-3a). A day on a clock scores each answer by its tier, with no bonus (docs/milestones/M23-23c-the-run-on-a-clock.md).
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as createProfile } from "@/app/api/profile/route";
import { GAME_ID } from "@/platform/game";
import { getPool } from "@/lib/db";
import { signIn, useLocalStack, useSession } from "@/test/local-stack";
import { writeClockRun } from "@/test/clock-runs";
import { fixtureId } from "@/test/answer-fixture";
import { ensurePuzzle, removeFixtures } from "@/test/puzzles";
import { apiRequest } from "@/test/request-scope";
import { allTimePoints } from "./ledger";
import { localStack } from "../../scripts/slot.ts";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const admin = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 1 });
const email = `${RUN}-acct@example.test`;
const username = `acct${RUN}`;
let userId = "";
const days: Record<"today" | "yesterday" | "twoAgo" | "earlier" | "longAgo", string> = {
  today: "",
  yesterday: "",
  twoAgo: "",
  earlier: "",
  longAgo: "",
};

const ledgerRows = async () => (await getPool().query("select from private.points_ledger where user_id = $1", [userId])).rows.length;
// A run on that day: one common answer (10 points) given at the day's noon, today's now.
async function gaveOne(date: string) {
  await writeClockRun(admin, userId, date, [{ question: 0, entry: fixtureId(0, "dog"), tier: "common", points: 10, when: date === days.today ? "now" : "noon" }]);
}

// A run played past its day's midnight: a common answer (10 points) at the day's noon, an uncommon one (25) after its midnight. It
// counts the first alone (M16 16e-3a, answer 35).
async function lateTwo(date: string) {
  await writeClockRun(admin, userId, date, [
    { question: 0, entry: fixtureId(0, "dog"), tier: "common", points: 10, when: "noon" },
    { question: 0, entry: fixtureId(0, "cat"), tier: "uncommon", points: 25, when: "afterMidnight" },
  ]);
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
    `select private.today()::text as today, (private.today() - 1)::text as yesterday, (private.today() - 2)::text as "twoAgo",
            (private.today() - 3)::text as earlier,
            (private.today() - 40)::text as "longAgo"`,
  );
  Object.assign(days, rows[0]);
});

afterAll(async () => {
  // Deleting the auth user cascades to the profile, runs and ledger rows; then the fixture puzzles go.
  await getPool().query("delete from auth.users where email = $1", [email]);
  await removeFixtures();
  await getPool().end();
  await admin.end();
});

describe("all-time points", () => {
  // Signing in polls the local inbox with expect.poll, which only runs inside a test.
  it("signs in a player with a username, and no points yet", async () => {
    useSession((await signIn(email)).session);
    expect((await createProfile(apiRequest("/api/profile", { method: "POST", body: { username } }))).status).toBe(201);
    userId = (await getPool().query<{ id: string }>("select id from auth.users where email = $1", [email])).rows[0].id;
    expect(await allTimePoints(getPool(), userId)).toBe(0);
  });

  it("sums every week's ledger rows, settling a finished run on a closed day first, and not today's (M09 D3, D9)", async () => {
    // Two settled days weeks apart: 1000 and 100. Yesterday's run gave one answer and isn't settled yet. Today's did the same,
    // and today isn't closed.
    await settled(days.longAgo, 1000);
    await settled(days.earlier, 100);
    await ensurePuzzle(days.yesterday);
    await ensurePuzzle(days.twoAgo);
    await ensurePuzzle(days.today);
    await gaveOne(days.yesterday);
    await lateTwo(days.twoAgo);
    await gaveOne(days.today);
    expect(await ledgerRows()).toBe(2);

    // 1000 + 100 + yesterday's 10 + two days ago's 10, not 35, as its second answer came after its midnight; today's 10 waits
    // for midnight.
    const total = await allTimePoints(getPool(), userId);
    expect(total).toBe(1120);
    expect(await ledgerRows()).toBe(4);
    // Again: the same total, and nothing settled twice.
    expect(await allTimePoints(getPool(), userId)).toBe(total);
    expect(await ledgerRows()).toBe(4);
  });
});
