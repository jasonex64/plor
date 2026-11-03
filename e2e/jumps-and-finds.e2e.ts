// 14b-23, small jumps and finds (docs/milestones/M14-14b-23-small-jumps-and-finds.md): the result comes into view when
// Result is tapped and not again by itself (answer 2), and a time-up on the Friends tab reloads the board alone
// (answer 7). The question's 20 seconds run out for real: with a faked clock the server, which reads the real one,
// can put the countdown back (the time-up flake in ROADMAP For M14). Find a player, the board's rows, the run's
// line and Undo are checked in the files that already build their scenes (leaderboard-graph, live-board,
// screen-readers).
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, signInAndPick } from "./players";
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

const tab = (page: Page, name: string) => page.getByRole("navigation", { name: "Main" }).getByRole("link", { name });

// Signed in on Today: starts question 1, then goes to the Friends tab, where its clock bar counts down.
async function inPlayOnFriends(page: Page) {
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await tab(page, "Friends").click();
  await expect(page.getByRole("region", { name: "Friends leaderboard" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

// The question's 20 seconds, run out on the clock bar.
const timedOut = (page: Page) =>
  expect(page.getByRole("region", { name: "Question in play" }).getByRole("status")).toHaveText("Time's up on question 1", { timeout: 30_000 });

test("the result comes into view when Result is tapped, and not again by itself (answer 2)", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  test.slow();
  await page.goto("/");
  await signInAndPick(page, "zr");
  await inPlayOnFriends(page);
  await timedOut(page);
  await page.getByRole("region", { name: "Question in play" }).getByRole("link", { name: "Result" }).click();
  const result = page.locator("#result");
  await expect(result).toBeInViewport();
  await expect(page).toHaveURL(/\/play$/);

  // Scrolled back up, away and back: the game page shown again stays where it was.
  await page.evaluate(() => window.scrollTo(0, 0));
  await tab(page, "Friends").click();
  await expect(page).toHaveURL(/\/friends$/);
  await page.goBack();
  await expect(result).toBeVisible();
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  // The game screen's own Result, with the result drawn under it: into view, and still no #result (Next's link would
  // otherwise add it, and Back would bring the jump back).
  await page.getByRole("main").getByRole("link", { name: "Result" }).click();
  await expect(result).toBeInViewport();
  await expect(page).toHaveURL(/\/play$/);
});

test("a time-up on the Friends tab reloads the board alone (answer 7)", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  test.slow();
  await page.goto("/");
  await signInAndPick(page, "zt");
  await inPlayOnFriends(page);
  // The parts that stay: marked, so a remount (a new node) shows.
  const kept = [page.getByRole("region", { name: "Friends leaderboard" }), page.getByRole("region", { name: "Your friends" })];
  for (const part of kept) await part.evaluate((el) => el.setAttribute("data-kept", ""));
  const asked: string[] = [];
  page.on("request", (r) => void asked.push(new URL(r.url()).pathname));
  const board = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/board");

  await timedOut(page);
  await board;
  await page.waitForLoadState("networkidle");
  expect(asked.filter((path) => path.startsWith("/api/leaderboard") || path.startsWith("/api/friends"))).toEqual([]);
  for (const part of kept) await expect(part).toHaveAttribute("data-kept");
});
