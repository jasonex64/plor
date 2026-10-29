// The frame and the skeletons (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6a): the tab bar stays on screen
// while the player moves between tabs (criterion 1), and a section whose data hasn't landed shows its skeleton, by its
// label, never "Loading…" text (criterion 2). Numbers and headlines (14b-6d, criterion 5).
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
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
