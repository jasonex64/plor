// How to play (docs/milestones/M14-14c-8-plain-game-1.md, after 14c-6d): a panel over the page, opened before the run
// from the game screen and from Today's banner under Play, with Skip the game screen off and on, and over the game
// from the play frame; four steps one at a time with Previous and Next, Close on the last; Close, × and Escape close it
// with focus back on the button and the page behind out of reach; a slide named "N of 4" for screen readers; it fits
// at a phone's size, a desktop's and 320px; its words name no festival.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { POINTS_PER_QUESTION, QUESTIONS_PER_DAY } from "../src/config/tunables";
import { GAME } from "../src/platform/game";
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { answerBox, asked } from "./game";

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

// The four steps (src/app/how-to-play.tsx), the game's numbers from tunables.ts.
const CHUNKS = [
  `The host has picked a few answers to each question. Say one and your run ends. ${QUESTIONS_PER_DAY} questions, one run a day.`,
  "You get 20 seconds for each question. A typo, or not a real answer? Try again. The clock keeps going.",
  "On questions 2, 4, 5 and 7 a letter is taken. Answer without it.",
  `Not the host's? You're safe, and the rarer your answer, the bigger your bonus. Each question is worth more: ${POINTS_PER_QUESTION[0]} points for the first, ${POINTS_PER_QUESTION[POINTS_PER_QUESTION.length - 1]} for the last. Run out of time and your run ends.`,
];
// The ticket's two sizes (criterion 5).
const PHONE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };

async function player(browser: Browser, name: string, viewport = PHONE) {
  const page = await (await browser.newContext({ viewport })).newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  return page;
}

const banner = (page: Page) => page.getByRole("region", { name: GAME.name });
const panel = (page: Page) => page.getByRole("dialog", { name: "How to play" });

// Criteria 2 to 4, from Today's banner: every chunk in turn, back again, and each way to close it.
test("Today's How to play opens four chunks one at a time, and Close, × and Escape each close it with focus back", async ({ browser }) => {
  const page = await player(browser, "howa");
  const open = banner(page).getByRole("button", { name: "How to play" });
  // Under Play, smaller (answer 40).
  const [play, how] = await Promise.all([banner(page).getByRole("link", { name: "Play", exact: true }).boundingBox(), open.boundingBox()]);
  expect(how!.y).toBeGreaterThan(play!.y + play!.height - 1);

  await open.click();
  const dialog = panel(page);
  await expect(dialog).toBeVisible();
  const previous = dialog.getByRole("button", { name: "Previous" });
  const next = dialog.getByRole("button", { name: "Next" });
  for (const [i, text] of CHUNKS.entries()) {
    const slide = dialog.getByRole("group", { name: `${i + 1} of ${CHUNKS.length}` });
    await expect(slide).toBeVisible();
    await expect(slide).toHaveText(text);
    await expect(dialog.getByRole("group", { name: /^\d of 4$/ })).toHaveCount(1);
    await expect(previous).toHaveAttribute("aria-disabled", String(i === 0));
    if (i < CHUNKS.length - 1) await next.click();
  }
  // The last chunk: Close where › was, and back to the first by ‹.
  await expect(next).toHaveCount(0);
  for (let i = CHUNKS.length - 1; i > 0; i--) await previous.click();
  await expect(dialog.getByRole("group", { name: `1 of ${CHUNKS.length}` })).toBeVisible();
  // ‹ on the first chunk does nothing. It stays in the tab order (aria-disabled), so it's pressed from the keyboard:
  // Playwright's click waits for an enabled button.
  await previous.focus();
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("group", { name: `1 of ${CHUNKS.length}` })).toBeVisible();

  // Screen readers: a dialog named How to play, its chunks a carousel of slides, announced politely (criterion 4).
  await expect(dialog.locator('[aria-roledescription="carousel"]')).toHaveAttribute("aria-label", "Rules");
  await expect(dialog.locator('[aria-live="polite"]')).toHaveCount(1);
  await expect(dialog.getByRole("group", { name: "1 of 4" })).toHaveAttribute("aria-roledescription", "slide");

  // The page behind is out of reach: Tab goes once round the panel's buttons and on, and never lands on the page. Past
  // the last button it leaves for the browser's own controls (the document's body), as a modal dialog lets it.
  const stops = await dialog.getByRole("button").count();
  for (let i = 0; i <= stops; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement) || document.activeElement === document.body)).toBe(true);
  }

  // Close on the last chunk, the × and Escape each close it, and focus goes back to the button (criterion 3).
  for (const close of ["last", "×", "Escape"] as const) {
    if (!(await dialog.isVisible())) await open.click();
    if (close === "last") {
      for (let i = 0; i < CHUNKS.length - 1; i++) await next.click();
      await dialog.getByRole("button", { name: "Close", exact: true }).last().click();
    } else if (close === "×") await dialog.getByRole("button", { name: "Close", exact: true }).first().click();
    else await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  }
  // It opens again on the first chunk.
  await open.click();
  await expect(dialog.getByRole("group", { name: "1 of 4" })).toBeVisible();
});

// Criterion 1: before the run, from the game screen above Start and from Today with Skip the game screen on; once the
// run has started, on Today it is gone and in the play frame it opens over the game.
test("How to play is on the game screen before Start and on Today with Skip on, and over the game once the run starts", async ({ browser }) => {
  const page = await player(browser, "howb");
  await banner(page).getByRole("link", { name: "Play", exact: true }).click();
  const start = page.getByRole("button", { name: "Start", exact: true });
  await expect(start).toBeVisible();
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(panel(page)).toBeVisible();
  await page.keyboard.press("Escape");

  // Skip the game screen, set on the account as its switch saves it (settings.e2e.ts checks the switch).
  await DB.query("update private.profile set skip_game_screen = true where user_id = (select id from auth.users where email = $1)", [`${RUN}-howb@example.test`]);
  await page.goto("/");
  await expect(banner(page).getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await banner(page).getByRole("button", { name: "How to play" }).click();
  await expect(panel(page)).toBeVisible();
  await page.keyboard.press("Escape");

  await banner(page).getByRole("button", { name: "Play", exact: true }).click();
  await asked(page, "Name an animal");
  // Over the game from the play frame's button: the question is still behind it, the shell's bars are hidden, and
  // Escape gives focus back to the button.
  const inFrame = page.getByRole("button", { name: "How to play" });
  // By the keyboard: the development server's "Cache disabled" toast sits over the button at a phone's size, and a click would land on it.
  await inFrame.focus();
  await page.keyboard.press("Enter");
  await expect(panel(page)).toBeVisible();
  await expect(answerBox(page)).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(inFrame).toBeFocused();
  await page.goBack();
  await expect(banner(page).getByRole("link", { name: "Continue" })).toBeVisible();
  await expect(banner(page).getByRole("button", { name: "How to play" })).toHaveCount(0);
});

// Criterion 5: no sideways scroll at 320px, every button at least 24px each way, the panel inside the window.
for (const [size, viewport] of [["a phone", PHONE], ["a desktop", DESKTOP], ["320px", { width: 320, height: 640 }]] as const) {
  test(`How to play fits on ${size}`, async ({ browser }) => {
    const page = await player(browser, `howc${viewport.width}`, viewport);
    await banner(page).getByRole("button", { name: "How to play" }).click();
    const dialog = panel(page);
    await expect(dialog).toBeVisible();
    for (const button of await dialog.getByRole("button").all()) {
      const box = (await button.boundingBox())!;
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(24);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  });
}

// The words are the app's own, as the game is (docs/milestones/M14-14c-8-plain-game-1.md, criterion 3): none of the
// festival's. Every step is in the page, the hidden ones too, so the panel's whole text is read.
test("How to play's steps name no festival", async ({ browser }) => {
  const page = await player(browser, "hown");
  await banner(page).getByRole("button", { name: "How to play" }).click();
  const text = await panel(page).evaluate((d) => d.textContent!);
  expect(text).toContain("The host has picked");
  expect(text).not.toMatch(/firework|fuse|dud|show|street|festival|light it/i);
});
