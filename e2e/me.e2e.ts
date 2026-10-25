// The Me tab's stats (docs/milestones/M14-14a-3a-me.md): the header, totals, this month's calendar, Offbeat's card and
// the rarest answers, before and after a run; the avatar slots by names; and the Friends tab's empty state. Yesterday's
// answers are written with the answer triggers off, as the database tests do, so they need the local superuser.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { FIXTURE, fixtureDay, fixtureId, isFixtureDay, loadFixtureBase } from "../src/test/answer-fixture";
import { RUN, play, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const ADMIN = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
let puzzle: TodayPuzzle;
let today = "";
let yesterday = "";
let yesterdayAdded = false;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
  const { rows } = await DB.query<{ today: string; yesterday: string; content: { questions: { category: string }[] } | null }>(
    `select private.today()::text as today, (private.today() - 1)::text as yesterday,
            (select content from private.puzzle where game_id = 'offbeat' and puzzle_date = private.today() - 1) as content`,
  );
  ({ today, yesterday } = rows[0]);
  const { content } = rows[0];
  if (content && !isFixtureDay(content)) throw new Error(`${yesterday} has a real puzzle; this file needs yesterday free for the fixture day`);
  if (!content) {
    await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [
      yesterday,
      fixtureDay(yesterday, await loadFixtureBase(DB)),
    ]);
    yesterdayAdded = true;
  }
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  if (yesterdayAdded) await DB.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [yesterday]);
  await DB.end();
  await ADMIN.end();
});

const PHONE = { width: 360, height: 800 };

async function player(browser: Browser, name: string) {
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  return page;
}

const total = (page: Page, region: string, label: string) =>
  page.getByRole("region", { name: region, exact: true }).locator("div", { has: page.getByText(label, { exact: true }) }).locator("dd");
// "24 Oct" and "October", as Me writes dates, read in UTC so they can't shift by a day.
const dateText = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });

// Criteria 1, 2, 3 and 5.
test("Me shows the header, totals, calendar and Offbeat's card, and counts a run once it's over", async ({ browser }) => {
  const page = await player(browser, "ma");
  await page.goto("/me");
  // The header: the large slot with the initial, the username, and the day the profile was made.
  await expect(page.getByRole("heading", { name: `ma${RUN}` })).toBeVisible();
  await expect(page.locator("[data-initial='M']").first()).toBeVisible();
  await expect(page.getByText(`Playing since ${dateText(today, { day: "numeric", month: "short", year: "numeric" })}`)).toBeVisible();
  for (const label of ["points all time", "days played", "day streak now", "longest streak"]) await expect(total(page, "All games", label)).toHaveText("0");

  const calendar = page.getByRole("region", { name: "Calendar" });
  const sofar = Number(today.slice(8, 10));
  await expect(calendar.getByRole("img")).toHaveAttribute(
    "aria-label",
    `Days played in ${dateText(today, { month: "long" })}: 0 of the ${sofar} days so far`,
  );
  const todayCell = calendar.locator(`[data-date='${today}']`);
  expect(await todayCell.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("2px");
  await expect(total(page, "Offbeat", "best score")).toHaveText("–");
  await expect(page.getByRole("region", { name: "Offbeat", exact: true }).getByRole("link", { name: "Offbeat's game screen" })).toHaveAttribute(
    "href",
    "/offbeat",
  );
  await expect(page.getByRole("region", { name: "Your rarest answers" })).toContainText("None yet.");

  // Caught on question 1: a finished run with 0 survived, shaded at the first step.
  await page.goto("/");
  await play(page);
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.locator("#result")).toContainText("You survived 0 of 7 questions");
  await page.goto("/me");
  await expect(total(page, "All games", "days played")).toHaveText("1");
  await expect(total(page, "All games", "day streak now")).toHaveText("1");
  await expect(total(page, "Offbeat", "avg. survived")).toHaveText("0.0/7");
  await expect(total(page, "Offbeat", "full climbs")).toHaveText("0");
  await expect(calendar.getByText(`1 of ${sofar} days`)).toBeVisible();
  // The text alternative names the day and how far it went (docs/milestones/M14-14a-3b-settings.md, criterion 6).
  await expect(calendar.getByRole("img")).toHaveAttribute(
    "aria-label",
    `Days played in ${dateText(today, { month: "long" })}: 1 of the ${sofar} days so far: ${dateText(today, { day: "numeric", month: "long" })}, 0 of 7 survived`,
  );
  // Paper's first shade, the accent at alpha 0xa5, the lightest reaching 3:1 on the card (14a-3b).
  expect(await todayCell.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(36, 87, 214, 0.647)");
  // No numbers until the player turns them on (L46).
  await expect(todayCell).toHaveText("");
});

// Criterion 4: yesterday, the player and four others answered question 1, the player with an answer none of them gave.
test("Me lists the rarest answers from closed days, with their share", async ({ browser }) => {
  const page = await player(browser, "mb");
  const { rows } = await DB.query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-mb@example.test`]);
  const q = FIXTURE[0];
  const client = await ADMIN.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    const noon = `(($2::date + time '12:00') at time zone 'America/Los_Angeles')`;
    const answer = async (userId: string, slug: string) => {
      await client.query(`insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'offbeat', $2::date, ${noon})`, [userId, yesterday]);
      await client.query(
        `insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched, created_at)
         values ($1, 'offbeat', $2::date, 0, $3, false, ${noon})`,
        [userId, yesterday, fixtureId(0, slug)],
      );
    };
    await answer(rows[0].id, "cat");
    for (let i = 1; i <= 4; i++) {
      const { rows: made } = await client.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [
        `${RUN}-mo${i}@example.test`,
      ]);
      await answer(made[0].id, "dog");
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }

  await page.goto("/me");
  const item = page.getByRole("region", { name: "Your rarest answers" }).getByRole("listitem");
  await expect(item).toHaveCount(1);
  await expect(item).toHaveText(`${q.members.cat.names[0]}${q.prompt} · 20% gave this · ${dateText(yesterday, { day: "numeric", month: "short" })}`);
});

// Criteria 6 and 7.
test("names carry an avatar slot, and the Friends tab says Plor is better with friends", async ({ browser }) => {
  const page = await player(browser, "mc");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Friends" }).click();
  const board = page.getByRole("region", { name: "Friends today" });
  await expect(board.getByRole("heading", { name: "Plor is better with friends" })).toBeVisible();
  await expect(board).toContainText("compare scores every week, in whichever games you both play.");
  // The invite link sits below, with the friends list (docs/milestones/M14-14a-3b-settings.md, criterion 7).
  await expect(page.getByRole("region", { name: "Your friends" }).getByRole("button", { name: "Make my invite link" })).toBeVisible();

  // The leaderboards: the player's own row.
  const week = page.getByRole("region", { name: "Friends leaderboard" }).getByRole("region", { name: "This week" }).getByRole("listitem");
  await expect(week.locator("[data-initial='M']")).toHaveCount(1);
  // The slot is drawn by CSS and hidden from screen readers, so the row's text is the name alone.
  await expect(week).toHaveText(`mc${RUN} (you): 0 points`);

  // A group's member list.
  await page.goto("/groups");
  await page.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Owls");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  const members = page.getByRole("listitem").filter({ hasText: `mc${RUN} (creator)` });
  await expect(members.locator("[data-initial='M']")).toHaveCount(1);

  // A comment, once the run is over.
  await page.goto("/");
  await play(page);
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await page.getByLabel("Comment to your friends").fill(`slots ${RUN}`);
  await page.getByRole("button", { name: "Post" }).click();
  const comment = page.getByRole("region", { name: "Offbeat comments" }).getByRole("listitem").filter({ hasText: `slots ${RUN}` });
  await expect(comment.locator("[data-initial='M']")).toHaveCount(1);
});
