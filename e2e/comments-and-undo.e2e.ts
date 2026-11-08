// 14b-20, comments and Undo (docs/milestones/M14-14b-20-comments-and-undo.md): a comment that can't be posted is
// stopped at Post with the reason, a count shows from 20 characters left, and signing out sends a held post first,
// staying signed in to say so when that fails.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, signInAndPick } from "./players";
import { caughtToCards } from "./afterglow";
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

// Signed in with today's run over, on Today with the feed's comment box.
async function ready(page: Page, name: string) {
  await page.goto("/");
  await signInAndPick(page, name);
  await play(page);
  await caughtToCards(page, puzzle.hostAnswer);
  await expect(page.locator("#result")).toBeVisible();
  await page.goto("/");
  await expect(page.getByLabel("Comment to your friends")).toBeVisible();
}

const comments = (name: string) =>
  DB.query("select body from private.comment c join auth.users u on u.id = c.user_id where u.email = $1", [`${RUN}-${name}@example.test`]).then((r) => r.rows.map((x) => x.body));

test("a comment of only spaces, or over 280 characters, is stopped at Post with the reason, and nothing is sent", async ({ page }) => {
  await ready(page, "ub");
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname === "/api/comments") posts.push(r.url());
  });
  const box = page.getByLabel("Comment to your friends");
  await box.fill("    ");
  await page.getByRole("button", { name: "Post" }).click();
  await expect(page.getByText("Write something first")).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);

  // 281 characters as the database counts them: an emoji is one.
  await box.fill(`😀${"a".repeat(280)}`);
  await page.getByRole("button", { name: "Post" }).click();
  await expect(page.getByText("280 characters at most")).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(posts).toEqual([]);
});

test("the count shows from 20 characters left, counting an emoji as one, and past the limit says how many too many", async ({ page }) => {
  await ready(page, "uc");
  const box = page.getByLabel("Comment to your friends");
  const count = page.getByText(/ (left|too many)$/);
  await box.fill("a".repeat(259));
  await expect(count).toHaveCount(0);
  await box.fill(`😀${"a".repeat(259)}`);
  await expect(count).toHaveText("20 left");
  await box.fill(`😀${"a".repeat(282)}`);
  await expect(count).toHaveText("3 too many");
  const danger = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--danger)";
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  expect(await count.evaluate((el) => getComputedStyle(el).color)).toBe(danger);
  // 280 exactly posts.
  await box.fill(`😀${"a".repeat(279)}`);
  await expect(count).toHaveText("0 left");
  await page.getByRole("button", { name: "Post" }).click();
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
});

test("signing out sends a held post first, waits for its answer, and signs out once for two taps", async ({ page }) => {
  await ready(page, "us");
  const order: string[] = [];
  // The post's answer is slowed, so a sign-out that didn't wait for it would start first.
  await page.route("**/api/comments", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
    order.push("post answered");
  });
  page.on("request", (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname === "/api/auth/sign-out") order.push("sign-out");
  });
  await page.getByLabel("Comment to your friends").fill("Sent before I go.");
  await page.getByRole("button", { name: "Post" }).click();
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).filter({ visible: true }).click();
  // Two taps at once.
  await page.getByRole("dialog", { name: "Settings" }).getByRole("button", { name: "Sign out" }).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
  expect(order).toEqual(["post answered", "sign-out"]);
  expect(await comments("us")).toEqual(["Sent before I go."]);
});

test("when that send fails, the player stays signed in and chooses", async ({ page }) => {
  await ready(page, "uf");
  await page.route("**/api/comments", (route) => (route.request().method() === "POST" ? route.abort("failed") : route.continue()));
  await page.getByLabel("Comment to your friends").fill("This one won't go.");
  await page.getByRole("button", { name: "Post" }).click();
  await page.getByRole("button", { name: "Settings" }).filter({ visible: true }).click();
  const sheet = page.getByRole("dialog", { name: "Settings" });
  await sheet.getByRole("button", { name: "Sign out" }).click();
  await expect(sheet.getByText("Your post didn't send. Try again, or sign out without it.")).toBeVisible();
  // Still signed in: the sheet still holds the account.
  await expect(sheet.getByRole("button", { name: "Try again" })).toBeVisible();
  await sheet.getByRole("button", { name: "Sign out without it" }).click();
  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
  expect(await comments("uf")).toEqual([]);
});
