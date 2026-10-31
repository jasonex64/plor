// 14b-2c-1, the player screens' review items (docs/milestones/M14-14b-2c-review-items.md): the room the shell, the
// clock bar and the right column leave goes with the page that shows them; the right column keeps a draft across
// 1200px; a question's time running out away from the game opens the feed; text that names no entry stays in the box;
// the bonus line, the result's jump, your own invite link, reactions at 320px, the leaderboard card on a new choice,
// and Try again when the live channel can't be opened.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, signInAndPick, sharedLink } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { GAME } from "../src/platform/game";

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
const WIDE = { width: 1440, height: 900 };

async function player(browser: Browser, name: string, viewport: { width: number; height: number }, clock = false): Promise<Page> {
  const page = await (await browser.newContext({ viewport })).newPage();
  if (clock) await page.clock.install();
  await page.goto("/");
  await signInAndPick(page, name);
  return page;
}

// Starts today's run and is tipped over at stop 1 by the host's answer.
async function caught(page: Page) {
  await play(page);
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.locator("#result")).toContainText("You climbed 0 of 7 stops");
}

const bodyPadding = (page: Page) =>
  page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { top: s.paddingTop, right: s.paddingRight, bottom: s.paddingBottom, left: s.paddingLeft };
  });

// Items 12 and 43: Next.js keeps the page left hidden, and its shell, clock bar and column no longer hold the room.
test("the room for the clock bar and the right column goes with the page that shows them", async ({ browser }) => {
  const page = await player(browser, "xa", PHONE);
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Friends" }).click();
  const clock = page.getByRole("region", { name: "Stop in play" });
  await expect(clock.getByRole("timer")).toBeVisible();
  expect((await bodyPadding(page)).bottom).toBe("112px");
  await clock.getByRole("link", { name: "Back" }).click();
  await expect(page.getByLabel("Your answer")).toBeVisible();
  // Back on the game screen: the tab bar's room, not the hidden Friends page's clock bar.
  expect(await bodyPadding(page)).toEqual({ top: "56px", right: "0px", bottom: "64px", left: "0px" });

  // From 1200px the column's room, then About from the settings sheet: a page without the shell, and no room left.
  await page.setViewportSize(WIDE);
  await nav.getByRole("link", { name: "Me" }).click();
  await expect(page.getByRole("complementary", { name: "Friends feed" })).toBeVisible();
  expect((await bodyPadding(page)).right).toBe("360px");
  await nav.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "About Plor" }).click();
  await expect(page.getByRole("heading", { name: "About Plor" })).toBeVisible();
  expect(await bodyPadding(page)).toEqual({ top: "0px", right: "0px", bottom: "0px", left: "0px" });
});

// Item 45: crossing 1200px moves the game screen's feed between the right column and its place below the game.
test("a comment draft in the right column stays when the window crosses 1200px", async ({ browser }) => {
  const page = await player(browser, "xb", WIDE);
  await caught(page);
  const box = page.getByLabel("Comment to your friends");
  await box.fill("a draft that must stay");
  await page.setViewportSize({ width: 1100, height: 900 });
  await expect(page.getByRole("complementary", { name: "Feed" })).toBeVisible();
  await expect(box).toHaveValue("a draft that must stay");
  await page.setViewportSize(WIDE);
  await expect(box).toHaveValue("a draft that must stay");
});

// Items 6 and 46: the database decides a timeout when the run is next read; the clock bar reaching zero reads it.
test("a question's time running out on another page opens the friends feed there", async ({ browser }) => {
  const page = await player(browser, "xc", WIDE, true);
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Me" }).click();
  const feed = page.getByRole("complementary", { name: "Friends feed" });
  await expect(feed.getByText("Finish today's game to join in.")).toBeVisible();
  await expect(feed.getByLabel("Comment to your friends")).toHaveCount(0);
  // The browser's clock is faked, the database's isn't: question 1's deadline is the run's started_at plus 20 seconds
  // (private.question_started_at), so the run is moved back past it, as if the time had passed there too.
  await DB.query(
    "update private.run set started_at = started_at - interval '21 seconds' where user_id = (select id from auth.users where email = $1)",
    [`${RUN}-xc@example.test`],
  );
  await page.clock.fastForward("00:21");
  await expect(page.getByRole("region", { name: "Stop in play" }).getByRole("status")).toHaveText("Dozed off at stop 1");
  await expect(feed.getByLabel("Comment to your friends")).toBeVisible();
});

// The same on Today from 768px, where the board sits in the page: once the run is over it shows where everyone ended
// (the 14b-2c-1 review). On the real clock: a faked one also fires the Realtime client's own timers, and the rejoin
// that follows reloads the board whatever the page does.
test("a question's time running out on Today shows where everyone ended on its board", async ({ browser }) => {
  test.slow();
  const page = await player(browser, "xj", WIDE);
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Today" }).click();
  const board = page.getByRole("region", { name: "Friends today" });
  await expect(board).toBeVisible();
  await expect(board.getByRole("region", { name: "Where everyone ended" })).toHaveCount(0);
  // Question 1's 20 seconds, then the clock bar's zero.
  await expect(page.getByRole("region", { name: "Stop in play" }).getByRole("status")).toHaveText("Dozed off at stop 1", { timeout: 30_000 });
  await expect(board.getByRole("region", { name: "Where everyone ended" })).toContainText("Dozed off at stop 1: You");
});

// Item 4 (answers 6 and 7): a typo is fixed in place, and a run with nothing survived has no bonus line.
test("text that names no entry stays selected in the box, and a catch on stop 1 has no bonus line", async ({ browser }) => {
  const page = await player(browser, "xd", PHONE);
  await play(page);
  const input = page.getByLabel("Your answer");
  await input.fill("zzqqzz");
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.getByText('"zzqqzz" isn\'t in our list. Try another answer.')).toBeVisible();
  await expect(input).toHaveValue("zzqqzz");
  expect(await input.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([0, 6]);

  await input.fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  const result = page.locator("#result");
  await expect(result).toContainText("You climbed 0 of 7 stops and scored 0 points.");
  await expect(result).not.toContainText("bonus");
  await page.goto("/");
  // The banner's facts as chips since 14b-8b.
  await expect(page.getByRole("region", { name: GAME.name }).getByText("tipped over at stop 1", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: GAME.name }).getByText("0 points", { exact: true })).toBeVisible();
});

// Item 14: Result lands before the run has loaded; the result brings itself into view, below the phone's top bar.
test("the banner's Result opens the game screen at the result", async ({ browser }) => {
  const page = await player(browser, "xe", { width: 360, height: 400 });
  await caught(page);
  await page.goto("/");
  await page.getByRole("region", { name: GAME.name }).getByRole("link", { name: "Result" }).click();
  await expect(page).toHaveURL(/\/updraft#result$/);
  await expect(page.locator("#result")).toBeVisible();
  const at = () =>
    page.evaluate(() => ({
      top: Math.round(document.getElementById("result")!.getBoundingClientRect().top),
      scrolled: window.scrollY > 0,
    }));
  await expect.poll(at).toEqual({ top: 56, scrolled: true });
});

// Answer 8, and item 10: your own link says so; then, friends who have both played see each other's reactions (behind
// a ⋯ since 14b-13), and a 320px phone still doesn't scroll sideways with its popover open.
test("your own invite link says it's yours, and a board with reactions fits 320px", async ({ browser }) => {
  test.slow();
  const host = await player(browser, "xf", PHONE);
  await host.goto("/friends");
  const invite = host.getByRole("region", { name: "Your friends" }).getByRole("region", { name: "Invite friends" });
  const link = new URL(await sharedLink(host, invite.getByRole("button", { name: "Invite a friend" }))).pathname;
  await host.goto(link);
  await expect(host.getByRole("heading", { name: "This is your invite link" })).toBeVisible();
  await expect(host.getByRole("button", { name: "Add friend" })).toHaveCount(0);

  const guest = await (await browser.newContext({ viewport: PHONE })).newPage();
  await guest.goto(link);
  await signInAndPick(guest, "xg");
  await guest.getByRole("button", { name: "Add friend" }).click();
  await expect(guest.getByRole("heading", { name: /are now friends\.$/ })).toBeVisible();
  await guest.goto("/");
  await caught(guest);
  await host.goto("/");
  await caught(host);

  await host.setViewportSize({ width: 320, height: 640 });
  await host.goto("/friends");
  const row = host.getByRole("region", { name: "Friends today" }).locator(":scope > ul > li").filter({ hasText: `xg${RUN}` });
  await row.getByRole("button", { name: /^React to / }).click();
  await expect(row.getByRole("group", { name: "Reactions" }).getByRole("button").first()).toBeVisible();
  expect(await host.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

// Item 13: the new choice's rows load under its label, with nothing of the old choice's meanwhile.
test("the leaderboard card shows nothing of the old choice while the new one loads", async ({ browser }) => {
  const page = await player(browser, "xh", PHONE);
  const card = page.getByRole("region", { name: "Leaderboard" });
  await expect(card.getByText(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}$/)).toBeVisible();
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/leaderboard", async (route) => {
    await held;
    await route.continue();
  });
  await card.getByText("This week", { exact: true }).click();
  await expect(card.getByRole("status", { name: "Loading scores" })).toBeVisible();
  await expect(card.getByText(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}$/)).toHaveCount(0);
  release();
  await expect(card.getByText(/^From [A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}$/)).toBeVisible();
});

// Answer 14: a channel that can't be opened shows its error with Try again, and Try again opens it.
test("Try again opens the live channel after it couldn't be opened", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await page.goto("/");
  await signInAndPick(page, "xi");
  await page.route("**/api/realtime/session", (route) => route.abort());
  await page.goto("/friends");
  const board = page.getByRole("region", { name: "Friends today" });
  const tryAgain = board.getByRole("button", { name: "Try again" });
  await expect(tryAgain).toBeVisible();
  await page.unroute("**/api/realtime/session");
  const socket = page.waitForEvent("websocket", (ws) => ws.url().includes("/realtime/v1"));
  await tryAgain.click();
  await socket;
  await expect(board.getByRole("alert")).toHaveCount(0);
});
