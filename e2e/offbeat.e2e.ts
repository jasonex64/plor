// Offbeat's game screen (docs/milestones/M14-14a-2b-game-screen.md): the banner, the rules, Start and How to play (its
// panel is how-to-play.e2e.ts's);
// the player's stats before and after a run; yesterday's answers; the feed beside the game from 1200px; and no
// sideways scroll at 320px.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { finishClockRun } from "./game";
import { fixtureClockDay, loadFixtureBase } from "../src/test/answer-fixture";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { GAME } from "../src/platform/game";
import { localStack } from "../scripts/slot.ts";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
// The local superuser, which may switch the answer triggers off to write a past day's run.
const ADMIN = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 1 });
let puzzle: TodayPuzzle;
// Yesterday's fixture day, which this file adds.
let yesterdayAdded = "";

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
  const { rows } = await DB.query<{ date: string; taken: boolean }>(
    "select (private.today() - 1)::text as date, exists (select from private.puzzle where game_id = 'offbeat' and puzzle_date = private.today() - 1) as taken",
  );
  const { date, taken } = rows[0];
  if (taken) throw new Error(`${date} has a puzzle already; this file needs yesterday free for the fixture day`);
  await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [date, fixtureClockDay(date, await loadFixtureBase(DB))]);
  yesterdayAdded = date;
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [yesterdayAdded]);
  await DB.end();
  await ADMIN.end();
});

const PHONE = { width: 360, height: 800 };
// The game screen's requests for its stats and the run's answers, in the order they happen. In development React's
// Strict Mode runs each effect twice, so a mount's loads come in pairs; what counts is when they start.
const timeline = (page: Page) => {
  const seen: string[] = [];
  page.on("request", (r) => void (new URL(r.url()).pathname === "/api/offbeat" && seen.push("stats")));
  page.on("response", (r) => void (new URL(r.url()).pathname === "/api/run" && seen.push("run")));
  return seen;
};

async function player(browser: Browser, name: string, viewport = PHONE) {
  const page = await (await browser.newContext({ viewport })).newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  return page;
}

// Criteria 1 and 3.
test("Play opens the game screen: the day, the rules, Start and How to play", async ({ browser }) => {
  const page = await player(browser, "oa");
  await page.getByRole("region", { name: GAME.name }).getByRole("link", { name: "Play", exact: true }).click();
  await expect(page).toHaveURL("/play");
  await expect(page).toHaveTitle(GAME.name);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "true");

  const game = page.getByRole("region", { name: GAME.name, exact: true });
  // "Saturday 24 October".
  await expect(game.getByText(/^[A-Z][a-z]+day \d{1,2} [A-Z][a-z]+$/)).toBeVisible();
  // The rules in three lines, with no number typed into them but the questions'.
  await expect(game.getByText("3 questions, one clock.")).toBeVisible();
  await expect(game.getByText("Every answer adds time.")).toBeVisible();
  await expect(game.getByText("Rarer answers add more time and more points.")).toBeVisible();
  await expect(game.getByRole("button", { name: "Start", exact: true })).toBeVisible();

  // How to play opens its panel over the screen (docs/milestones/M14-14c-8-plain-game-1.md, after 14c-6d).
  await game.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog", { name: "How to play" })).toBeVisible();
  await expect(page).toHaveURL("/play");
});

// Criteria 4 and 5: a player who never played, then plays a run with no answer.
test("Your Offbeat counts the run once it's over, and yesterday's answers say too few players", { tag: "@visual" }, async ({ browser }) => {
  const page = await player(browser, "ob");
  await page.goto("/play");
  const stats = page.getByRole("region", { name: `Your ${GAME.name}` });
  const stat = (label: string) => stats.locator("div", { has: page.getByText(label, { exact: true }) }).locator("dd");
  await expect(stat("day streak")).toHaveText("0");
  await expect(stat("best score")).toHaveText("–");
  await expect(stat("avg. points a day")).toHaveText("–");
  await expect(stats).not.toContainText(/survived|full runs/);
  const chart = stats.getByRole("img");
  // Seven days, today last and not scored yet; the six before it not scored (23f-2, answer 66).
  await expect(chart).toHaveAttribute("aria-label", /^([A-Z][a-z]{2} not scored, ){6}[A-Z][a-z]{2} not scored yet$/);

  const yesterday = page.getByRole("region", { name: "Yesterday's answers" });
  // Yesterday's three questions, with no players to count (the answers themselves are yesterday-clock.e2e.ts's).
  await expect(yesterday.getByRole("listitem")).toHaveCount(3);
  await expect(yesterday.getByRole("listitem").first()).toContainText("1 · Name an animal");
  await expect(yesterday.getByRole("listitem").first()).toContainText("too few players yet");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await finishClockRun(page);
  await expect(page.getByText("0 points", { exact: true })).toBeVisible();
  // Today's run counts now in the streak; its points only once the day closes (M09 D9), so the rest still has none.
  await expect(stat("day streak")).toHaveText("1");
  await expect(stat("avg. points a day")).toHaveText("–");
  await expect(stat("best score")).toHaveText("–");
  await expect(chart).toHaveAttribute("aria-label", /, [A-Z][a-z]{2} not scored yet$/);

  // A closed day with points in the ledger: the best score, the average a day and the chart's bar say them.
  const { rows: made } = await DB.query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-ob@example.test`]);
  const client = await ADMIN.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    await client.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'offbeat', private.today() - 1, now() - interval '1 day')", [made[0].id]);
    await client.query("insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, 'offbeat', private.today() - 1, 340, 0)", [made[0].id]);
    await client.query("commit");
  } finally {
    client.release();
  }
  await page.goto("/play");
  await expect(stat("best score")).toHaveText("340");
  await expect(stat("avg. points a day")).toHaveText("340");
  await expect(chart).toHaveAttribute("aria-label", /, [A-Z][a-z]{2} 340, [A-Z][a-z]{2} not scored yet$/);

  // Opened again on the finished run, the stats load with the page and not again once the run's state arrives
  // (14a-2c, criterion 3).
  const seen = timeline(page);
  await page.goto("/play");
  await expect(page.locator("#result")).toBeVisible();
  // Yesterday's run, written above, adds a day to the streak.
  await expect(stat("day streak")).toHaveText("2");
  await page.waitForLoadState("networkidle");
  expect(seen).toContain("stats");
  // The run's state was seen, so the check below looks at what came after it (14b-2c-4, item 22).
  expect(seen).toContain("run");
  expect(seen.slice(seen.indexOf("run")).filter((e) => e === "stats")).toEqual([]);
});

// 23f-2, answer 66: the stats of a player with a closed day, on the game screen and on Me, at both screen sizes.
test("Your Offbeat and Me show the best score, the average points a day and a chart of points", { tag: "@visual" }, async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "of");
  const { rows } = await DB.query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-of@example.test`]);
  const client = await ADMIN.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    await client.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'offbeat', private.today() - 1, now() - interval '1 day')", [rows[0].id]);
    await client.query("insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, 'offbeat', private.today() - 1, 340, 0)", [rows[0].id]);
    await client.query("commit");
  } finally {
    client.release();
  }
  await page.goto("/play");
  const stats = page.getByRole("region", { name: `Your ${GAME.name}` });
  const stat = (label: string) => stats.locator("div", { has: page.getByText(label, { exact: true }) }).locator("dd");
  await expect(stat("best score")).toHaveText("340");
  await expect(stat("avg. points a day")).toHaveText("340");
  await expect(stats.getByRole("img")).toHaveAttribute("aria-label", /, [A-Z][a-z]{2} 340, [A-Z][a-z]{2} not scored yet$/);
  await expect(stats).not.toContainText(/survived|full runs/);

  await page.goto("/me");
  const card = page.getByRole("region", { name: GAME.name, exact: true });
  await expect(card.locator("div", { has: page.getByText("best score", { exact: true }) }).locator("dd")).toHaveText("340");
  await expect(card.locator("div", { has: page.getByText("avg. points a day", { exact: true }) }).locator("dd")).toHaveText("340");
  await expect(card).not.toContainText(/survived|full runs/);
  await expect(page.getByRole("region", { name: "Calendar" }).getByRole("img")).toHaveAttribute("aria-label", /, 340 points/);
});

// Criteria 6 and 7.
test("the feed sits beside the game from 1200px and below it on phones, with no sideways scroll at 320px", async ({ browser }) => {
  const wide = await player(browser, "oc", { width: 1440, height: 900 });
  await wide.goto("/play");
  const box = async (page: typeof wide, name: string) => (await page.getByRole("region", { name, exact: true }).boundingBox())!;
  // The game screen heads the feed as round 5 does (14a-2c, criterion 4).
  await expect(wide.getByRole("region", { name: `${GAME.name} comments` }).getByRole("heading", { name: `${GAME.name} comments` })).toBeVisible();
  // Before the run is over it is Offbeat's friends thread, closed, as Fragments' is on its screen (M16 16f-5, answer 53).
  await expect(wide.getByRole("region", { name: `${GAME.name} comments` }).getByText("Finish today's puzzle to see your friends' comments.")).toBeVisible();
  const [game, feed] = [await box(wide, GAME.name), await box(wide, `${GAME.name} comments`)];
  expect(feed.x).toBeGreaterThanOrEqual(game.x + game.width);
  expect(feed.y).toBeLessThan(game.y + game.height);

  const narrow = await player(browser, "od", { width: 320, height: 640 });
  await narrow.goto("/play");
  await expect(narrow.getByRole("region", { name: "Yesterday's answers" })).toBeVisible();
  const [game2, cards, feed2] = [await box(narrow, GAME.name), await box(narrow, "Yesterday's answers"), await box(narrow, `${GAME.name} comments`)];
  expect(feed2.y).toBeGreaterThanOrEqual(cards.y + cards.height);
  expect(cards.y).toBeGreaterThanOrEqual(game2.y + game2.height);
  expect(await narrow.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

// 14c-1's, 14c-2's and 14c-8's renames moved the game to a new address with no redirect (14b-4, "The new name";
// docs/milestones/M14-14c-2-neutral-words.md, answer 13; docs/milestones/M14-14c-8-plain-game-1.md, answer 3), so the
// old ones are gone; so is How to play's page, now a panel (14c-6 answer 39).
test("the old addresses /offbeat, /updraft and /play/how-to-play answer 404", async ({ page }) => {
  for (const path of ["/offbeat", "/updraft", "/play/how-to-play"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});
