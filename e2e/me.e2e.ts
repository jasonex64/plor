// The Me tab's stats (docs/milestones/M14-14a-3a-me.md): the header, totals, this month's calendar, Offbeat's and
// Fragments' cards (M16 16f-1), before and after a run; the avatar slots by names; and the Friends tab's empty state.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { GAME, SUBSTRINGS } from "../src/platform/game";
import { localStack } from "../scripts/slot.ts";
import { RUN, signInAndPick, playToEnd } from "./players";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
let puzzle: TodayPuzzle;
let today = "";

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
  today = puzzle.created;
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
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
test("Me shows the header, totals, calendar and Offbeat's card, and counts a run once it's over", { tag: "@visual" }, async ({ browser }) => {
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
  // Today is outlined 2px outside its edge, as mockup 3's calendar marks it (M14 14b-8c; it was a 2px border before).
  const todayCell = calendar.locator(`[data-date='${today}']`);
  expect(await todayCell.evaluate((el) => `${getComputedStyle(el).outlineStyle} ${getComputedStyle(el).outlineWidth}`)).toBe("solid 2px");
  await expect(total(page, GAME.name, "best score")).toHaveText("–");
  await expect(page.getByRole("region", { name: GAME.name, exact: true }).getByRole("link", { name: `${GAME.name}'s game screen` })).toHaveAttribute(
    "href",
    "/play",
  );
  // Fragments' card beside it: best, average and days played, and its game screen.
  await expect(total(page, SUBSTRINGS.name, "best score")).toHaveText("–");
  await expect(total(page, SUBSTRINGS.name, "avg. score")).toHaveText("–");
  await expect(total(page, SUBSTRINGS.name, "days played")).toHaveText("0");
  await expect(page.getByRole("region", { name: SUBSTRINGS.name, exact: true }).getByRole("link", { name: `${SUBSTRINGS.name}'s game screen` })).toHaveAttribute(
    "href",
    SUBSTRINGS.path,
  );
  // Fragments' own colour, #5A2F5E, in its block, whatever the theme (16f-2).
  const plum = page.getByRole("region", { name: SUBSTRINGS.name, exact: true }).locator("span[aria-hidden='true']").first();
  expect(await plum.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(90, 47, 94)");

  // A finished run with no answer, a played day; its points come once the day closes.
  await page.goto("/");
  await playToEnd(page);
  await expect(page.getByText("0 points", { exact: true })).toBeVisible();
  await page.goto("/me");
  await expect(total(page, "All games", "days played")).toHaveText("1");
  await expect(total(page, "All games", "day streak now")).toHaveText("1");
  await expect(total(page, GAME.name, "avg. points a day")).toHaveText("–");
  await expect(calendar.getByText(`1 of ${sofar} days`)).toBeVisible();
  // The text alternative names the day, and its points once it has them (docs/milestones/M14-14a-3b-settings.md, criterion 6).
  await expect(calendar.getByRole("img")).toHaveAttribute(
    "aria-label",
    `Days played in ${dateText(today, { month: "long" })}: 1 of the ${sofar} days so far: ${dateText(today, { day: "numeric", month: "long" })}`,
  );
  // A played day takes Paper's strongest shade, the accent itself (16f-1, "Played or not").
  expect(await todayCell.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(36, 87, 214)");
  // No numbers until the player turns them on (L46).
  await expect(todayCell).toHaveText("");
});

// Criteria 6 and 7.
test("names carry an avatar slot, and the Friends tab says Plor is better with friends", async ({ browser }) => {
  const page = await player(browser, "mc");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Friends" }).click();
  const board = page.getByRole("region", { name: "Friends today" });
  await expect(board.getByRole("heading", { name: "Plor is better with friends" })).toBeVisible();
  await expect(board).toContainText("compare scores every week, in whichever games you both play.");
  // The friends list sits below (docs/milestones/M14-14a-3b-settings.md, criterion 7), pointing to Find a player (M17 17c, G3).
  await expect(page.getByRole("region", { name: "Your friends" })).toContainText("No friends yet. Find a player by their username, above.");

  // The leaderboards: the player's own row, on This week (one period at a time since M20 20i).
  await page.getByRole("region", { name: "Friends leaderboard" }).getByRole("radio", { name: "This week", exact: true }).check();
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
  await playToEnd(page);
  await page.getByLabel("Comment to your friends").fill(`slots ${RUN}`);
  await page.getByRole("button", { name: "Post" }).click();
  const comment = page.getByRole("region", { name: `${GAME.name} comments` }).getByRole("listitem").filter({ hasText: `slots ${RUN}` });
  await expect(comment.locator("[data-initial='M']")).toHaveCount(1);
});
