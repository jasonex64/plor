// The clock game's screens (docs/milestones/M23-23d-the-screens.md, 23d-1; the server's side is M23-23c's): on a day in format 4, a
// signed-in player and a guest play from Start to the end on one clock: an accepted answer's name, tier, seconds and points
// under the input, "Already said" and "Not on the list" for the rest, Next on questions 1 and 2 and Finish only on question 3,
// the same run after a reload or in a second tab, an end that comes by itself when the clock runs out, and the input and the
// last answer inside the visible area with a phone keyboard open. The day is the fixture's first three questions (src/test/
// answer-fixture.ts, fixtureClockDay): dog and bear are common, cat uncommon, cherry rare.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { GAME } from "../src/platform/game";
import { answerBox } from "./game";
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayClockPuzzle } from "./puzzle";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
let day: { created: string };

test.beforeAll(async () => {
  day = await todayClockPuzzle(DB);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.query("delete from private.guest_run where puzzle_date = $1::date", [day.created]);
  await removePuzzle(DB, day);
  await DB.end();
});

const outcome = (page: Page) => page.getByRole("status", { name: "Last answer" });
const chip = (page: Page, text: string) => page.getByText(text, { exact: true });
const heading = (page: Page, prompt: string) => page.getByRole("heading", { name: prompt, exact: true });

// Types text and presses Enter: the input is emptied and keeps focus.
async function say(page: Page, text: string): Promise<void> {
  await answerBox(page).fill(text);
  await answerBox(page).press("Enter");
  await expect(answerBox(page)).toHaveValue("");
  await expect(answerBox(page)).toBeFocused();
}

// Questions 1 to 3 as the first three tests play them, from the card's Start to the end: 10 + 25 + 50 + 10 points. Leaves
// the end showing. Checks what a player sees along the way.
async function playRun(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(heading(page, "Name an animal")).toBeVisible();
  await expect(chip(page, "Question 1 of 3")).toBeVisible();
  await expect(chip(page, "0 points")).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText(/^\d+ seconds left$/);
  await expect(chip(page, "0 answers")).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish", exact: true })).toHaveCount(0);

  // An accepted answer: its name, tier, the seconds it added and its points; the score moves. The first answer adds
  // its tier's whole time.
  await say(page, "dog");
  await expect(outcome(page)).toHaveText("dogCommon+3 s+10 points");
  await expect(chip(page, "10 points")).toBeVisible();
  await expect(chip(page, "1 answer")).toBeVisible();

  // A repeat, under another name of the same answer: nothing moves, and only this line is shown.
  await say(page, "dogs");
  await expect(outcome(page)).toHaveText("Already said");
  await expect(chip(page, "10 points")).toBeVisible();
  await expect(chip(page, "1 answer")).toBeVisible();

  await say(page, "zzz qqq");
  await expect(outcome(page)).toHaveText("Not on the list");
  await expect(chip(page, "10 points")).toBeVisible();
  await expect(chip(page, "1 answer")).toBeVisible();
  // Never a list of what was said: the first answer is gone from the screen.
  await expect(page.getByText(/dog/i)).toHaveCount(0);

  await say(page, "cat");
  await expect(outcome(page)).toContainText("Uncommon");
  await expect(outcome(page)).toContainText(/\+\d+(\.\d)? s\+25 points$/);
  await expect(chip(page, "35 points")).toBeVisible();
  await expect(chip(page, "2 answers")).toBeVisible();

  // Next opens question 2, with nothing to go back to.
  await page.getByRole("button", { name: "Next question", exact: true }).click();
  await expect(heading(page, "Name a fruit")).toBeVisible();
  await expect(chip(page, "Question 2 of 3")).toBeVisible();
  await expect(chip(page, "0 answers")).toBeVisible();
  await expect(chip(page, "35 points")).toBeVisible();
  await expect(outcome(page)).toHaveText("");
  await expect(page.getByRole("button", { name: /^(back|previous)( question)?$/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Finish", exact: true })).toHaveCount(0);
  await say(page, "cherry");
  await expect(outcome(page)).toContainText("Rare");
  await expect(outcome(page)).toContainText("+50 points");
  await expect(chip(page, "85 points")).toBeVisible();

  // The same run after a reload, and in a second tab: the same question, count and points, from the server.
  await page.reload();
  await expect(heading(page, "Name a fruit")).toBeVisible();
  await expect(chip(page, "1 answer")).toBeVisible();
  await expect(chip(page, "85 points")).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText(/^\d+ seconds left$/);
  const second = await page.context().newPage();
  await second.goto(page.url());
  await expect(heading(second, "Name a fruit")).toBeVisible();
  await expect(chip(second, "1 answer")).toBeVisible();
  await expect(chip(second, "85 points")).toBeVisible();
  await second.close();

  await page.getByRole("button", { name: "Next question", exact: true }).click();
  await expect(heading(page, "Name a color")).toBeVisible();
  await expect(chip(page, "Question 3 of 3")).toBeVisible();
  // Finish only here.
  await expect(page.getByRole("button", { name: "Next question", exact: true })).toHaveCount(0);
  await say(page, "red");
  await expect(chip(page, "95 points")).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();

  // The end: the points, the answers given and how many, each with its tier, and the time to the next puzzle.
  await expect(page.getByText("95 points", { exact: true })).toBeVisible();
  await expect(chip(page, "4 answers")).toBeVisible();
  await expect(answerBox(page)).toHaveCount(0);
  const rows = page.locator("#result").getByRole("listitem");
  await expect(page.locator("#result").getByRole("heading", { name: "Your answers" })).toBeFocused();
  await expect(rows.filter({ hasText: "Name an animal" })).toContainText("2 answers · 35 points");
  await expect(rows.filter({ hasText: "Name an animal" })).toContainText("dogCommon");
  await expect(rows.filter({ hasText: "Name an animal" })).toContainText("catUncommon");
  await expect(rows.filter({ hasText: "Name a fruit" })).toContainText("cherryRare");
  await expect(rows.filter({ hasText: "Name a color" })).toContainText("redCommon");
  await expect(page.getByRole("timer")).toContainText("Next puzzle in");

  // A reload after the end shows the same end.
  await page.reload();
  await expect(page.getByText("95 points", { exact: true })).toBeVisible();
  await expect(chip(page, "4 answers")).toBeVisible();
}

test("a signed-in player plays a run on a clock from Start to the end", { tag: "@visual" }, async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "ck1");
  await page.goto(GAME.path);
  // Before the run: today's one card, the rules in three lines, Start and How to play, with no number typed into them.
  await expect(page.getByRole("heading", { name: GAME.name, exact: true })).toBeVisible();
  await expect(page.getByText("3 questions, one clock.")).toBeVisible();
  await expect(page.getByText("Every answer adds time.")).toBeVisible();
  await expect(page.getByText("Rarer answers add more time and more points.")).toBeVisible();
  await expect(page.getByRole("button", { name: "How to play" })).toBeVisible();
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog", { name: "How to play" })).toContainText("One clock runs for the whole run.");
  await page.getByRole("button", { name: "Close", exact: true }).first().click();
  await playRun(page);
});

test("a guest plays a run on a clock from Start to the end", { tag: "@visual" }, async ({ page }) => {
  await page.goto("/");
  // The front page's card for the game, a clock day's too (M20 20n-7).
  await page.getByRole("region", { name: GAME.name, exact: true }).getByRole("link", { name: "Play without an account", exact: true }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByText("3 questions, one clock.")).toBeVisible();
  await playRun(page);
  // A guest's end has the peek at what an account adds, as the other games' have.
  await expect(page.getByRole("link", { name: "Make an account", exact: true })).toBeVisible();
});

// The run's start moved back in the database, so its clock has seconds left rather than twenty: the end comes by itself.
test("a run whose clock reaches zero shows its end without a tap", { tag: "@visual" }, async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "ck2");
  await page.goto(GAME.path);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await say(page, "dog");
  await expect(chip(page, "10 points")).toBeVisible();
  // The clock's 20 seconds and the 3 the answer added are private.clock_start_ms and clock_added_ms: 15 seconds back leaves
  // 8 less the time since, so the page loads a run still in play and the end comes from its own count reaching zero.
  await DB.query("update private.run set started_at = started_at - interval '15 seconds' where user_id = (select id from auth.users where email = $1)", [
    `${RUN}-ck2@example.test`,
  ]);
  await page.reload();
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(answerBox(page)).toBeVisible();
  // No tap, no reload: the count reaches zero, the page asks the server, and the end shows.
  await expect(page.getByRole("heading", { name: "Your answers", exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("10 points", { exact: true })).toBeVisible();
  await expect(chip(page, "1 answer")).toBeVisible();
  await expect(answerBox(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next question", exact: true })).toHaveCount(0);
});

// A phone's keyboard covers the bottom of the screen, so the window is shortened as it would be with one open: the input and
// the last answer, both near the top of the play screen, are still inside the visible area.
test("with a phone keyboard open, the input and the last answer are inside the visible area", { tag: "@visual" }, async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "ck3");
  await page.goto(GAME.path);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(heading(page, "Name an animal")).toBeVisible();
  // 390 wide and about 500 high: a phone's 844 less a keyboard's height.
  await page.setViewportSize({ width: 390, height: 500 });
  for (const text of ["dog", "dogs", "zzz qqq"]) {
    await say(page, text);
    const visible = await page.evaluate(() => window.visualViewport!.height);
    for (const [name, locator] of [
      ["the input", answerBox(page)],
      ["the last answer", outcome(page)],
    ] as const) {
      const box = (await locator.boundingBox())!;
      expect(box.y, `${name} after ${text}`).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height, `${name} after ${text}`).toBeLessThanOrEqual(visible);
    }
  }
});
