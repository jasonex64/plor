// A visitor plays game 1 with no account (docs/milestones/M18-guest-play.md, 18c): "Play without an account" on the front page,
// Start with Cloudflare's always-pass test keys (CI's .env.local, .github/workflows/e2e.yml), the run through the guest routes to
// a catch, and none of the account screens. The result's peek and share are 18e's, so this ends at the recap. A signed-in player
// still plays through /api/run.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { answer, asked, caught, next, safe } from "./game";
import { play, RUN, signInAndPick } from "./players";
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

test("a visitor plays game 1 as a guest from the front page, through the guest routes only", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(new URL(request.url()).pathname);
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
  await page.getByRole("link", { name: "Play without an account", exact: true }).click();
  await expect(page).toHaveURL(/\/play$/);

  // Nothing of an account is on the screen: no shell navigation, and a way to sign in instead.
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Start", exact: true }).click();
  await asked(page, "Name an animal");
  await safe(page, "aardvark");
  await next(page, "Name a fruit");
  await safe(page, "kiwi");
  await next(page, "Name a color");
  await safe(page, "blue");
  await next(page, "Name a country");
  await caught(page, "italy");
  await expect(page.getByRole("heading", { name: "Caught on question 4", exact: true })).toBeVisible();

  expect(posts).toEqual(expect.arrayContaining(["/api/guest/run/start", "/api/guest/run/answer", "/api/guest/run/next"]));
  expect(posts.filter((path) => path.startsWith("/api/run"))).toEqual([]);
  for (const name of ["Friends", "Groups", "Me", "Settings"]) await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
  await expect(page.getByText("Comments", { exact: true })).toHaveCount(0);
});

test("a signed-in player still plays through /api/run", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(new URL(request.url()).pathname);
  });
  await page.goto("/");
  await signInAndPick(page, "gsigned");
  await play(page);
  await asked(page, "Name an animal");
  await answer(page, "aardvark");
  await expect(page.getByRole("heading", { name: "Safe!", exact: true })).toBeVisible();
  expect(posts).toEqual(expect.arrayContaining(["/api/run/start", "/api/run/answer"]));
  expect(posts.filter((path) => path.startsWith("/api/guest"))).toEqual([]);
});
