// Offbeat's game screen (docs/milestones/M14-14a-2b-game-screen.md): the banner, the stakes, Start and How to play (its
// panel is how-to-play.e2e.ts's);
// the player's stats before and after a run; yesterday's answers; the feed beside the game from 1200px; and no
// sideways scroll at 320px.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { POINTS_PER_QUESTION, QUESTIONS_PER_DAY } from "../src/config/tunables";
import { FIXTURE, fixtureDay, fixtureId, isFixtureDay, loadFixtureBase } from "../src/test/answer-fixture";
import { PAST_MIDNIGHT } from "../src/app/bonus";
import { RUN, signInAndPick } from "./players";
import { caught, caughtToCards, next, nextButton, safe, seeResults } from "./game";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { GAME } from "../src/platform/game";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
let puzzle: TodayPuzzle;
// Yesterday's fixture day, when this file added it.
let yesterdayAdded: string | null = null;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
  const { rows } = await DB.query<{ date: string; content: { questions: { category: string }[] } | null }>(
    "select (private.today() - 1)::text as date, (select content from private.puzzle where game_id = 'offbeat' and puzzle_date = private.today() - 1) as content",
  );
  const { date, content } = rows[0];
  if (content && !isFixtureDay(content)) throw new Error(`${date} has a real puzzle; this file needs yesterday free for the fixture day`);
  if (!content) {
    await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [date, fixtureDay(date, await loadFixtureBase(DB))]);
    yesterdayAdded = date;
  }
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  if (yesterdayAdded) await DB.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [yesterdayAdded]);
  await DB.end();
});

const PHONE = { width: 360, height: 800 };
// The game's numbers as tunables.ts holds them (docs/milestones/M14-14a-2c-review-fixes.md, criterion 1).
const [LOWEST, HIGHEST] = [POINTS_PER_QUESTION[0], POINTS_PER_QUESTION[POINTS_PER_QUESTION.length - 1]];
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
test("Play opens the game screen: the day, the stakes, Start and How to play", async ({ browser }) => {
  const page = await player(browser, "oa");
  await page.getByRole("region", { name: GAME.name }).getByRole("link", { name: "Play", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/play");
  await expect(page).toHaveTitle(GAME.name);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "true");

  const game = page.getByRole("region", { name: GAME.name, exact: true });
  // "Saturday 24 October".
  await expect(game.getByText(/^[A-Z][a-z]+day \d{1,2} [A-Z][a-z]+$/)).toBeVisible();
  await expect(game).toContainText(
    `${QUESTIONS_PER_DAY} questions · 20 seconds each. Give an answer the host didn't pick. Each question you survive is worth more: ${LOWEST} points up to ${HIGHEST}.`,
  );
  await expect(game.getByRole("button", { name: "Start", exact: true })).toBeVisible();

  // How to play opens its panel over the screen (docs/milestones/M14-14c-8-plain-game-1.md, after 14c-6d).
  await game.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog", { name: "How to play" })).toBeVisible();
  await expect(page).toHaveURL("http://localhost:3000/play");
});

// Criteria 4 and 5: a player who never played, then plays and is caught on question 1.
test("Your Offbeat counts the run once it's over, and yesterday's answers show the host's", async ({ browser }) => {
  const page = await player(browser, "ob");
  await page.goto("/play");
  const stats = page.getByRole("region", { name: `Your ${GAME.name}` });
  const stat = (label: string) => stats.locator("div", { has: page.getByText(label, { exact: true }) }).locator("dd");
  await expect(stat("day streak")).toHaveText("0");
  await expect(stat("best score")).toHaveText("–");
  await expect(stat("avg. survived")).toHaveText("–");
  const chart = stats.getByRole("img");
  // Seven days, today last and not played yet; the six before it not played.
  await expect(chart).toHaveAttribute("aria-label", /^([A-Z][a-z]{2} not played, ){6}[A-Z][a-z]{2} not played yet$/);

  const yesterday = page.getByRole("region", { name: "Yesterday's answers" });
  await expect(yesterday.getByRole("listitem")).toHaveCount(7);
  // The host's answers, and nothing of the player's: they didn't play yesterday.
  const first = FIXTURE[0];
  await expect(yesterday.getByRole("listitem").first()).toHaveText(`1 · ${first.prompt}The host: ${first.members[first.host[0]].names[0]}Search answers`);
  await expect(yesterday.getByText(/^(Safe|Caught)$/)).toHaveCount(0);
  // Yesterday is over, so its answers can be searched even by a player who didn't play it (M14 14b-12).
  await yesterday.getByRole("button", { name: "Search answers" }).first().click();
  await page.getByLabel(`Search the answers to ${first.prompt}`).fill("polar");
  await expect(yesterday.getByRole("list", { name: `Answers to ${first.prompt}` }).getByRole("listitem").filter({ hasText: "polar bear" })).toBeVisible();

  await page.getByRole("button", { name: "Start", exact: true }).click();
  await caughtToCards(page, puzzle.hostAnswer);
  await expect(page.locator("#result")).toContainText("You survived 0 of 7 questions");
  // Today's run counts now in the streak, the average and the chart; its points only once the day closes (M09 D9).
  await expect(stat("day streak")).toHaveText("1");
  await expect(stat("avg. survived")).toHaveText("0.0/7");
  await expect(stat("best score")).toHaveText("–");
  await expect(chart).toHaveAttribute("aria-label", /, [A-Z][a-z]{2} 0$/);

  // Opened again on the finished run, the stats load with the page and not again once the run's state arrives
  // (14a-2c, criterion 3).
  const seen = timeline(page);
  await page.goto("/play");
  await expect(page.locator("#result")).toBeVisible();
  await expect(stat("day streak")).toHaveText("1");
  await page.waitForLoadState("networkidle");
  expect(seen).toContain("stats");
  // The run's state was seen, so the check below looks at what came after it (14b-2c-4, item 22).
  expect(seen).toContain("run");
  expect(seen.slice(seen.indexOf("run")).filter((e) => e === "stats")).toEqual([]);
});

// Criteria 6 and 7.
test("the feed sits beside the game from 1200px and below it on phones, with no sideways scroll at 320px", async ({ browser }) => {
  const wide = await player(browser, "oc", { width: 1440, height: 900 });
  await wide.goto("/play");
  const box = async (page: typeof wide, name: string) => (await page.getByRole("region", { name, exact: true }).boundingBox())!;
  // The game screen heads the feed as round 5 does (14a-2c, criterion 4).
  await expect(wide.getByRole("region", { name: `${GAME.name} comments` }).getByRole("heading", { name: `${GAME.name} comments` })).toBeVisible();
  await expect(wide.getByRole("region", { name: `${GAME.name} comments` }).getByText("No comments yet.")).toBeVisible();
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

// M16 16e-3a (docs/milestones/M16-16e-points-and-boards.md, answers 35, 37 and 39): yesterday's run resumed after its
// midnight says its answers from then on don't count for the boards, while it's played and on its result, whose score
// stays the full run's.
test("a run resumed after its midnight says its answers don't count for the boards", async ({ browser }) => {
  const page = await player(browser, "oe");
  const { rows } = await DB.query<{ id: string; date: string }>("select id::text, (private.today() - 1)::text as date from auth.users where email = $1", [
    `${RUN}-oe@example.test`,
  ]);
  const [{ id, date }] = rows;
  // Yesterday's run: safe on question 1 at yesterday's noon, then left at its reveal.
  await DB.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, 'offbeat', $2::date)", [id, date]);
  await DB.query(
    `insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched, created_at)
     values ($1, 'offbeat', $2::date, 0, $3, false, ($2::date + time '12:00') at time zone 'America/Los_Angeles')`,
    [id, date, fixtureId(0, "dog")],
  );

  await page.goto("/play");
  const game = page.getByRole("region", { name: GAME.name, exact: true });
  // Back on question 1's reveal, over which the line shows while the run is played (in the play frame, which has no
  // game region of its own to look in).
  await expect(nextButton(page)).toBeVisible();
  await expect(page.getByText(PAST_MIDNIGHT)).toBeVisible();
  await next(page, "Name a fruit");
  await expect(page.getByText(PAST_MIDNIGHT)).toBeVisible();
  // Safe on question 2 (fruit; the host said apple), then caught on question 3 (color; the host said red).
  await safe(page, "banana");
  await next(page, "Name a color");
  await caught(page, "red");
  await seeResults(page).click();
  // The full run's score, 25 + 50, though the boards count question 1's 25 alone; the line once, on the result.
  await expect(page.locator("#result")).toContainText(/You survived 2 of 7 questions and scored 75 points\b.* Past midnight: answers from now on don't count for the boards\./);
  await expect(game.getByText(PAST_MIDNIGHT)).toHaveCount(1);
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
