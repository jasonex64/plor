// 14b-13, the reactions behind a ⋯ menu (docs/milestones/M14-14b-13-reactions-menu.md): a comment or a friend's run
// shows only the reactions people used, as small text with yours tinted; a ⋯ at its top right opens a popover of the
// five emoji and Delete or Report, which closes on a pick, Escape, a press outside, focus leaving or another ⋯ opening
// (WAI-ARIA APG Disclosure).
import { expect, test, type Locator, type Page } from "@playwright/test";
import { Pool } from "pg";
import { REACTIONS } from "../src/config/tunables";
import { RUN, play, sent, signInAndPick, sharedLink } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const PHONE = { width: 390, height: 844 };
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
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.locator("#result")).toContainText("You climbed 0 of 7 stops");
}

async function comment(page: Page, body: string) {
  await page.goto("/");
  await page.getByLabel("Comment to your friends").fill(body);
  await page.getByRole("button", { name: "Post" }).click();
  await sent(page, "/api/comments");
}

const box = async (el: Locator) => (await el.boundingBox())!;
const soft = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--soft)";
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });

test("reactions sit behind each comment's and run's ⋯, and its popover closes the APG disclosure's way", async ({ browser }) => {
  test.slow();
  const friend = await (await browser.newContext({ viewport: PHONE, permissions: ["clipboard-read", "clipboard-write"] })).newPage();
  await friend.goto("/friends");
  await signInAndPick(friend, "ra");
  const invite = await sharedLink(friend, friend.getByRole("region", { name: "Invite friends" }).getByRole("button", { name: "Invite a friend" }));
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await page.goto(new URL(invite).pathname);
  await signInAndPick(page, "rb");
  await page.getByRole("button", { name: "Add friend" }).click();
  await caught(friend);
  await caught(page);
  await comment(friend, "Theirs, first.");
  await comment(page, "Mine, second.");

  await page.goto("/");
  const feed = page.getByRole("region", { name: "Feed" });
  const theirs = feed.getByRole("listitem").filter({ hasText: "Theirs, first." });
  const mine = feed.getByRole("listitem").filter({ hasText: "Mine, second." });
  await expect(mine).toBeVisible();

  // At rest: no emoji button anywhere, and a comment nobody reacted to has nothing under its words.
  for (const emoji of REACTIONS) await expect(page.getByRole("button", { name: emoji })).toHaveCount(0);
  expect(await theirs.locator("p").evaluate((p) => p.nextElementSibling)).toBeNull();

  // The ⋯: at the top right, 44px, named for whose comment it is, closed.
  const more = theirs.getByRole("button", { name: `Actions for ra${RUN}'s comment` });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  const dots = await box(more);
  const words = await box(theirs.locator("p"));
  const row = await box(theirs);
  expect(dots.width).toBeGreaterThanOrEqual(44);
  expect(dots.height).toBeGreaterThanOrEqual(44);
  expect(dots.x).toBeGreaterThanOrEqual(words.x + words.width);
  expect(dots.y).toBeLessThan(words.y);
  expect(row.x + row.width - (dots.x + dots.width)).toBeLessThan(16);

  // Open: the five emoji, none yours yet, each 44px, then Report (someone else's comment), and no counts.
  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  const emojis = theirs.getByRole("group", { name: "Reactions" }).getByRole("button");
  await expect(emojis).toHaveText([...REACTIONS]);
  // Measured once it has popped in: mid-pop it's scaled down (kit .pop).
  const popover = emojis.first().locator("xpath=ancestor::*[@id][1]");
  await popover.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  for (const b of await emojis.all()) {
    await expect(b).toHaveAttribute("aria-pressed", "false");
    const size = await box(b);
    expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(44);
  }
  const report = theirs.getByRole("button", { name: "Report", exact: true });
  expect((await box(report)).height).toBeGreaterThanOrEqual(44);
  await expect(theirs.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
  // Right edges aligned, directly under the ⋯ (approved placement).
  const [panel, open] = [await box(popover), await box(more)];
  expect(Math.abs(panel.x + panel.width - (open.x + open.width))).toBeLessThan(1);
  expect(Math.abs(panel.y - (open.y + open.height))).toBeLessThan(1);
  // Nothing scrolls sideways on a phone with it open.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // Escape closes it, back on the ⋯.
  await page.keyboard.press("Escape");
  await expect(emojis).toHaveCount(0);
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(more).toBeFocused();

  // Enter opens it; Tab goes through its five emoji and Report; one more Tab leaves it, and it closes.
  await page.keyboard.press("Enter");
  await expect(emojis).toHaveCount(5);
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  await expect(report).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(emojis).toHaveCount(0);

  // A press outside closes it.
  await more.click();
  await expect(emojis).toHaveCount(5);
  await page.getByRole("heading", { name: "Feed" }).click();
  await expect(emojis).toHaveCount(0);

  // Your own comment's ⋯ holds Delete, not Report; opening another ⋯ closes the first. (The one above: an open popover
  // lies over the row below it.)
  const mineMore = mine.getByRole("button", { name: `Actions for rb${RUN}'s comment` });
  const del = mine.getByRole("button", { name: "Delete", exact: true });
  await mineMore.click();
  await expect(del).toBeVisible();
  await expect(mine.getByRole("button", { name: "Report", exact: true })).toHaveCount(0);
  await more.click();
  await expect(del).toHaveCount(0);
  await expect(mineMore).toHaveAttribute("aria-expanded", "false");
  await expect(emojis).toHaveCount(5);
  await page.keyboard.press("Escape");

  // A pick reacts, closes the popover back on the ⋯, says so with Undo, and the summary shows it, tinted as yours, in
  // 13px, popping in.
  await more.click();
  await theirs.getByRole("button", { name: "😂" }).click();
  await expect(emojis).toHaveCount(0);
  await expect(more).toBeFocused();
  await expect(page.getByRole("status").filter({ has: page.getByRole("button", { name: "Undo" }) })).toContainText("😂 added");
  const laugh = theirs.getByText(/^😂 1/);
  await expect(laugh).toHaveText("😂 1, yours");
  expect(await laugh.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await soft(page));
  expect(await laugh.evaluate((el) => getComputedStyle(el).fontSize)).toBe("13px");
  expect(await laugh.locator("span").first().evaluate((el) => getComputedStyle(el).animationName)).not.toBe("none");
  await sent(page, "/api/reactions");
  // Reopened, yours is pressed.
  await more.click();
  await expect(theirs.getByRole("button", { name: "😂" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");

  // A friend's run on the board: the same ⋯, named for the run, with only the emoji.
  await page.goto("/friends");
  const run = page.getByRole("region", { name: "Friends today" }).locator(":scope > ul > li").filter({ hasText: `ra${RUN}` });
  const runMore = run.getByRole("button", { name: `React to ra${RUN}'s run` });
  await expect(run.getByRole("button", { name: "👍" })).toHaveCount(0);
  await runMore.click();
  await expect(run.getByRole("group", { name: "Reactions" }).getByRole("button")).toHaveText([...REACTIONS]);
  await expect(run.getByRole("button", { name: /^(Report|Delete)$/ })).toHaveCount(0);
});

test("under reduced motion the popover doesn't pop in", async ({ browser }) => {
  const friend = await (await browser.newContext({ viewport: PHONE, permissions: ["clipboard-read", "clipboard-write"] })).newPage();
  await friend.goto("/friends");
  await signInAndPick(friend, "rc");
  const invite = await sharedLink(friend, friend.getByRole("region", { name: "Invite friends" }).getByRole("button", { name: "Invite a friend" }));
  const page = await (await browser.newContext({ viewport: PHONE, reducedMotion: "reduce" })).newPage();
  await page.goto(new URL(invite).pathname);
  await signInAndPick(page, "rd");
  await page.getByRole("button", { name: "Add friend" }).click();
  await caught(friend);
  await caught(page);
  await page.goto("/friends");
  const run = page.getByRole("region", { name: "Friends today" }).locator(":scope > ul > li").filter({ hasText: `rc${RUN}` });
  await run.getByRole("button", { name: `React to rc${RUN}'s run` }).click();
  const panel = run.getByRole("group", { name: "Reactions" }).locator("xpath=ancestor::*[@id][1]");
  expect(await panel.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
});
