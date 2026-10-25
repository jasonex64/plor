// Today (docs/milestones/M14-14a-2a-today.md): Offbeat's banner before and after playing, the one leaderboard card,
// the feed before playing (names, no words), and Today's columns from phone to desktop.
import { expect, test, type Browser } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
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
  const banner = page.getByRole("region", { name: "Offbeat", exact: true });
  await expect(banner.getByText("Don't match the Wind · 7 questions")).toBeVisible();
  // Offbeat's own colour, #2F3D5C, whatever the theme.
  const block = banner.getByRole("heading", { name: "Offbeat" }).locator("..");
  expect(await block.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(47, 61, 92)");

  // Play is a link to Offbeat's game screen, where the run is played (docs/milestones/M14-14a-2b-game-screen.md).
  await expect(banner.getByRole("link", { name: "Play", exact: true })).toHaveAttribute("href", "/offbeat");
  await play(page);
  // During the run, Today's banner leads back to it: a run waiting at a reveal has no clock bar (Source diff).
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(banner.getByText("Your run is still going")).toBeVisible();
  await banner.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL("http://localhost:3000/offbeat");
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.locator("#result")).toContainText("You survived 0 of 7 questions");

  await nav.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(banner.getByText("0 points + about 0 bonus · caught on question 1")).toBeVisible();
  await expect(banner.getByRole("timer")).toContainText("Next puzzle in");
  await banner.getByRole("link", { name: "Result" }).click();
  await expect(page).toHaveURL(/\/offbeat#result$/);
  await expect(page.locator("#result")).toBeVisible();
});

// Criterion 3.
test("one leaderboard card switches between yesterday and this week, for friends or a group", async ({ browser }) => {
  const page = await player(browser, "tb");
  await page.goto("/groups");
  await page.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Owls");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);

  await page.goto("/");
  const card = page.getByRole("region", { name: "Leaderboard" });
  await expect(card.getByRole("radio", { name: "Yesterday" })).toBeChecked();
  // Dated, as "Fri 23 Oct · Offbeat" (L25).
  await expect(card.getByRole("region", { name: "Yesterday" })).toContainText(/[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2} · Offbeat/);
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

// Criterion 4: a friend's comment, before the viewer has played.
test("before playing, the feed names who commented and holds none of their words", async ({ browser }) => {
  const viewer = await player(browser, "tc");
  await viewer.goto("/friends");
  const invite = viewer.getByRole("region", { name: "Friends today" }).getByRole("region", { name: "Invite friends" });
  await invite.getByRole("button", { name: "Make my invite link" }).click();
  const link = await invite.locator("code").innerText();

  const friend = await (await browser.newContext({ viewport: PHONE })).newPage();
  await friend.goto(path(link));
  await signInAndPick(friend, "td");
  await friend.getByRole("button", { name: "Add friend" }).click();
  await expect(friend.getByRole("heading", { name: `You and tc${RUN} are now friends.` })).toBeVisible();
  await friend.goto("/");
  await play(friend);
  await friend.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await friend.getByRole("button", { name: "Answer" }).click();
  const body = `the words ${RUN}`;
  await friend.getByLabel("Comment to your friends").fill(body);
  await friend.getByRole("button", { name: "Post" }).click();
  // Posted on the game screen, whose feed is "Offbeat comments" (14a-2c); Today's below stays "Feed".
  await expect(friend.getByRole("region", { name: "Offbeat comments" }).getByText(body)).toBeVisible();

  await viewer.goto("/");
  const feed = viewer.getByRole("region", { name: "Feed" });
  await expect(feed.getByRole("link", { name: "Finish today's Offbeat to read 1 comment" })).toHaveAttribute("href", "/offbeat");
  const item = feed.getByRole("listitem");
  await expect(item).toHaveCount(1);
  await expect(item.locator("strong")).toHaveText(`td${RUN}`);
  // Beside the name, filler hidden from screen readers, which hear "comment hidden until you play" instead.
  await expect(item.locator("[aria-hidden='true']")).toHaveText(/^[x ]+$/);
  await expect(item).toContainText("comment hidden until you play");
  // Not in the page at all: the server sends no comment text before the viewer has played (H3).
  expect(await viewer.content()).not.toContain(body);
});

// Criterion 5.
test("Today's columns: the circle on the right from 1200px, stacked below it, and no sideways scroll at 320px", async ({ browser }) => {
  const wide = await player(browser, "te", { width: 1440, height: 900 });
  const box = async (page: typeof wide, name: string) => (await page.getByRole(name === "Your circle" ? "complementary" : "region", { name }).boundingBox())!;
  await expect(wide.getByRole("region", { name: "Friends today" })).toBeVisible();
  const [game, side] = [await box(wide, "Offbeat"), await box(wide, "Your circle")];
  expect(side.x).toBeGreaterThanOrEqual(game.x + game.width);
  expect(side.y).toBeLessThan(game.y + game.height);

  const middle = await player(browser, "tf", { width: 1024, height: 900 });
  await expect(middle.getByRole("region", { name: "Friends today" })).toBeVisible();
  const [game2, side2] = [await box(middle, "Offbeat"), await box(middle, "Your circle")];
  expect(side2.x).toBe(game2.x);
  expect(side2.y).toBeGreaterThanOrEqual(game2.y + game2.height);

  const narrow = await player(browser, "tg", { width: 320, height: 640 });
  await expect(narrow.getByRole("region", { name: "Leaderboard" })).toBeVisible();
  // Phones have no live board on Today; it's on the Friends tab.
  await expect(narrow.getByRole("region", { name: "Friends today" })).toHaveCount(0);
  expect(await narrow.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
