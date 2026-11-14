// A visitor plays game 1 or game 2 with no account (docs/milestones/M18-guest-play.md, 18c to 18e): "Play Game 1 without an account" (or 2) on the front page,
// Start with Cloudflare's always-pass test keys (CI's .env.local, .github/workflows/e2e.yml), the run through the guest routes to
// a catch (game 1) or through the seven rounds (game 2), its result with the peek at what an account adds (and Share, game 1),
// and none of the account screens. A signed-in player still plays through /api/run and sees no peek; a guest who makes an
// account the same day starts clean and plays today's game for points (answer 14). The front page's sign-in is a small link
// that opens the form at /?sign-in (answers 32 and 33). Game 2's day and words are this file's own, as the real list isn't in
// git (as play2.e2e.ts).
import { expect, test, type Locator, type Page } from "@playwright/test";
import { Pool } from "pg";
import { answer, asked, caught, next, safe, seeResults } from "./game";
import { play, RUN, signInAndPick } from "./players";
import { SUBSTRINGS } from "../src/platform/game";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const ROUNDS = ["xk", "xm", "xn", "xp", "xr", "xs", "xt"];
const WORDS = ["axkb", "axmb"];
let puzzle: TodayPuzzle;
let today = "";

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
  today = (await DB.query<{ d: string }>("select private.today()::text as d")).rows[0].d;
  await DB.query("insert into private.dictionary_word (word_key, spelling, plain, everyday) select w, w, w, true from unnest($1::text[]) as w on conflict do nothing", [WORDS]);
  await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('substrings', $1::date, $2) on conflict do nothing", [today, { format: 1, game_id: "substrings", date: today, rounds: ROUNDS, bonus_letter: "j" }]);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  // What a guest left on the fixture days: a run that is still going, which references its puzzle, and the tally, which has no
  // foreign key.
  await DB.query("delete from private.guest_run where puzzle_date = $1::date", [today]);
  await DB.query("delete from private.guest_tally where puzzle_date = $1::date", [today]);
  await DB.query("delete from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [today]);
  await DB.query("delete from private.dictionary_word where word_key = any($1)", [WORDS]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

// The peek under a guest's result (src/app/guest-peek.tsx): the words name the region, the link goes where every Sign in
// goes (answer 33), and the drawn stand-in, blurred, is hidden from screen readers (answer 15).
const PEEK = "Make an account to keep your streak, see your friends and play today's game for points";
const peek = (page: Page) => page.getByRole("region", { name: PEEK, exact: true });
async function expectPeek(region: Locator): Promise<void> {
  await expect(region).toBeVisible();
  await expect(region.getByRole("link")).toHaveCount(1);
  const link = region.getByRole("link", { name: "Make an account", exact: true });
  await expect(link).toHaveAttribute("href", "/?sign-in");
  // The words' card sits over the stand-in: a press on the link reaches it, not the drawing.
  await link.click({ trial: true });
  const standIn = region.locator(":scope > [aria-hidden='true']");
  await expect(standIn).toHaveCount(1);
  // The blur is the CSS's 4px (src/app/guest-peek.module.css, .standIn).
  expect(await standIn.evaluate((el) => getComputedStyle(el).filter)).toBe("blur(4px)");
}

test("a visitor plays game 1 as a guest from the front page, through the guest routes only, to the result with Share and the peek", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(new URL(request.url()).pathname);
  });

  await page.goto("/");
  // Play first, sign in second: a small link, not the form (answer 32).
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/?sign-in");
  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toHaveCount(0);
  await page.getByRole("link", { name: "Play Game 1 without an account", exact: true }).click();
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

  // The result, with Share and the peek under it (answer 2); it stays until the day ends (M19 answers 3 and 10).
  await seeResults(page).click();
  await expect(page.locator("#result")).toContainText("You survived 3 of 7 questions");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\nhttp:\/\/localhost:3000\/$/);
  await expectPeek(peek(page));

  expect(posts).toEqual(expect.arrayContaining(["/api/guest/run/start", "/api/guest/run/answer", "/api/guest/run/next"]));
  expect(posts.filter((path) => path.startsWith("/api/run"))).toEqual([]);
  for (const name of ["Friends", "Groups", "Me", "Settings"]) await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
  await expect(page.getByText("Comments", { exact: true })).toHaveCount(0);
});

const runOut = async () => {
  await DB.query("update private.guest_run set started_at = started_at - interval '21 seconds' where game_id = 'substrings'");
  await DB.query("update private.guest_question_open set opened_at = opened_at - interval '21 seconds' where game_id = 'substrings'");
};
const game2 = (page: Page) => page.getByRole("region", { name: SUBSTRINGS.name, exact: true });

test("a visitor plays game 2 as a guest from the front page, through the guest routes only, to the score and the peek", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(new URL(request.url()).pathname);
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Play Game 2 without an account", exact: true }).click();
  await expect(page).toHaveURL(/\/play2$/);
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Start", exact: true }).click();
  const box = page.getByLabel("Your word");
  await expect(page.getByText("xk", { exact: true })).toBeVisible();
  await box.fill("axkb");
  await box.press("Enter");
  // The sentence as the eye sees it; the same words are also the status message (as e2e/play2.e2e.ts's `sentence`).
  await expect(game2(page).locator("p:not([role='status'])", { hasText: "You played axkb: 25 points." })).toBeVisible();
  await game2(page).getByRole("button", { name: "Next", exact: true }).click();

  // Rounds 2 to 7 run out in the database, and the next try finds it.
  for (let round = 2; round <= 7; round++) {
    await expect(page.getByText(`Round ${round} of 7`)).toBeVisible();
    await runOut();
    await box.fill("axmb");
    await box.press("Enter");
    await expect(game2(page).getByText("Time's up.").first()).toBeVisible();
    if (round < 7) await game2(page).getByRole("button", { name: "Next", exact: true }).click();
  }
  await game2(page).getByRole("button", { name: "See results", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your score", exact: true })).toBeVisible();
  // The peek under the score, and no Share: game 2 has none for anyone (src/app/substrings.tsx).
  await expectPeek(peek(page));
  await expect(page.getByRole("button", { name: "Share", exact: true })).toHaveCount(0);

  expect(posts).toEqual(expect.arrayContaining(["/api/guest/substrings/start", "/api/guest/substrings/try", "/api/guest/substrings/next"]));
  expect(posts.filter((path) => path.startsWith("/api/substrings") || path.startsWith("/api/run"))).toEqual([]);
  for (const name of ["Friends", "Groups", "Me", "Settings"]) await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
  await expect(page.getByText("Comments", { exact: true })).toHaveCount(0);
});

test("a signed-in player still plays through /api/run, and their result has Share and no peek", async ({ browser }) => {
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
  await next(page, "Name a fruit");
  // The fixture host's fruit (src/test/answer-fixture.ts).
  await caught(page, "apple");
  await seeResults(page).click();
  await expect(page.locator("#result")).toContainText("You survived 1 of 7 questions");
  await expect(page.getByRole("button", { name: "Share", exact: true })).toBeVisible();
  await expect(peek(page)).toHaveCount(0);
  expect(posts).toEqual(expect.arrayContaining(["/api/run/start", "/api/run/answer"]));
  expect(posts.filter((path) => path.startsWith("/api/guest"))).toEqual([]);
});

// Me's totals (as e2e/me.e2e.ts reads them).
const total = (page: Page, region: string, label: string) =>
  page.getByRole("region", { name: region, exact: true }).locator("div", { has: page.getByText(label, { exact: true }) }).locator("dd");

// Answers 9 and 14: nothing of a guest run carries into the account (the run itself waits for the day's purge), so the new account starts clean, and it may still play today's game for
// points, which then count as any player's run does.
test("a guest who makes an account the same day starts clean and plays today's game for points", async ({ browser }) => {
  // Two runs and a sign-in: 25.6 s of the default 30 s on a warm local dev server (2026-11-12).
  test.slow();
  const page = await (await browser.newContext()).newPage();
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(new URL(request.url()).pathname);
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Play Game 1 without an account", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await asked(page, "Name an animal");
  await safe(page, "aardvark");
  await next(page, "Name a fruit");
  await caught(page, "apple");
  await seeResults(page).click();
  await expect(page.locator("#result")).toContainText(/You survived 1 of 7 questions and scored [1-9]/);

  await peek(page).getByRole("link", { name: "Make an account", exact: true }).click();
  await expect(page).toHaveURL(/\/\?sign-in$/);
  await signInAndPick(page, "gnew");

  // Clean: no streak and no totals from the guest run.
  await expect(page.getByRole("link", { name: "0 day streak, Seed" }).first()).toBeVisible();
  await page.goto("/me");
  for (const label of ["points all time", "days played", "day streak now", "longest streak"]) await expect(total(page, "All games", label)).toHaveText("0");

  // Today's game, for points, through the player's routes.
  await page.goto("/");
  await play(page);
  await asked(page, "Name an animal");
  await safe(page, "aardvark");
  await next(page, "Name a fruit");
  await caught(page, "apple");
  await seeResults(page).click();
  await expect(page.locator("#result")).toContainText(/You survived 1 of 7 questions and scored [1-9]/);
  await expect(peek(page)).toHaveCount(0);
  expect(posts).toEqual(expect.arrayContaining(["/api/run/start", "/api/run/answer"]));
  // It counts as a player's run does (as e2e/me.e2e.ts reads a finished run). Me's points all time add a day only once it
  // has closed (src/game/me.ts, allTimePoints), so today's points are the result's.
  await page.goto("/me");
  await expect(total(page, "All games", "days played")).toHaveText("1");
  await expect(total(page, "All games", "day streak now")).toHaveText("1");
});

test("the front page shows the sign-in form only at /?sign-in", async ({ page }) => {
  await page.goto("/?sign-in");
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Play Game 1 without an account", exact: true })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toHaveCount(0);
});
