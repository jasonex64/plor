// A visitor plays game 1 or game 2 with no account (docs/milestones/M18-guest-play.md, 18c and 18d): "Play Game 1 without an account" (or 2) on the front page,
// Start with Cloudflare's always-pass test keys (CI's .env.local, .github/workflows/e2e.yml), the run through the guest routes to
// a catch (game 1) or through the seven rounds (game 2), and none of the account screens. The result's peek and share are 18e's,
// so game 1 ends at the recap and game 2 at its score. A signed-in player still plays through /api/run. Game 2's day and words
// are this file's own, as the real list isn't in git (as play2.e2e.ts).
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { answer, asked, caught, next, safe } from "./game";
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

test("a visitor plays game 1 as a guest from the front page, through the guest routes only", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(new URL(request.url()).pathname);
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
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

test("a visitor plays game 2 as a guest from the front page, through the guest routes only", async ({ page }) => {
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
  await expect(game2(page).getByText("You played axkb: 25 points.")).toBeVisible();
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

  expect(posts).toEqual(expect.arrayContaining(["/api/guest/substrings/start", "/api/guest/substrings/try", "/api/guest/substrings/next"]));
  expect(posts.filter((path) => path.startsWith("/api/substrings") || path.startsWith("/api/run"))).toEqual([]);
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
