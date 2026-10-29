// The frame and the skeletons (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6a): the tab bar stays on screen
// while the player moves between tabs (criterion 1), and a section whose data hasn't landed shows its skeleton, by its
// label, never "Loading…" text (criterion 2). Comments and reactions at once, with Undo (14b-6b, criterion 3). The
// question's clock (14b-6c, criterion 4). Numbers and headlines (14b-6d, criterion 5).
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { UNDO_SECONDS } from "../src/config/tunables";
import { GAME } from "../src/platform/game";
import { RUN, play, sent, signInAndPick } from "./players";
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

// Holds the page's requests to a path until release() is called, so a section's loading state can be seen; after
// that they pass straight through.
async function hold(page: Page, path: string): Promise<() => void> {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(`**${path}`, async (route) => {
    await held;
    await route.continue();
  });
  return release;
}

// The introduction is in the served HTML, before any script runs (Google's brand check, M02 2c): the frame around the
// page mustn't hold it back. The invite pages' lines too.
test("the pages' static text is served without JavaScript", async ({ browser }) => {
  const page = await (await browser.newContext({ javaScriptEnabled: false })).newPage();
  await page.goto("/");
  await expect(page.getByText("Plor is a small site with a daily word game.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Today's game:/ })).toBeVisible();
  await page.goto("/i/AAAAAAAAAA");
  await expect(page.getByText("A friend invited you to Plor")).toBeVisible();
  await page.goto("/g/AAAAAAAAAA");
  await expect(page.getByText("You were invited to a group on Plor")).toBeVisible();
});

test("the tab bar stays on screen across tab switches", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "fl");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav).toBeVisible();
  // Records any removal of the Main navigation from the document while the tabs change.
  await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Main"]')!;
    (window as unknown as { navRemoved: boolean }).navRemoved = false;
    new MutationObserver(() => {
      if (!nav.isConnected) (window as unknown as { navRemoved: boolean }).navRemoved = true;
    }).observe(document.body, { childList: true, subtree: true });
  });
  for (const [tab, heading] of [
    ["Friends", "Friends today"],
    ["Groups", "Groups"],
    ["Me", "All games"],
    ["Today", "Leaderboard"],
  ]) {
    await nav.getByRole("link", { name: tab }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
  }
  expect(await page.evaluate(() => (window as unknown as { navRemoved: boolean }).navRemoved)).toBe(false);
});

test("a section waiting for its data shows its skeleton, not Loading text", async ({ page }) => {
  // Before the profile loads, the page shows a skeleton of itself.
  const profile = await hold(page, "/api/profile");
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Loading Plor" })).toBeVisible();
  await expect(page.getByText("Loading…")).toHaveCount(0);
  profile();
  await signInAndPick(page, "fs");
  const nav = page.getByRole("navigation", { name: "Main" });

  for (const { tab, path, label } of [
    { tab: "Me", path: "/api/me", label: "Loading your stats" },
    { tab: "Groups", path: "/api/groups", label: "Loading your groups" },
    { tab: "Friends", path: "/api/friends", label: "Loading your friends" },
  ]) {
    const release = await hold(page, path);
    await nav.getByRole("link", { name: tab }).click();
    await expect(page.getByRole("status", { name: label })).toBeVisible();
    await expect(page.getByText("Loading…")).toHaveCount(0);
    release();
    await expect(page.getByRole("status", { name: label })).toHaveCount(0);
  }

  // Today was open before (Next.js keeps a visited page with its data), so its banner's skeleton shows on a fresh load.
  const run = await hold(page, "/api/run");
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Loading today's puzzle" })).toBeVisible();
  await expect(page.getByText("Loading…")).toHaveCount(0);
  run();
  await expect(page.getByRole("status", { name: "Loading today's puzzle" })).toHaveCount(0);
});

// Every number on the page has same-width digits, and headings and paragraphs wrap evenly, from globals.css's base
// rules (criterion 5): read on Today's real elements, a section's h3 included, so a module overriding them shows here.
test("numbers are tabular, headings balanced and paragraphs pretty", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "fn");
  await expect(page.locator("h3").first()).toBeVisible();
  const styles = await page.evaluate(() => {
    const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
    return {
      body: style("body").fontVariantNumeric,
      h3Numbers: style("h3").fontVariantNumeric,
      headings: ["h1", "h2", "h3"].map((h) => style(h).getPropertyValue("text-wrap-style")),
      p: style("p").getPropertyValue("text-wrap-style"),
    };
  });
  expect(styles).toEqual({ body: "tabular-nums", h3Numbers: "tabular-nums", headings: ["balance", "balance", "balance"], p: "pretty" });
});

// A comment shows before it's sent, Undo sends nothing, and the toast's window ending sends it once; a reaction's chip
// keeps its width; a failed send puts the screen back and says what failed; leaving the page sends at once (criterion 3;
// design 3, P1).
test("comments and reactions show at once, with Undo before they're sent", async ({ page }) => {
  // Five Undo windows are waited out in full (UNDO_SECONDS each), past the default 30 s on a cold dev server.
  test.slow();
  await page.goto("/");
  await signInAndPick(page, "fu");
  await play(page);
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  const thread = page.getByRole("region", { name: `${GAME.name} comments` });
  const toast = page.getByRole("status").filter({ has: page.getByRole("button", { name: "Undo" }) });
  const posts: number[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname === "/api/comments") posts.push(Date.now());
  });

  // Undone: back in the box, never sent.
  const box = page.getByLabel("Comment to your friends");
  await box.fill(`undone ${RUN}`);
  await page.getByRole("button", { name: "Post" }).click();
  await expect(thread.getByRole("listitem").filter({ hasText: `undone ${RUN}` })).toBeVisible();
  await expect(toast).toContainText("Comment posted");
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(thread.getByRole("listitem").filter({ hasText: `undone ${RUN}` })).toHaveCount(0);
  await expect(box).toHaveValue(`undone ${RUN}`);
  await page.waitForTimeout(UNDO_SECONDS * 1000);
  expect(posts).toEqual([]);

  // Kept: sent once when the window ends, then it has its buttons.
  await box.fill(`kept ${RUN}`);
  await page.getByRole("button", { name: "Post" }).click();
  const kept = thread.getByRole("listitem").filter({ hasText: `kept ${RUN}` });
  await expect(kept).toBeVisible();
  expect(posts).toEqual([]);
  await sent(page, "/api/comments");
  await expect(kept.getByRole("button", { name: "Delete" })).toBeVisible();
  expect(posts).toHaveLength(1);

  // A chip is as wide with its count as without.
  const laugh = kept.getByRole("button", { name: "😂" });
  const before = (await laugh.boundingBox())!.width;
  await laugh.click();
  await expect(laugh).toHaveText("😂 1");
  await expect(toast).toContainText("😂 added");
  expect((await laugh.boundingBox())!.width).toBe(before);
  await sent(page, "/api/reactions");

  // A failed delete: the comment goes at once, then comes back with what failed.
  await page.route("**/api/comments/delete", (route) => route.fulfill({ status: 500, json: { ok: false, error: "internal" } }));
  await kept.getByRole("button", { name: "Delete" }).click();
  await expect(kept).toHaveCount(0);
  await expect(toast).toContainText("Comment deleted");
  await expect(page.getByRole("status").filter({ hasText: "Your comment wasn't deleted" })).toBeVisible({ timeout: (UNDO_SECONDS + 5) * 1000 });
  await expect(kept).toBeVisible();
  await page.unroute("**/api/comments/delete");

  // An earlier day opened while a comment is held stays open after the send, without the comment, and Later day
  // brings today's back with it (14b-6b review, finding 1).
  await box.fill(`earlier ${RUN}`);
  await page.getByRole("button", { name: "Post" }).click();
  await thread.getByRole("button", { name: "Earlier day" }).click();
  await expect(thread.getByRole("heading", { level: 2 })).toContainText("Friends' comments on");
  await expect(thread.getByRole("listitem").filter({ hasText: `earlier ${RUN}` })).toHaveCount(0);
  await sent(page, "/api/comments");
  await expect(thread.getByRole("heading", { level: 2 })).toContainText("Friends' comments on");
  await thread.getByRole("button", { name: "Later day" }).click();
  await expect(thread.getByRole("listitem").filter({ hasText: `earlier ${RUN}` })).toBeVisible();

  // Leaving the page sends at once, before the window would end.
  await box.fill(`leaving ${RUN}`);
  const posted = Date.now();
  await page.getByRole("button", { name: "Post" }).click();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Me" }).click();
  await expect.poll(() => posts.length).toBe(3);
  expect(posts[2] - posted).toBeLessThan(UNDO_SECONDS * 1000);
});

// While the run is in progress the game screen holds only the question: the seconds left as a number beside the
// prompt, as large as it and with tabular figures, and no banner, stats, Yesterday or comments, which come back when
// the run ends (criterion 4; answers 20–23).
test("a question shows its seconds beside the prompt, and nothing else until the run ends", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "fc");
  await play(page);
  const prompt = page.getByRole("heading", { level: 2, name: "Name an animal" });
  const clock = page.getByRole("timer", { name: "Seconds left" });
  await expect(clock).toHaveText(/^\d+$/);
  const look = await clock.evaluate((el) => {
    const [mine, theirs] = [getComputedStyle(el), getComputedStyle(document.querySelector("h2")!)];
    return { numbers: mine.fontVariantNumeric, size: mine.fontSize === theirs.fontSize, weight: mine.fontWeight === theirs.fontWeight };
  });
  expect(look).toEqual({ numbers: "tabular-nums", size: true, weight: true });
  const [p, c] = [(await prompt.boundingBox())!, (await clock.boundingBox())!];
  expect(c.x).toBeGreaterThan(p.x + p.width - 1);
  expect(c.y).toBeLessThan(p.y + p.height);
  expect(c.y + c.height).toBeGreaterThan(p.y);
  const hidden = [
    page.getByRole("heading", { level: 2, name: GAME.name, exact: true }),
    page.getByRole("region", { name: `Your ${GAME.name}` }),
    page.getByRole("region", { name: "Yesterday on the ridge" }),
    page.getByRole("region", { name: `${GAME.name} comments` }),
  ];
  for (const part of hidden) await expect(part).toHaveCount(0);

  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  for (const part of hidden) await expect(part).toBeVisible();
});
