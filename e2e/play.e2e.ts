// The play frame around the clock game (docs/milestones/M14-14c-8-plain-game-1.md; the clock game's own screens are clock.e2e.ts's):
// the shell's bars hidden from Start to the end at a phone's size and a desktop's, with the × showing and Continue coming back to
// the question; the × holding focus while the run loads; a Next that fails.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { answerBox, asked, say } from "./game";
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
let puzzle: TodayPuzzle;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

// The ticket's two sizes (docs/milestones/M14-14c-8-plain-game-1.md, Numbers).
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

async function player(browser: Browser, name: string, viewport = PHONE) {
  const page = await (await browser.newContext({ viewport })).newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  return page;
}

const tabs = (page: Page) => page.getByRole("navigation", { name: "Main" });
const clockBar = (page: Page) => page.getByRole("region", { name: "Question in play" });
const wayOut = (page: Page) => page.getByRole("button", { name: "Back to Today" });
const nextQuestion = (page: Page) => page.getByRole("button", { name: "Next question", exact: true });

// The bars, tab bar or sidebar and clock bar are gone from Start to the end, and the × shows; before Start and after the
// end the bars are back. Away from the game on a question left in play, the clock bar is too.
for (const [size, viewport] of [["a phone", PHONE], ["a desktop", DESKTOP]] as const) {
  test(`on ${size} the game is full screen from Start to the end, with the × showing`, async ({ browser }) => {
    const page = await player(browser, `plbars${viewport.width}`, viewport);
    const bars = [tabs(page), page.getByRole("banner"), clockBar(page)];
    // Before Start: the tabs are there, and the × isn't.
    await expect(tabs(page)).toBeVisible();
    await expect(wayOut(page)).toHaveCount(0);
    await page.getByRole("link", { name: "Play", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await expect(tabs(page)).toBeVisible();
    await expect(wayOut(page)).toHaveCount(0);

    await page.getByRole("button", { name: "Start", exact: true }).click();
    await asked(page, "Name an animal");
    for (const bar of bars) await expect(bar).toBeHidden();
    await expect(wayOut(page)).toBeVisible();

    await say(page, "dog");
    for (const bar of bars) await expect(bar).toBeHidden();
    await expect(wayOut(page)).toBeVisible();

    // The × leaves for Today, where the bars are back, and Continue returns to the question in play.
    await wayOut(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(tabs(page)).toBeVisible();
    await expect(wayOut(page)).toBeHidden();
    await page.getByRole("link", { name: "Continue" }).click();
    await asked(page, "Name an animal");
    await expect(answerBox(page)).toBeVisible();
    await expect(tabs(page)).toBeHidden();

    await nextQuestion(page).click();
    await asked(page, "Name a fruit");
    for (const bar of bars) await expect(bar).toBeHidden();
    // A question left in play: the × leaves, and the clock bar shows away from the game.
    await wayOut(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(tabs(page)).toBeVisible();
    await expect(clockBar(page)).toBeVisible();
    await page.getByRole("link", { name: "Continue" }).click();
    await asked(page, "Name a fruit");
    await expect(clockBar(page)).toBeHidden();

    await nextQuestion(page).click();
    await asked(page, "Name a color");
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    await expect(page.locator("#result")).toBeVisible();
    await expect(tabs(page)).toBeVisible();
    await expect(wayOut(page)).toHaveCount(0);

    // A run that is over opens the game screen on its result.
    await page.reload();
    await expect(page.locator("#result")).toBeVisible();
    await expect(tabs(page)).toBeVisible();
  });
}

// While the run loads on the way in, the frame shows its skeleton with nothing inside to focus, so the × takes focus
// (src/app/play-frame.tsx; WCAG 2.2 2.4.3), and the question's box takes it from there once it's drawn.
test("the × holds focus while the run loads on Continue, and the answer box takes it after", async ({ browser }) => {
  const page = await player(browser, "plfocus");
  await page.getByRole("link", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await asked(page, "Name an animal");
  await wayOut(page).click();
  await expect(page).toHaveURL(/\/$/);
  // Opened from its address, so the game screen isn't already in the page, kept hidden from the visit above.
  await page.goto("/");
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/run", async (route) => {
    if (new URL(page.url()).pathname === "/play") await held;
    await route.continue();
  });
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page.locator('[data-loading="Loading your question"]')).toBeVisible();
  await expect(wayOut(page)).toBeFocused();
  release();
  await expect(answerBox(page)).toBeFocused();
});

// A Next that fails leaves the question with its error, nothing retried, and the × shows, so the player isn't held full
// screen (DECISIONS.md, Error handling).
test("a Next that fails says so, and the × still leaves", async ({ browser }) => {
  const page = await player(browser, "plnext");
  await page.getByRole("link", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await asked(page, "Name an animal");
  await say(page, "dog");
  let tries = 0;
  await page.route("**/api/run/next", (route) => {
    tries++;
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, error: "internal" }) });
  });
  await nextQuestion(page).click();
  // Next.js keeps an alert of its own for route changes, `#__next-route-announcer__`, which reads the page's title: "Plor"
  // on the dev server, the game's name on a built app (docs/milestones/M21-faster-e2e.md, 21a). The error is the other one.
  await expect(page.getByRole("alert").and(page.locator(":not(#__next-route-announcer__)")).filter({ hasText: /\S/ })).toBeVisible();
  expect(tries).toBe(1);
  await expect(wayOut(page)).toBeVisible();
  await wayOut(page).click();
  await expect(page).toHaveURL(/\/$/);
});
