// The settings sheet (docs/milestones/M14-14a-3b-settings.md): the gear opens a modal <dialog> (MDN <dialog>,
// SOURCES.md), a sheet at the bottom on phones and a 440px panel from 768px, which closes with Close, Escape or a click
// on the dimmed page; and its two switches, Skip the game screen (L39) and Numbers on the calendar (L46), saved on the
// account. The account's own controls in it are in account.e2e.ts.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
let puzzle: TodayPuzzle;
let today = "";

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
  today = (await DB.query<{ today: string }>("select private.today()::text as today")).rows[0].today;
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

const PHONE = { width: 360, height: 800 };
const DESKTOP = { width: 1440, height: 900 };

async function player(browser: Browser, name: string, viewport: { width: number; height: number }) {
  const page = await (await browser.newContext({ viewport })).newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  return page;
}

const sheetOf = (page: Page) => page.getByRole("dialog", { name: "Settings" });
const isModal = (page: Page) => page.evaluate(() => document.querySelector("dialog")!.matches(":modal"));

// Criterion 1 on a phone: the top bar's gear, the sheet along the bottom, and the three ways to close it.
test("on a phone the gear opens the settings sheet, which closes with Close, Escape or the dimmed page", async ({ browser }) => {
  const page = await player(browser, "ga", PHONE);

  const gear = page.getByRole("banner").getByRole("button", { name: "Settings" });
  await expect(gear).toHaveAttribute("aria-haspopup", "dialog");
  // The top bar runs along the top, the full width, 56px tall (round 7).
  expect(await page.getByRole("banner").boundingBox()).toEqual({ x: 0, y: 0, width: 360, height: 56 });

  await gear.click();
  const sheet = sheetOf(page);
  await expect(sheet).toBeVisible();
  expect(await isModal(page)).toBe(true);
  // Focus starts on Close, the first thing in it that takes focus (MDN <dialog>, Accessibility).
  await expect(sheet.getByRole("button", { name: "Close settings" })).toBeFocused();
  // Along the bottom, the full width.
  const box = (await sheet.boundingBox())!;
  expect([box.x, box.width, Math.round(box.y + box.height)]).toEqual([0, 360, 800]);
  // The page behind is inert: a point on it hits the dialog (its backdrop), and focus never leaves the sheet.
  expect(await page.evaluate(() => document.elementFromPoint(180, 28)?.tagName)).toBe("DIALOG");
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement === document.body || Boolean(document.activeElement?.closest("dialog")))).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  await gear.click();
  await sheet.getByRole("button", { name: "Close settings" }).click();
  await expect(sheet).toBeHidden();

  // A click inside, even in the sheet's top padding (mid-width, clear of its rounded corners), leaves it open; one on
  // the dimmed page closes it.
  await gear.click();
  await sheet.getByRole("heading", { name: "Settings" }).click();
  await page.mouse.click(box.x + box.width / 2, box.y + 3);
  await expect(sheet).toBeVisible();
  await page.mouse.click(180, 28);
  await expect(sheet).toBeHidden();
});

// Criterion 1 from 768px: Settings at the sidebar's foot, opening a 440px panel at the right, full height.
test("from 768px the sidebar's Settings opens a side panel", async ({ browser }) => {
  const page = await player(browser, "gb", DESKTOP);
  await expect(page.getByRole("banner")).toBeHidden();
  await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Settings" }).click();
  const sheet = sheetOf(page);
  await expect(sheet).toBeVisible();
  expect(await isModal(page)).toBe(true);
  expect(await sheet.boundingBox()).toEqual({ x: 1000, y: 0, width: 440, height: 900 });
  await expect(sheet.getByRole("link", { name: "Privacy policy" })).toBeVisible();
  await page.mouse.click(500, 450);
  await expect(sheet).toBeHidden();
});

async function flip(page: Page, name: string, on: boolean) {
  await page.getByRole("button", { name: "Settings" }).click();
  const control = sheetOf(page).getByRole("switch", { name: new RegExp(name) });
  await expect(control).toBeChecked({ checked: !on });
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/profile/settings") && r.ok());
  await control.click();
  await saved;
  await expect(control).toBeChecked({ checked: on });
  await page.keyboard.press("Escape");
}

// Criterion 4: off, Play opens the game screen; on, the banner states the 20 seconds and Play starts question 1.
test("Skip the game screen makes Play start question 1, and says the time limit first", async ({ browser }) => {
  const page = await player(browser, "gc", PHONE);
  const banner = page.getByRole("region", { name: "Offbeat" });
  await expect(banner.getByRole("link", { name: "Play", exact: true })).toHaveAttribute("href", "/offbeat");
  await expect(banner).not.toContainText("20 seconds each");

  await flip(page, "Skip the game screen", true);
  // Saved on the account: a reload keeps it.
  await page.reload();
  await expect(banner).toContainText("Don't match the Wind · 7 questions · 20 seconds each");
  await banner.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page).toHaveURL(/\/offbeat$/);
  await expect(page.getByLabel("Your answer")).toBeVisible();
});

// Criterion 5: each played day's number, in its shade's number colour, only with the switch on. Caught on question 1,
// today is a played day with 0 survived.
test("Numbers on the calendar shows each played day's questions survived", async ({ browser }) => {
  const page = await player(browser, "gd", PHONE);
  await flip(page, "Skip the game screen", true);
  await page.getByRole("region", { name: "Offbeat" }).getByRole("button", { name: "Play", exact: true }).click();
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.locator("#result")).toContainText("You survived 0 of 7 questions");
  await page.goto("/me");
  const cell = page.getByRole("region", { name: "Calendar" }).locator(`[data-date='${today}']`);
  await expect(page.getByRole("region", { name: "Calendar" }).getByText(/^1 of \d+ days$/)).toBeVisible();
  await expect(cell).toHaveText("");

  await flip(page, "Numbers on the calendar", true);
  await expect(cell).toHaveText("0");
  // Paper's first shade takes the text colour for its number, 4.5:1 on it (colors.test.ts).
  expect(await cell.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(26, 26, 24)");
  // Saved on the account: a reload keeps it.
  await page.reload();
  await expect(cell).toHaveText("0");

  await flip(page, "Numbers on the calendar", false);
  await expect(cell).toHaveText("");
});
