// The plain game screen plays the day's run (docs/milestones/M14-14c-8-plain-game-1.md; surviving all seven is
// approve-and-play.e2e.ts's, the "Past midnight" line during play is offbeat.e2e.ts's): a whole run with each rarity,
// off-list text, a taken letter, a reload at a reveal, the recap and the cards; the shell's bars hidden from Start to
// See results at a phone's size and a desktop's; time up; a Next that fails; one status message for each result.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { POINTS_PER_QUESTION } from "../src/config/tunables";
import { answer, answerBox, asked, caught, next, nextButton, safe, seeResults } from "./game";
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
// What a screen reader is told: the page's status messages that have text (the loading status is empty when nothing loads).
const said = (page: Page) => page.getByRole("status").filter({ hasText: /\S/ });
const [Q1, Q2, Q3] = POINTS_PER_QUESTION;
const points = (n: number) => `${n} points`;
const reveal = (n: number, total: number) => new RegExp(`^\\+${points(n)}, rarity bonus \\+\\d+ \\(estimate\\) · ${points(total)} so far$`);

// The fixture day (src/test/answer-fixture.ts): Q1's aardvark is rare (in neither of its lists), Q2's kiwi uncommon and
// Q3's blue common; Q2 takes C and Q4 takes P, and Q4's italy is the host's.
test("a whole run: off-list text, a taken letter, each rarity, a reload at a reveal, the recap and the result cards", async ({ browser }) => {
  const page = await player(browser, "plwhole");
  await play(page);
  await asked(page, "Name an animal");

  await safe(page, "aardvark");
  await expect(page.getByText("You said aardvark; the host said bear.")).toBeVisible();
  await expect(page.getByText("Rarity: Rare", { exact: true })).toBeVisible();
  await expect(page.getByText(reveal(Q1, Q1))).toBeVisible();
  await expect(page.getByText("Next question: C is taken.", { exact: true })).toBeVisible();
  // Next has focus the moment the reveal is there, with no wait.
  expect(await nextButton(page).evaluate((el) => el === document.activeElement)).toBe(true);
  // One status message for the result (WCAG 2.2 4.1.3).
  await expect(said(page)).toHaveText([`Safe! ${points(Q1)}`]);

  // Q2 takes C: the box shows it, and its key does nothing.
  await next(page, "Name a fruit");
  await expect(page.getByText("Letters taken", { exact: true })).toBeVisible();
  await expect(page.getByText("C", { exact: true })).toBeVisible();
  await answerBox(page).pressSequentially("c");
  await expect(answerBox(page)).toHaveValue("");
  await expect(page.getByText("C is taken. Try a word without it.")).toBeVisible();

  // Text that names no answer stays in the box, selected, with its line.
  await answer(page, "pear");
  await expect(page.getByText(`"pear" isn't in our list. Try another answer.`)).toBeVisible();
  await expect(answerBox(page)).toHaveValue("pear");
  expect(await answerBox(page).evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([0, 4]);

  await safe(page, "kiwi");
  await expect(page.getByText("Rarity: Uncommon", { exact: true })).toBeVisible();
  await expect(page.getByText("You said kiwi; the host said apple.")).toBeVisible();
  await expect(page.getByText(reveal(Q2, Q1 + Q2))).toBeVisible();

  // A reload at the reveal shows it again, waiting for Next.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Safe!", exact: true })).toBeVisible();
  await expect(page.getByText("Rarity: Uncommon", { exact: true })).toBeVisible();
  await expect(nextButton(page)).toBeVisible();

  // A reload mid-question picks up the question with the time the database has left.
  await next(page, "Name a color");
  await page.reload();
  await asked(page, "Name a color");
  const seconds = Number((await page.getByRole("timer").textContent())!.match(/\d+/)![0]);
  expect(seconds).toBeLessThanOrEqual(20);

  await safe(page, "blue");
  await expect(page.getByText("Rarity: Common", { exact: true })).toBeVisible();
  await expect(page.getByText("You said blue; the host said red.")).toBeVisible();
  await expect(page.getByText(reveal(Q3, Q1 + Q2 + Q3))).toBeVisible();
  await expect(page.getByText("Next question: P is taken.", { exact: true })).toBeVisible();

  await next(page, "Name a country");
  await caught(page, "italy");
  // The recap: how it ended, each answer with its points, the total, then See results. Its result and its total are one
  // status message each.
  await expect(page.getByRole("heading", { name: "Caught on question 4", exact: true })).toBeVisible();
  // The question that had focus is gone, so the recap's heading takes it (WCAG 2.2 2.4.3).
  await expect(page.getByRole("heading", { name: "Caught on question 4", exact: true })).toBeFocused();
  await expect(page.getByRole("list", { name: "Your answers" }).getByRole("listitem")).toHaveText([
    new RegExp(`^Name an animal: you said aardvark \\(safe, \\+${points(Q1)}\\)$`, "i"),
    new RegExp(`^Name a fruit: you said kiwi \\(safe, \\+${points(Q2)}\\)$`, "i"),
    new RegExp(`^Name a color: you said blue \\(safe, \\+${points(Q3)}\\)$`, "i"),
    /^Name a country: you said italy, the host said \w+ \(caught\)$/i,
  ]);
  const total = new RegExp(`^Total: ${points(Q1 + Q2 + Q3)}( \\+ about \\d+ bonus)?$`);
  await expect(page.locator("strong").filter({ hasText: total })).toBeVisible();
  await expect(said(page)).toHaveText(["Caught on question 4", total]);

  await seeResults(page).click();
  await expect(page.getByRole("heading", { name: "Caught on question 4", exact: true })).toBeVisible();
  // See results went with the frame, so the result's heading takes focus.
  await expect(page.getByRole("heading", { name: "Caught on question 4", exact: true })).toBeFocused();
  await expect(page.locator("#result")).toContainText("You survived 3 of 7 questions");
  await expect(tabs(page)).toBeVisible();
});

// The bars, tab bar or sidebar and clock bar are gone from Start to See results, and the × shows; before Start and after
// See results the bars are back. Away from the game on a question left in play, the clock bar is too.
for (const [size, viewport] of [["a phone", PHONE], ["a desktop", DESKTOP]] as const) {
  test(`on ${size} the game is full screen from Start to See results, with the × showing`, async ({ browser }) => {
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

    await safe(page, puzzle.safeAnswer);
    for (const bar of bars) await expect(bar).toBeHidden();
    await expect(wayOut(page)).toBeVisible();

    // The × leaves for Today, where the bars are back, and Continue returns to the reveal.
    await wayOut(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(tabs(page)).toBeVisible();
    await expect(wayOut(page)).toBeHidden();
    await page.getByRole("link", { name: "Continue" }).click();
    await expect(nextButton(page)).toBeVisible();
    // The run waiting at a reveal: Next focuses itself, so the × fallback has nothing to do and focus is in the frame.
    await expect(nextButton(page)).toBeFocused();
    await expect(tabs(page)).toBeHidden();

    await next(page, "Name a fruit");
    for (const bar of bars) await expect(bar).toBeHidden();
    // A question left in play: the × leaves, and the clock bar shows away from the game.
    await wayOut(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(tabs(page)).toBeVisible();
    await expect(clockBar(page)).toBeVisible();
    await page.getByRole("link", { name: "Continue" }).click();
    await asked(page, "Name a fruit");
    await expect(clockBar(page)).toBeHidden();

    await caught(page, "apple");
    for (const bar of bars) await expect(bar).toBeHidden();
    await expect(wayOut(page)).toBeVisible();
    await seeResults(page).click();
    await expect(tabs(page)).toBeVisible();
    await expect(wayOut(page)).toHaveCount(0);

    // A run that is over opens the game screen on its cards, with no recap.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Caught on question 2", exact: true })).toBeVisible();
    await expect(seeResults(page)).toHaveCount(0);
    await expect(tabs(page)).toBeVisible();
  });
}

// While the run loads on the way in, the frame shows its skeleton with nothing inside to focus, so the × takes focus
// (src/app/play-frame.tsx; WCAG 2.2 2.4.3), and the question's box takes it from there once it's drawn.
test("the × holds focus while the run loads on Continue, and the answer box takes it after", async ({ browser }) => {
  const page = await player(browser, "plfocus");
  await play(page);
  await asked(page, "Name an animal");
  await wayOut(page).click();
  await expect(page).toHaveURL(/\/$/);
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

// Time up ends the run: the database agrees time is up when the page asks at zero, and the recap says so. The browser's
// clock is faked, the database's isn't, so the run is moved back past the question's 20 seconds there too
// (private.question_started_at), as in player-screens.e2e.ts.
test("a question's time running out ends the run with Time's up in the recap", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await page.clock.install();
  await page.goto("/");
  await signInAndPick(page, "pltime");
  await play(page);
  await asked(page, "Name an animal");
  await DB.query(
    "update private.run set started_at = started_at - interval '21 seconds' where user_id = (select id from auth.users where email = $1)",
    [`${RUN}-pltime@example.test`],
  );
  await page.clock.fastForward("00:21");
  await expect(page.getByRole("heading", { name: "Time's up on question 1", exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Your answers" }).getByRole("listitem")).toHaveCount(0);
  await expect(said(page)).toHaveText(["Time's up on question 1", "Total: 0 points"]);
  await seeResults(page).click();
  await expect(page.locator("#result")).toContainText("You survived 0 of 7 questions");
  await expect(page.getByRole("heading", { name: "Time's up on question 1", exact: true })).toBeVisible();
});

// A Next that fails leaves the reveal with its error, nothing retried, and the × shows, so the player isn't held full
// screen (DECISIONS.md, Error handling).
test("a Next that fails says so, and the × still leaves", async ({ browser }) => {
  const page = await player(browser, "plnext");
  await play(page);
  await asked(page, "Name an animal");
  await safe(page, puzzle.safeAnswer);
  let tries = 0;
  await page.route("**/api/run/next", (route) => {
    tries++;
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, error: "internal" }) });
  });
  await nextButton(page).click();
  // Next.js keeps an alert of its own for route changes, so the error is the one with text beyond the page's title.
  await expect(page.getByRole("alert").filter({ hasText: /\S/ }).filter({ hasNotText: "Plor" })).toBeVisible();
  expect(tries).toBe(1);
  await expect(wayOut(page)).toBeVisible();
  await wayOut(page).click();
  await expect(page).toHaveURL(/\/$/);
});
