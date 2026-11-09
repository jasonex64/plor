// Afterglow plays the day's run (docs/milestones/M14-14c-6-afterglow-in-play.md, 14c-6b-1; surviving all seven, Q7's
// ending list included, is approve-and-play.e2e.ts's): a whole day with each rarity, off-list text, a taken letter, reloads, Next after the walk, a dud's ending list and the cards; a fuse out;
// full screen and its way out at a phone's size and a desktop's; and a run that is over opening on the cards.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { AFTERGLOW } from "../src/config/tunables";
import { WORD_INK } from "../src/afterglow/scene";
import { GAME } from "../src/platform/game";
import { play, RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { answerBox, asked, box, caught, lightIt, safe, seeResults, skyResult, walkOn, WALK_MS } from "./afterglow";

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

// The ticket's two sizes (criterion 5): a phone's and a desktop's.
const PHONE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };

async function player(browser: Browser, name: string, viewport = PHONE) {
  const page = await (await browser.newContext({ viewport })).newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  return page;
}

// A hex colour as getComputedStyle gives it.
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;
const colour = (page: Page, name: string) => page.getByRole("heading", { name, exact: true }).evaluate((el) => getComputedStyle(el).color);
const shell = (page: Page) => page.getByRole("navigation", { name: "Main" });
const wayOut = (page: Page) => page.getByRole("button", { name: "Back to Today" });

// Criteria 2 and 4, the fixture day (src/test/answer-fixture.ts): Q1's aardvark is rare (in neither of its lists), Q2's
// kiwi uncommon and Q3's blue common; Q2 takes C, and Q4's italy is the host's.
test("a whole day: each rarity's colour and the host's answer, off-list text, a taken letter, reloads, Next after the walk, a dud's ending list and the cards", async ({ browser }) => {
  test.slow();
  const page = await player(browser, "whole");
  await play(page);
  await asked(page, "Name an animal");
  // A player's run has no probe: only the look check's test page passes one (14c-6b-2, answer 45).
  expect(await page.evaluate(() => "__core" in window)).toBe(false);

  await safe(page, "aardvark");
  await expect(page.getByRole("heading", { name: "Kamuro" })).toBeVisible();
  expect(await colour(page, "Kamuro")).toBe(rgb(WORD_INK.rare));
  await expect(page.getByText("“aardvark”")).toBeVisible();
  await expect(page.getByText("The host said bear.", { exact: true })).toBeVisible();

  // Q2 takes C: its lantern goes out, then the box says so, refuses the key and says why.
  await skyResult(page).click();
  await expect(page.getByText("C is out.")).toBeAttached({ timeout: WALK_MS });
  await asked(page, "Name a fruit", WALK_MS);
  await expect(box(page).getByText("Damp fuses: C")).toBeVisible();
  await answerBox(page).pressSequentially("c");
  await expect(answerBox(page)).toHaveValue("");
  await expect(box(page).getByText("C is taken. Try a word without it.")).toBeVisible();

  // Text that names no answer drops back into the box, which keeps it selected, with today's line (answers 9, 23).
  await lightIt(page, "pear");
  await expect(box(page).getByText(`"pear" isn't in our list. Try another answer.`)).toBeVisible();
  await expect(answerBox(page)).toHaveValue("pear");
  expect(await answerBox(page).evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([0, 4]);

  await safe(page, "kiwi");
  await expect(page.getByRole("heading", { name: "Chrysanthemum" })).toBeVisible();
  expect(await colour(page, "Chrysanthemum")).toBe(rgb(WORD_INK.uncommon));
  await expect(page.getByText("The host said apple.", { exact: true })).toBeVisible();

  // A reload on the sky result shows it again, waiting for Walk on.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Chrysanthemum" })).toBeVisible();
  await expect(skyResult(page)).toBeVisible();

  // Next goes to the database only once the next box is there (DECISIONS.md, Game 1: Timer): the box is shown first,
  // and the question's 20 seconds start from Next, so the walk took none of them.
  await page.evaluate(() => {
    const w = window as Window & { boxShownAt?: number };
    const ask = document.querySelector('[data-part="ask"]')!;
    new MutationObserver(() => void (!ask.hasAttribute("hidden") && w.boxShownAt === undefined && (w.boxShownAt = Date.now()))).observe(ask, { attributes: true });
  });
  const nextSent = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/run/next").then(() => Date.now());
  const nextReply = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/run/next");
  await walkOn(page, "Name a color");
  const shownAt = await page.evaluate(() => (window as Window & { boxShownAt?: number }).boxShownAt!);
  expect(await nextSent).toBeGreaterThanOrEqual(shownAt);
  const { run } = await (await nextReply).json();
  expect(run.msLeft).toBeGreaterThan(19_000);

  // A reload mid-question picks up the question with the time the database has left.
  await page.reload();
  await asked(page, "Name a color");
  const seconds = Number(await box(page).getByRole("timer").textContent().then((t) => t!.match(/\d+/)![0]));
  expect(seconds).toBeLessThanOrEqual(20);

  await safe(page, "blue");
  await expect(page.getByRole("heading", { name: "Peony" })).toBeVisible();
  expect(await colour(page, "Peony")).toBe(rgb(WORD_INK.common));
  await expect(page.getByText("The host said red.", { exact: true })).toBeVisible();

  await walkOn(page, "Name a country");
  await caught(page, "italy");
  await expect(page.getByRole("heading", { name: "Dud" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Your answers" }).getByRole("listitem")).toHaveText(["aardvark+25", "kiwi+50", "blue+75", "italy0"]);
  await expect(page.getByText("Total 150", { exact: true })).toBeVisible();

  await seeResults(page).click();
  await expect(page.getByRole("heading", { name: "Caught on question 4" })).toBeVisible();
  await expect(shell(page)).toBeVisible();
});

// A Next that fails leaves the box empty with its error over the scene, nothing retried, and the × shows, so the player
// isn't held full screen (DECISIONS.md, Error handling; 14c-6b-1's review).
test("a Next that fails says so and shows the way out", async ({ browser }) => {
  test.slow();
  const page = await player(browser, "nextfail");
  await play(page);
  await asked(page, "Name an animal");
  await safe(page, puzzle.safeAnswer);
  await page.route("**/api/run/next", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, error: "internal" }) }));
  await skyResult(page).click();
  // The error over the scene, in the game's own region: Next.js keeps an alert of its own for route changes, which in
  // CI held "Plor, Today" (PR #169's first e2e run).
  await expect(page.getByRole("region", { name: GAME.name, exact: true }).getByRole("alert").filter({ hasText: /\S/ })).toBeVisible({ timeout: WALK_MS });
  await expect(wayOut(page)).toBeVisible();
  await wayOut(page).click();
  await expect(page).toHaveURL(/\/$/);
});

// Criterion 3: the fuse burns out, the database agrees time is up, and the run ends with its ending list.
test("a question whose fuse burns out ends the run with Fuse out", async ({ browser }) => {
  test.slow();
  const page = await player(browser, "fuse");
  await play(page);
  await asked(page, "Name an animal");
  // The question's 20 seconds (DECISIONS.md, Game 1), the smoke before the ending, and Playwright's 5 s margin.
  await expect(page.getByRole("heading", { name: "Fuse out" })).toBeVisible({ timeout: (20 + AFTERGLOW.TIMEUP_S + AFTERGLOW.OVER_BUTTON_AT) * 1000 + 5_000 });
  await expect(page.getByText("Nothing lit")).toBeVisible();
  await seeResults(page).click();
  await expect(page.getByRole("heading", { name: "Time's up on question 1" })).toBeVisible();
});

// Criteria 5 and 6: the bars, sidebar and clock bar are gone from Start to See results; the × shows only while no fuse
// burns and goes to Today; a run that is over opens the game screen on its cards.
for (const [size, viewport] of [["a phone", PHONE], ["a desktop", DESKTOP]] as const) {
  test(`on ${size} the game is full screen from Start to See results, and the × shows while no fuse burns`, async ({ browser }) => {
    test.slow();
    const page = await player(browser, `full${viewport.width}`, viewport);
    await expect(shell(page)).toBeVisible();
    await play(page);
    await asked(page, "Name an animal");
    await expect(shell(page)).toBeHidden();
    await expect(wayOut(page)).toBeHidden();

    await safe(page, puzzle.safeAnswer);
    await expect(wayOut(page)).toBeVisible();
    await wayOut(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(shell(page)).toBeVisible();

    await page.getByRole("link", { name: "Continue" }).click();
    await expect(skyResult(page)).toBeVisible();
    await expect(shell(page)).toBeHidden();
    await walkOn(page, "Name a fruit");
    await expect(wayOut(page)).toBeHidden();
    await caught(page, "apple");
    await expect(wayOut(page)).toBeVisible();
    await seeResults(page).click();
    await expect(shell(page)).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Caught on question 2" })).toBeVisible();
    await expect(seeResults(page)).toHaveCount(0);
  });
}
