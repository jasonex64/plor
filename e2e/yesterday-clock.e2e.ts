// Yesterday's answers when yesterday was a day on a clock (docs/milestones/M23-23f-the-switch.md, 23f-2, design 3; the human's
// answer 68 in M23-offbeat-on-a-clock.md): per question the answers most players gave and the rarest, each with how many
// players, from signed-in players' answers; a question under ANSWER_SHARE_MIN_PLAYERS (5) players says "too few players yet";
// no answer search. Yesterday is the fixture's clock day (src/test/answer-fixture.ts, fixtureClockDay) and six players' answers
// are written directly, as a past day's need times in the past (the database tests', src/app/api/offbeat/route.db.test.ts):
// question 1 has 6 players (dog 6, cat 4, bear 3, fish 2, and horse, aardvark and horde 1 each), question 2 has 4 players
// (too few), question 3 has 5 (red 5, blue 2, green 1: every answer is in the top, so no rarest).
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { fixtureClockDay, fixtureId, loadFixtureBase } from "../src/test/answer-fixture";
import { removePuzzle, todayPuzzle } from "./puzzle";
import { localStack } from "../scripts/slot.ts";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
// The local superuser, which may switch the answer triggers off to write a past day's answers.
const ADMIN = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 1 });
let today: { created: string };
let yesterday: string;

test.beforeAll(async () => {
  const { rows } = await DB.query<{ date: string; taken: boolean }>(
    "select (private.today() - 1)::text as date, exists (select from private.puzzle where game_id = 'offbeat' and puzzle_date = private.today() - 1) as taken",
  );
  if (rows[0].taken) throw new Error(`${rows[0].date} has a puzzle already; this file needs yesterday free for a clock day`);
  yesterday = rows[0].date;
  today = await todayPuzzle(DB);
  await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [yesterday, fixtureClockDay(yesterday, await loadFixtureBase(DB))]);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [yesterday]);
  await removePuzzle(DB, today);
  await DB.end();
  await ADMIN.end();
});

// The answers of "most players gave" and "rarest answers" for each of the three questions, and the too-few words.
test("Yesterday's answers on a clock day show the top and rarest answers with their players, and too few players yet", { tag: "@visual" }, async ({ page }) => {
  const client = await ADMIN.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    const users: string[] = [];
    for (let i = 0; i < 6; i++) {
      const { rows } = await client.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [`${RUN}-yc${i}@example.test`]);
      users.push(rows[0].id);
      await client.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'offbeat', $2::date, $2::date + time '12:00')", [rows[0].id, yesterday]);
    }
    const give = async (q: number, slug: string, players: number) => {
      for (const user of users.slice(0, players)) {
        await client.query(
          `insert into private.clock_answer (user_id, game_id, puzzle_date, question_idx, entry_id, tier, added_ms, points, created_at)
           values ($1, 'offbeat', $2::date, $3, $4, 'common', 3000, 10, ($2::date + time '12:00') at time zone 'America/Los_Angeles')`,
          [user, yesterday, q, fixtureId(q, slug)],
        );
      }
    };
    for (const [slug, n] of [["dog", 6], ["cat", 4], ["bear", 3], ["fish", 2], ["horse", 1], ["aardvark-genus", 1], ["horde", 1]] as [string, number][]) await give(0, slug, n);
    await give(1, "apple", 4);
    for (const [slug, n] of [["red", 5], ["blue", 2], ["green", 1]] as [string, number][]) await give(2, slug, n);
    await client.query("commit");
  } finally {
    client.release();
  }

  await page.goto("/");
  await signInAndPick(page, "yv");
  await page.goto("/play");
  const card = page.getByRole("region", { name: "Yesterday's answers" });
  const question = (n: number) => card.getByRole("listitem").nth(n);
  await expect(question(0)).toContainText("1 · Name an animal");
  await expect(question(0)).toContainText("Most players gave: dog · 6 players, cat · 4 players, bear · 3 players");
  await expect(question(0)).toContainText("Rarest answers: aardvark · 1 player, horde · 1 player, horse · 1 player");
  // Under the minimum of players: no answers, and the words.
  await expect(question(1)).toContainText("2 · Name a fruit");
  await expect(question(1)).toContainText("too few players yet");
  await expect(question(1)).not.toContainText("apple");
  await expect(question(2)).toContainText("Most players gave: red · 5 players, blue · 2 players, green · 1 player");
  await expect(question(2)).not.toContainText("Rarest answers");
  // The old game's answer search and the host's answers are not drawn, nor "Caught" or "Safe".
  await expect(card.getByPlaceholder("Search the answers")).toHaveCount(0);
  await expect(card).not.toContainText(/The host|Caught|Safe/);
  await card.scrollIntoViewIfNeeded();
});
