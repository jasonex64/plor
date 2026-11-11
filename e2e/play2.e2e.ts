// Game 2's plain round at /play2 (docs/milestones/M16-16d-playing-it.md, 16d-2; docs/milestones/M14-14c-9-plain-game-2.md),
// on a day and words of this test's own, as the real list isn't in git: a whole day (a word, each refusal, a lockout, a
// time-up, Next, round 7's sentence and See results, the cards), the play frame at a phone's size and a desktop's with the
// way out, and the countdown's number and bar. Clocks that would take 20 seconds are run out in the database.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { GAME, SUBSTRINGS } from "../src/platform/game";
import { countdown, expectCountdown, fillScale } from "./game";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
// A friend's finished run is written with the round rules off, which needs the local superuser.
const ADMIN = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
// The ticket's two sizes (docs/milestones/M14-14c-8-plain-game-1.md, Numbers).
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };
const ROUNDS = ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"];
const WORDS = ["aqkb", "aqkqmb", "aqmb", "aqmjb", "aqyzb", "aqyzc", "aqyzd"];
let today = "";

const game = (page: Page) => page.getByRole("region", { name: SUBSTRINGS.name, exact: true });
const next = (page: Page) => game(page).getByRole("button", { name: "Next", exact: true });
const seeResults = (page: Page) => game(page).getByRole("button", { name: "See results", exact: true });
const tabs = (page: Page) => page.getByRole("navigation", { name: "Main" });
const wayOut = (page: Page) => page.getByRole("button", { name: "Back to Today" });
// What a screen reader is told: the page's status messages that have text.
const said = (page: Page) => page.getByRole("status").filter({ hasText: /\S/ });
// A round's sentence as the eye sees it (the same words are also the status message, which is for screen readers).
const sentence = (page: Page, text: string) => game(page).locator("p:not([role='status'])", { hasText: text });
// The running score in the top row.
const score = (page: Page) => game(page).locator("p:has(small) b");
const scoreNow = async (page: Page) => Number(await score(page).textContent());
// Focus is on the control the moment its sentence shows, with no wait (criterion 2).
const focused = (page: Page, name: string) =>
  page.evaluate((expected) => (document.activeElement as HTMLElement | null)?.textContent === expected, name);

const runOut = async () => {
  await DB.query("update private.run set started_at = started_at - interval '21 seconds' where game_id = 'substrings'");
  await DB.query("update private.question_open set opened_at = opened_at - interval '21 seconds' where game_id = 'substrings'");
};

test.beforeAll(async () => {
  today = (await DB.query<{ d: string }>("select private.today()::text as d")).rows[0].d;
  await DB.query("insert into private.dictionary_word (word_key, spelling, plain, everyday) select w, w, w, true from unnest($1::text[]) as w on conflict do nothing", [WORDS]);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.query("delete from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [today]);
  await DB.query("delete from private.dictionary_word where word_key = any($1)", [WORDS]);
  await DB.end();
  await ADMIN.end();
});

test("a signed-out visit shows sign-in", async ({ page }) => {
  await page.goto("/play2");
  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
});

test("a day with no puzzle says so", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "pn");
  await page.goto("/play2");
  await expect(page.getByRole("heading", { name: SUBSTRINGS.name, exact: true })).toBeVisible();
  await expect(page.getByText("There's no puzzle today.")).toBeVisible();
});

// Each test that plays adds the day itself, as a retry runs in a new worker, whose cleanup took it away.
const addDay = () =>
  DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('substrings', $1::date, $2) on conflict do nothing", [today, { format: 1, game_id: "substrings", date: today, rounds: ROUNDS, bonus_letter: "j" }]);

// The play frame (docs/milestones/M14-14c-8-plain-game-1.md, as game 1's play.e2e.ts): before Start the shell's bars are
// there and the × isn't; from Start the bars are gone and the × shows, through a word's sentence; the × leaves for Today,
// where the bars are back. Start works as soon as the page does (criterion 3), the box has focus at Start, and Next has
// focus the moment a word's sentence shows (criterion 2).
for (const [size, viewport] of [["a phone", PHONE], ["a desktop", DESKTOP]] as const) {
  test(`on ${size} the round is full screen from Start, with the × showing and the way out leading to Today`, async ({ page }) => {
    await addDay();
    await page.setViewportSize(viewport);
    await page.goto("/");
    await signInAndPick(page, `pf${viewport.width}`);
    await page.goto("/play2");
    const bars = [tabs(page), page.getByRole("banner")];
    const start = game(page).getByRole("button", { name: "Start", exact: true });
    await expect(start).toBeEnabled();
    // Nothing is still loading by then: Start is the page's own, with no second wait behind it.
    await expect(page.getByText(/loading/i)).toHaveCount(0);
    await expect(tabs(page)).toBeVisible();
    await expect(wayOut(page)).toHaveCount(0);

    await start.click();
    const box = page.getByLabel("Your word");
    await expect(box).toBeFocused();
    for (const bar of bars) await expect(bar).toBeHidden();
    await expect(wayOut(page)).toBeVisible();
    await expect(page.getByText("Round 1 of 7")).toBeVisible();
    await expect(score(page)).toHaveText("0");
    // The label stands over the number, not beside it (substrings.module.css, .topScore).
    const label = (await game(page).getByText("Score", { exact: true }).boundingBox())!;
    const number = (await score(page).boundingBox())!;
    // The number is inline, its box taller than its line, so its middle is compared, not its top.
    expect(number.y + number.height / 2).toBeGreaterThanOrEqual(label.y + label.height - 0.5);

    await box.fill("aqkqmb");
    await box.press("Enter");
    await expect(sentence(page, "You played aqkqmb: 40 points.")).toBeVisible();
    expect(await focused(page, "Next")).toBe(true);
    for (const bar of bars) await expect(bar).toBeHidden();
    await expect(wayOut(page)).toBeVisible();

    // The × leaves for Today with the run waiting at its sentence; the game screen opens on it again, in the frame.
    await wayOut(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(tabs(page)).toBeVisible();
    await expect(wayOut(page)).toBeHidden();
    await page.goto("/play2");
    await expect(next(page)).toBeFocused();
    await expect(tabs(page)).toBeHidden();
    await expect(wayOut(page)).toBeVisible();
  });
}

test("a whole day: a word, each reason, a lockout, a timeout, Next, round 7's sentence and the results", async ({ page }) => {
  await addDay();
  await page.goto("/");
  await signInAndPick(page, "pl");
  await page.goto("/play2");
  await page.getByRole("button", { name: "Start" }).click();

  const box = page.getByLabel("Your word");
  const reason = game(page).getByRole("status");
  await expect(page.getByText("qk", { exact: true })).toBeVisible();
  await expect(page.getByText("Round 1 of 7")).toBeVisible();
  await expect(page.getByText("Bonus letter j")).toBeVisible();
  await expect(page.getByText("Letters used: 0 of 26")).toBeVisible();
  // The countdown: the number as the timer's text with the bar beside it draining, for the eye only (criterion 5).
  await expectCountdown(page);
  const full = await fillScale(page);
  await expect.poll(() => fillScale(page)).toBeLessThan(full);
  expect(await scoreNow(page)).toBe(0);

  // A second Enter on the way doesn't hide the reason behind the lockout's.
  await box.fill("zzzqqqzz");
  await box.evaluate((input: HTMLInputElement) => {
    input.form!.requestSubmit();
    input.form!.requestSubmit();
  });
  await expect(reason).toHaveText("Not in the dictionary.");
  await expect(box).toHaveValue("");
  // Within the lockout the box stays usable, and a try is refused unjudged.
  await box.fill("aqkb");
  await expect(box).toBeEnabled();
  await box.press("Enter");
  await expect(reason).toHaveText("Too quick. Try again in a moment.");
  await expect(box).toHaveValue("");
  await page.waitForTimeout(600);
  await box.fill("aqmb");
  await box.press("Enter");
  await expect(reason).toHaveText("Needs the letters qk.");
  await expect(box).toHaveValue("");
  await page.waitForTimeout(600);
  // Letters typed while a refusal is on its way are the next word, and stay.
  let answer = () => {};
  const answered = new Promise<void>((resolve) => (answer = resolve));
  await page.route("**/api/substrings/try", async (route) => {
    await answered;
    await route.continue();
  });
  await box.fill("zzzqqqzz");
  await box.press("Enter");
  await box.fill("aq");
  answer();
  await expect(reason).toHaveText("Not in the dictionary.");
  await expect(box).toHaveValue("aq");
  await page.unroute("**/api/substrings/try");
  await page.waitForTimeout(600);
  // What doesn't register clears too, and costs no lockout, as the word after it shows.
  for (const nothing of ["123", "  "]) {
    await box.fill(nothing);
    await box.press("Enter");
    await expect(box).toHaveValue("");
  }
  await box.fill("aqkqmb");
  await box.press("Enter");

  // Between rounds there's no clock and no letters yet, and Next has the focus at once, so Enter goes on. The word's points
  // show, and the tracker has its letters (M16 16e, answer 20). One status message says the sentence, once.
  await expect(sentence(page, "You played aqkqmb: 40 points.")).toBeVisible();
  expect(await focused(page, "Next")).toBe(true);
  await expect(said(page)).toHaveText(["You played aqkqmb: 40 points."]);
  await expect(page.getByText("Round 1 of 7")).toBeVisible();
  await expect(page.getByText("Letters used: 5 of 26")).toBeVisible();
  // The row of letters marks just those: a marked letter is the only one with a class.
  const marked = game(page).locator('p[aria-hidden="true"] span[class]');
  await expect(marked).toHaveText(["a", "b", "k", "m", "q"]);
  await expect(countdown(page).timer).toBeHidden();
  await expect(page.getByText("qm", { exact: true })).toBeHidden();
  // The running score is the server's total so far, with the letters cashed in as they stand.
  const afterOne = await scoreNow(page);
  expect(afterOne).toBeGreaterThanOrEqual(40);
  await page.keyboard.press("Enter");
  await expect(page.getByText("qm", { exact: true })).toBeVisible();
  await expect(page.getByText("Round 2 of 7")).toBeVisible();
  expect(await scoreNow(page)).toBe(afterOne);

  await box.fill("aqkqmb");
  await box.press("Enter");
  await expect(reason).toHaveText("Already used.");
  await expect(box).toHaveValue("");
  await page.waitForTimeout(600);
  // A word holding the bonus letter earns its points too, once.
  await box.fill("aqmjb");
  await box.press("Enter");
  await expect(sentence(page, "You played aqmjb: 30 points, and 120 for the bonus letter.")).toBeVisible();
  await expect(page.getByText("Letters used: 6 of 26")).toBeVisible();
  await expect(marked).toHaveText(["a", "b", "j", "k", "m", "q"]);
  expect(await scoreNow(page)).toBeGreaterThanOrEqual(afterOne + 30 + 120);
  await next(page).click();
  await expect(page.getByText("qnp", { exact: true })).toBeVisible();

  // A try past the clock moves the screen on, as the server says; Next has focus at once here too.
  await runOut();
  await box.fill("aqmb");
  await box.press("Enter");
  await expect(sentence(page, "Time's up.")).toBeVisible();
  expect(await focused(page, "Next")).toBe(true);
  await next(page).click();
  await expect(page.getByText("qrs", { exact: true })).toBeVisible();

  // So does the clock reaching zero, with no reload. Six seconds are left, as the reload has to land inside them.
  await DB.query("update private.question_open set opened_at = opened_at - interval '14 seconds' where game_id = 'substrings' and question_idx = 3");
  await page.reload();
  await expect(page.getByText("qrs", { exact: true })).toBeVisible();
  // The six seconds left, past Playwright's own five.
  await expect(sentence(page, "Time's up.")).toBeVisible({ timeout: 10_000 });
  expect(await focused(page, "Next")).toBe(true);
  await next(page).click();
  await expect(page.getByText("qtv", { exact: true })).toBeVisible();

  // The next two run out, reloaded.
  for (let i = 4; i < 6; i++) {
    await runOut();
    await page.reload();
    await expect(sentence(page, "Time's up.")).toBeVisible();
    await next(page).click();
    await expect(page.getByText(ROUNDS[i + 1], { exact: true })).toBeVisible();
  }
  // A friend has finished today with no word, so the end ranks the run among friends (M16 16e-2).
  const client = await ADMIN.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    const friend = (await client.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [`${RUN}-plf@example.test`])).rows[0].id;
    await client.query("insert into private.friendship (user_a, user_b) select least($1::uuid, id), greatest($1::uuid, id) from auth.users where email = $2", [friend, `${RUN}-pl@example.test`]);
    await client.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'substrings', $2::date, now() - interval '1 hour')", [friend, today]);
    await client.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx, opened_at) values ($1, 'substrings', $2::date, 6, now() - interval '1 hour')", [friend, today]);
    await client.query("commit");
  } finally {
    client.release();
  }
  // Round 7 ends the run, and its sentence shows with See results in place of Next (answer 9); the frame stays up.
  await expect(page.getByText("Round 7 of 7")).toBeVisible();
  await runOut();
  await box.fill("aqyzb");
  await box.press("Enter");
  await expect(sentence(page, "Time's up.")).toBeVisible();
  await expect(page.getByText("Round 7 of 7")).toBeVisible();
  await expect(said(page)).toHaveText(["Time's up."]);
  expect(await focused(page, "See results")).toBe(true);
  await expect(next(page)).toHaveCount(0);
  await expect(page.locator("body[data-game]")).toHaveCount(1);
  await expect(wayOut(page)).toBeVisible();
  // The score at the last sentence is the final total, which the cards show.
  expect(await scoreNow(page)).toBe(255);
  await expect(page.getByRole("list", { name: "Your rounds" })).toHaveCount(0);

  // See results: the frame goes and the cards' heading takes the focus its button had (WCAG 2.2 2.4.3).
  await seeResults(page).click();
  await expect(page.getByRole("heading", { name: "Your score" })).toBeFocused();
  await expect(page.locator("body[data-game]")).toHaveCount(0);
  await expect(tabs(page)).toBeVisible();
  await expect(wayOut(page)).toHaveCount(0);
  await expect(page.getByText("1st of 2 with your friends so far today.")).toBeVisible();

  const results = page.getByRole("list", { name: "Your rounds" });
  await expect(results.getByRole("listitem")).toHaveCount(7);
  await expect(results.getByRole("listitem").first()).toContainText("aqkqmb, 40 points");
  await expect(results.getByRole("listitem").nth(1)).toContainText("aqmjb, 30 points, and 120 for the bonus letter");
  await expect(results.getByRole("listitem").last()).toContainText("aqyzb, aqyzc, aqyzd");
  // The score: two words, one with the bonus letter, and six different letters cashed in.
  await expect(page.getByRole("definition")).toHaveText(["70", "120", "65", "255"]);
  await expect(page.getByText("Bonus letter j, in 1 word")).toBeVisible();
  await expect(page.getByText("Different letters, 6 of 26")).toBeVisible();

  // A page opened on a finished run never saw it in play: the cards, with no frame and no See results.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your score" })).toBeVisible();
  await expect(seeResults(page)).toHaveCount(0);
  await expect(page.locator("body[data-game]")).toHaveCount(0);
});

test("a tab left between rounds finds the day it's in, and a real failure says so", async ({ page }) => {
  await addDay();
  await page.goto("/");
  await signInAndPick(page, "pm");
  await page.goto("/play2");
  await page.getByRole("button", { name: "Start" }).click();
  const box = page.getByLabel("Your word");
  await box.fill("aqkb");
  await box.press("Enter");
  await expect(next(page)).toBeVisible();
  // The server failing isn't the screen being behind: it's said, and the player can try again.
  await page.route("**/api/substrings/next", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, error: "internal" }) }));
  await next(page).click();
  await expect(game(page).getByRole("alert")).toBeVisible();
  await expect(next(page)).toBeVisible();
  await page.unroute("**/api/substrings/next");
  // As a new day leaves it: the run this screen shows isn't today's any more.
  await DB.query("delete from private.run where game_id = 'substrings' and user_id = (select id from auth.users where email = $1)", [`${RUN}-pm@example.test`]);
  await next(page).click();
  await expect(game(page).getByRole("button", { name: "Start" })).toBeVisible();
});

test("game 1 stays as it was", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "pg");
  await expect(page.getByRole("heading", { name: "Plor, Today" })).toBeVisible();
  await expect(page.getByRole("region", { name: GAME.name })).toBeVisible();
  await expect(page.getByRole("region", { name: SUBSTRINGS.name, exact: true })).toHaveCount(0);
});

// The Friends page's leaderboard switches between the games (M16 16e-2, answers 23 and 24), and game 2's adds up places.
test("the friends leaderboard switches to game 2", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "qb");
  await page.goto("/friends");
  const board = page.getByRole("region", { name: "Friends leaderboard" });
  const games = board.getByRole("radiogroup", { name: "Game" });
  await expect(games.getByRole("radio", { name: GAME.name })).toBeChecked();
  await expect(board.getByText("Each day adds the % of players you beat.")).toHaveCount(0);
  await games.getByText(SUBSTRINGS.name).click();
  await expect(games.getByRole("radio", { name: SUBSTRINGS.name })).toBeChecked();
  await expect(board.getByText("Each day adds the % of players you beat.")).toBeVisible();
  // A new player's week: their own row, a plain 0, as places aren't points.
  await expect(board.getByRole("region", { name: "This week" }).getByRole("listitem").first()).toContainText("(you)");
  await expect(board.getByRole("region", { name: "This week" }).getByRole("listitem").first()).not.toContainText("points");
});
