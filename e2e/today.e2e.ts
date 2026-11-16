// Today (docs/milestones/M14-14a-2a-today.md): Offbeat's banner before and after playing, the one leaderboard card,
// the feed before playing (names, no words), and Today's columns from phone to desktop.
import { expect, test, type Browser } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, sent, signInAndPick, befriend } from "./players";
import { asked, caughtToCards } from "./game";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { GAME } from "../src/platform/game";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
let puzzle: TodayPuzzle;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

const PHONE = { width: 360, height: 800 };

async function player(browser: Browser, name: string, viewport = PHONE) {
  const page = await (await browser.newContext({ viewport })).newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  return page;
}

const path = (url: string) => new URL(url).pathname;

// Criteria 1 and 2.
test("Offbeat's banner has Play before the run, and the score, how it ended and Result after", async ({ browser }) => {
  const page = await player(browser, "ta");
  // Today's region, which the game screen's has the same name as: each check below first waits for Today's address,
  // so it can't pass on the game screen's banner before the navigation lands (seen on CI, 2026-10-25).
  const banner = page.getByRole("region", { name: GAME.name, exact: true });
  // The day's facts as chips (docs/milestones/M14-14b-8-the-new-look.md, 14b-8b; mockup 3).
  await expect(banner.getByText("7 questions", { exact: true })).toBeVisible();
  await expect(banner.getByText("Don't match the host", { exact: true })).toBeVisible();
  // Offbeat's own colour, #2F3D5C, whatever the theme.
  const block = banner.getByRole("heading", { name: GAME.name }).locator("..");
  expect(await block.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(47, 61, 92)");

  // Play is a link to Offbeat's game screen, where the run is played (docs/milestones/M14-14a-2b-game-screen.md).
  await expect(banner.getByRole("link", { name: "Play", exact: true })).toHaveAttribute("href", "/play");
  await play(page);
  // During the run, Today's banner leads back to it: a run waiting at a reveal has no clock bar (Source diff). The game
  // is full screen, with no tabs (docs/milestones/M14-14c-8-plain-game-1.md), so this goes to Today by the browser's
  // Back; the × is play.e2e.ts's.
  await asked(page, "Name an animal");
  const nav = page.getByRole("navigation", { name: "Main" });
  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(banner.getByText("Your run is still going")).toBeVisible();
  await banner.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL("/play");
  await caughtToCards(page, puzzle.hostAnswer);
  await expect(page.locator("#result")).toContainText("You survived 0 of 7 questions");

  await nav.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL("/");
  await expect(banner.getByText("0 points", { exact: true })).toBeVisible();
  await expect(banner.getByText("caught on question 1", { exact: true })).toBeVisible();
  await expect(banner.getByRole("timer")).toContainText("Next puzzle in");
  await banner.getByRole("link", { name: "Result" }).click();
  // In view, then #result leaves the address (docs/milestones/M14-14b-23-small-jumps-and-finds.md, answer 2).
  await expect(page.locator("#result")).toBeInViewport();
  await expect(page).toHaveURL(/\/play$/);
});

// Criterion 3.
test("one leaderboard card switches between yesterday and this week, for friends or a group", async ({ browser }) => {
  // From 768px: phones have no leaderboard card on Today (M16 16f-5, answer 19).
  const page = await player(browser, "tb", { width: 1024, height: 900 });
  await page.goto("/groups");
  await page.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Owls");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);

  await page.goto("/");
  const card = page.getByRole("region", { name: "Leaderboard" });
  await expect(card.getByRole("radio", { name: "Yesterday" })).toBeChecked();
  // Dated, as "Fri 23 Oct" (L25), in a chip beside its heading since 14b-8b, and naming no game in its heading or chip: the
  // card is shared by every game (14b-4, answer 1), which it names only in its Game switch, on Offbeat on every load (M16
  // 16f-6, answer 20).
  await expect(card.getByText(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}$/)).toBeVisible();
  await expect(card.getByRole("heading")).not.toContainText(GAME.name);
  await expect(card.getByRole("radiogroup", { name: "Game" }).getByRole("radio", { name: GAME.name })).toBeChecked();
  await expect(card.getByLabel("Board").locator("option")).toHaveText(["Friends", "Owls"]);

  const friendsWeek = page.waitForRequest((r) => path(r.url()) === "/api/leaderboard");
  await card.getByRole("radio", { name: "This week" }).check();
  await friendsWeek;
  await expect(card.getByRole("region", { name: "This week" }).getByRole("listitem")).toHaveText([`tb${RUN} (you): 0 points`]);

  const groupWeek = page.waitForRequest((r) => path(r.url()) === "/api/groups/leaderboard");
  await card.getByLabel("Board").selectOption({ label: "Owls" });
  await groupWeek;
  const groupYesterday = page.waitForRequest((r) => path(r.url()) === "/api/leaderboard/yesterday" && new URL(r.url()).searchParams.has("group"));
  await card.getByRole("radio", { name: "Yesterday" }).check();
  await groupYesterday;
});

// Criterion 4, as the human's answer 21 changed it (2026-11-13, "The comment shows"): a friend's comment comes whole to a
// viewer who hasn't played; only a friend's result is blurred (e2e/feed.e2e.ts).
test("before playing, a friend's comment is in the feed whole, with its game; their result is blurred", async ({ browser }) => {
  const viewer = await player(browser, "tc");
  const friend = await (await browser.newContext({ viewport: PHONE })).newPage();
  await friend.goto("/friends");
  await signInAndPick(friend, "td");
  await befriend(friend, "td", viewer, "tc");
  await friend.goto("/");
  await play(friend);
  await caughtToCards(friend, puzzle.hostAnswer);
  const body = `the words ${RUN}`;
  await friend.getByLabel("Comment to your friends").fill(body);
  await friend.getByRole("button", { name: "Post" }).click();
  // Posted on the game screen, whose feed is `${GAME.name} comments` (14a-2c); Today's below stays "Feed".
  await expect(friend.getByRole("region", { name: `${GAME.name} comments` }).getByText(body)).toBeVisible();
  await sent(friend, "/api/comments");

  await viewer.goto("/");
  const feed = viewer.getByRole("region", { name: "Feed" });
  const item = feed.getByRole("article").filter({ hasText: body });
  await expect(item).toHaveCount(1);
  await expect(item.locator("strong")).toHaveText(`td${RUN}`);
  await expect(item).toContainText(`${GAME.name} · Friends`);
  // The friend's result of the game the viewer hasn't played is the blurred item: a prompt in place of how it ended.
  const result = feed.getByRole("article").filter({ has: viewer.getByRole("link", { name: "Play to see", exact: true }) });
  await expect(result).toHaveCount(1);
  await expect(result).not.toContainText(body);
  // The feed's names carry the avatar slot (docs/milestones/M14-14a-3a-me.md, criterion 6), and so does the friend's row
  // on the live board.
  await expect(item.locator("[data-initial='T']")).toHaveCount(1);
  await viewer.goto("/friends");
  const row = viewer.getByRole("region", { name: "Friends today" }).getByRole("listitem").filter({ hasText: `td${RUN}:` });
  await expect(row.locator("[data-initial='T']")).toHaveCount(1);
});

// Criterion 5.
test("Today's columns: the circle on the right from 1200px, stacked below it, and no sideways scroll at 320px", async ({ browser }) => {
  const wide = await player(browser, "te", { width: 1440, height: 900 });
  const box = async (page: typeof wide, name: string) => (await page.getByRole(name === "Your circle" ? "complementary" : "region", { name }).boundingBox())!;
  await expect(wide.getByRole("region", { name: "Friends today" })).toBeVisible();
  const [game, side] = [await box(wide, GAME.name), await box(wide, "Your circle")];
  expect(side.x).toBeGreaterThanOrEqual(game.x + game.width);
  expect(side.y).toBeLessThan(game.y + game.height);

  const middle = await player(browser, "tf", { width: 1024, height: 900 });
  await expect(middle.getByRole("region", { name: "Friends today" })).toBeVisible();
  const [game2, side2] = [await box(middle, GAME.name), await box(middle, "Your circle")];
  expect(side2.x).toBe(game2.x);
  expect(side2.y).toBeGreaterThanOrEqual(game2.y + game2.height);

  const narrow = await player(browser, "tg", { width: 320, height: 640 });
  await expect(narrow.getByRole("region", { name: "Feed" })).toBeVisible();
  // Phones have no leaderboard card on Today (M16 16f-5, answer 19) and no live board; it's on the Friends tab.
  await expect(narrow.getByRole("region", { name: "Leaderboard" })).toHaveCount(0);
  await expect(narrow.getByRole("region", { name: "Friends today" })).toHaveCount(0);
  expect(await narrow.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
