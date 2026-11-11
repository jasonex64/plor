// 14b-21, screen readers (docs/milestones/M14-14b-21-screen-readers.md): one "Loading" per page, focus kept after
// Undo, Close, Delete, Report and the feed column's move, a failed send read at once, each toast announced, the
// reactions and the countdown read by name. Checked through the accessibility tree and the focused element; the human
// tries them with a screen reader on their phone (answer 7).
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { GAME } from "../src/platform/game";
import { RUN, play, sent, sharedLink, signInAndPick } from "./players";
import { caughtToCards } from "./game";
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

async function caught(page: Page) {
  await page.goto("/");
  await play(page);
  await caughtToCards(page, puzzle.hostAnswer);
  await expect(page.locator("#result")).toBeVisible();
  await page.goto("/");
}

// What has focus, as a reader would name it.
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el ? `${el.tagName.toLowerCase()} ${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 40)}` : null;
  });

async function post(page: Page, body: string) {
  await page.getByLabel("Comment to your friends").fill(body);
  await page.getByRole("button", { name: "Post" }).click();
}

test("a loading page says Loading once, however many parts load", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "ql");
  // Today's parts held back, so all their placeholders show at once.
  const gates: (() => void)[] = [];
  let held = true;
  await page.route(/\/api\/(run|feed|board|leaderboard)/, async (route) => {
    if (held) await new Promise<void>((r) => gates.push(r));
    await route.continue();
  });
  await page.goto("/");
  await expect.poll(() => page.locator("[data-loading]").count()).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole("status").filter({ hasText: /^Loading$/ })).toHaveCount(1);
  await expect(page.getByRole("status", { name: /^Loading/ })).toHaveCount(0);
  held = false;
  for (const open of gates) open();
  await expect(page.locator("[data-loading]")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: /^Loading$/ })).toHaveCount(0);
});

test("after Undo focus goes back where the player was, or to the page's heading when that's gone", async ({ page }) => {
  // On a phone, so the page scrolls: focus moves without scrolling it (docs/milestones/
  // M14-14b-23-small-jumps-and-finds.md, answer 8).
  await page.setViewportSize({ width: 390, height: 844 });
  const scrolled = () => page.evaluate(() => window.scrollY);
  await page.goto("/");
  await signInAndPick(page, "qu");
  await caught(page);
  await post(page, "Undo me.");
  const undo = page.getByRole("button", { name: "Undo" });
  await undo.focus();
  // At the top, with Post below the screen, so focusing it would scroll.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByRole("button", { name: "Post" })).not.toBeInViewport();
  await page.keyboard.press("Enter");
  expect(await focused(page)).toBe("button Post");
  expect(await scrolled()).toBe(0);

  await post(page, "Undo me again.");
  // The Post button gone from the page by the time Undo is pressed.
  await page.getByRole("button", { name: "Post" }).evaluate((b) => b.remove());
  await undo.focus();
  // Just past the heading, so focusing it would scroll; not to the bottom, which Undo's shorter feed would pull up.
  await page.evaluate(() => window.scrollTo(0, window.scrollY + document.querySelector("main > h1")!.getBoundingClientRect().bottom + 1));
  const before = await scrolled();
  expect(before).toBeGreaterThan(0);
  await page.keyboard.press("Enter");
  expect(await focused(page)).toMatch(/^h1 Plor/);
  expect(await scrolled()).toBe(before);
});

test("a failed send is an alert, read at once, and the same words twice are announced twice", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await signInAndPick(page, "qf");
  await caught(page);
  await post(page, "First.");
  const line = page.getByRole("status").filter({ hasText: "Comment posted" }).locator("p");
  const first = await line.elementHandle();
  await post(page, "Second.");
  await expect(line).toBeVisible();
  // A new line, not the same one left in place: a live region reads what's added.
  expect(await first!.evaluate((el) => el.isConnected)).toBe(false);

  // "Second." waits out its Undo window first: still held, it would be sent into the failing route by the next post, for
  // two failures and an alert that can come back around the Close below. By its text, as sent() could match "First."'s.
  await page.waitForResponse((r) => new URL(r.url()).pathname === "/api/comments" && (r.request().postData() ?? "").includes("Second."));
  await page.route("**/api/comments", (route) => (route.request().method() === "POST" ? route.abort("failed") : route.continue()));
  await post(page, "This one fails.");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Friends" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Your comment wasn't posted" })).toBeVisible();
  // Close puts focus back where the player was: the Friends tab they went to (answer 2).
  await page.getByRole("button", { name: "Close" }).focus();
  await page.keyboard.press("Enter");
  // Focus moves once the alert's close has rendered, which can come after the key press returns (PR #154's CI).
  await expect.poll(() => focused(page)).toMatch(/^a .*Friends$/);
});

test("after Delete focus moves to the next comment's ⋯, then the one before, then the feed's heading", async ({ page }) => {
  test.slow();
  await page.goto("/");
  await signInAndPick(page, "qd");
  await caught(page);
  for (const body of ["One.", "Two.", "Three."]) {
    await post(page, body);
    await sent(page, "/api/comments");
  }
  await page.reload();
  const feed = page.getByRole("region", { name: "Feed" });
  const remove = async (body: string) => {
    const row = feed.getByRole("listitem").filter({ hasText: body });
    await row.getByRole("button", { name: /^Actions for / }).click();
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(row).toHaveCount(0);
  };
  await remove("One.");
  expect(await focused(page)).toMatch(/^button Actions for .*'s comment$/);
  expect(await page.evaluate(() => document.activeElement!.closest("li")!.textContent)).toContain("Two.");
  await remove("Three.");
  expect(await page.evaluate(() => document.activeElement!.closest("li")!.textContent)).toContain("Two.");
  await remove("Two.");
  expect(await focused(page)).toBe("h2 Feed");
});

test("after Report focus moves to the next comment's ⋯", async ({ browser }) => {
  test.slow();
  const friend = await (await browser.newContext()).newPage();
  await friend.goto("/friends");
  await signInAndPick(friend, "qp");
  const invite = await sharedLink(friend, friend.getByRole("button", { name: "Invite a friend" }));
  const page = await (await browser.newContext()).newPage();
  await page.goto(new URL(invite).pathname);
  await signInAndPick(page, "qq");
  await page.getByRole("button", { name: "Add friend" }).click();
  await caught(friend);
  await post(friend, "Report me.");
  await sent(friend, "/api/comments");
  await caught(page);
  await post(page, "Mine, after.");
  await sent(page, "/api/comments");
  await page.reload();
  const feed = page.getByRole("region", { name: "Feed" });
  const theirs = feed.getByRole("listitem").filter({ hasText: "Report me." });
  await theirs.getByRole("button", { name: /^Actions for / }).click();
  await theirs.getByRole("button", { name: "Report" }).click();
  await expect(theirs).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest("li")?.textContent ?? null)).toContain("Mine, after.");
  expect(await focused(page)).toMatch(/^button Actions for .*'s comment$/);
});

test("a comment's reactions are a group named Reactions", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "qr");
  await caught(page);
  await post(page, "React to me.");
  await sent(page, "/api/comments");
  await DB.query(
    `insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji)
     select u.id, $2, private.today(), c.id, '😂' from auth.users u join private.comment c on c.user_id = u.id where u.email = $1`,
    [`${RUN}-qr@example.test`, GAME.id],
  );
  await page.reload();
  const row = page.getByRole("region", { name: "Feed" }).getByRole("listitem").filter({ hasText: "React to me." });
  await expect(row.getByRole("group", { name: "Reactions" })).toContainText("😂 1");
});

test("the countdown says what it counts in its own text, and fits at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await signInAndPick(page, "qc");
  await play(page);
  // The number is shown with "seconds left" under it; screen readers read the words in the timer's own text
  // (src/app/game.tsx, Countdown), so the check is the accessibility tree's text, not the shown one.
  const clock = page.getByRole("timer");
  await expect(clock).toMatchAriaSnapshot("- timer: /^\\d+ seconds left$/");
  expect(await clock.getAttribute("aria-label")).toBeNull();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
});

// The game screen's feed, in the right column from 1200px and in the page below it (SideColumn's inPlace).
test("crossing 1200px keeps focus in the comment box", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await signInAndPick(page, "qx");
  await caught(page);
  await page.goto(GAME.path);
  const box = page.getByRole("region", { name: `${GAME.name} comments` }).getByLabel("Comment to your friends");
  await box.fill("Half a thought");
  await box.focus();
  await page.setViewportSize({ width: 1100, height: 900 });
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLTextAreaElement | null)?.value ?? null)).toBe("Half a thought");
  expect(await page.evaluate(() => document.activeElement!.tagName)).toBe("TEXTAREA");
});
