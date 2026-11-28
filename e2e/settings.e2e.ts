// The settings sheet (docs/milestones/M14-14a-3b-settings.md): the gear opens a modal <dialog> (MDN <dialog>,
// SOURCES.md), a sheet at the bottom on phones and a 440px panel from 768px, which closes with Close, Escape or a click
// on the dimmed page; and its switch, Skip the game screen (L39), saved on the
// account. The account's own controls in it are in account.e2e.ts.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
import { fixedWidth } from "./fixed-width";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { GAME } from "../src/platform/game";
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

const PHONE = { width: 360, height: 800 };
const DESKTOP = { width: 1440, height: 900 };

// One player for the whole file, its tests in order. Its name is this file's alone: every file in a run shares RUN, so
// a name another file uses ("ga" in groups.e2e.ts) signs into that player, who has a username already.
test.describe.configure({ mode: "serial" });
let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await page.goto("/");
  await signInAndPick(page, "set");
});

const sheetOf = (page: Page) => page.getByRole("dialog", { name: "Settings" });
// The settings sheet's own dialog: Today's banner holds How to play's too, closed, before the shell's in the page
// (14c-6d, docs/milestones/M14-14c-8-plain-game-1.md).
const isModal = (page: Page) => sheetOf(page).evaluate((d) => d.matches(":modal"));

// Criterion 1 on a phone: the top bar's gear, the sheet along the bottom, and the three ways to close it.
test("on a phone the gear opens the settings sheet, which closes with Close, Escape or the dimmed page", async () => {

  const gear = page.getByRole("banner").getByRole("button", { name: "Settings" });
  await expect(gear).toHaveAttribute("aria-haspopup", "dialog");
  // The top bar runs along the top, the full width a fixed bar gets (fixed-width.ts), 56px tall (round 7).
  expect(await page.getByRole("banner").boundingBox()).toEqual({ x: 0, y: 0, width: await fixedWidth(page), height: 56 });

  await gear.click();
  const sheet = sheetOf(page);
  await expect(sheet).toBeVisible();
  expect(await isModal(page)).toBe(true);
  // Focus starts on Close, the first thing in it that takes focus (MDN <dialog>, Accessibility).
  await expect(sheet.getByRole("button", { name: "Close settings" })).toBeFocused();
  // Along the bottom, the full width a fixed bar gets (fixed-width.ts).
  const box = (await sheet.boundingBox())!;
  expect([box.x, box.width, Math.round(box.y + box.height)]).toEqual([0, await fixedWidth(page), 800]);
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
test("from 768px the sidebar's Settings opens a side panel", async () => {
  await page.setViewportSize(DESKTOP);
  await expect(page.getByRole("banner")).toBeHidden();
  await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Settings" }).click();
  const sheet = sheetOf(page);
  await expect(sheet).toBeVisible();
  expect(await isModal(page)).toBe(true);
  // At the right edge of the width a fixed bar gets (fixed-width.ts).
  expect(await sheet.boundingBox()).toEqual({ x: (await fixedWidth(page)) - 440, y: 0, width: 440, height: 900 });
  await expect(sheet.getByRole("link", { name: "Privacy policy" })).toBeVisible();
  await page.mouse.click(500, 450);
  await expect(sheet).toBeHidden();
  await page.setViewportSize(PHONE);
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

// Criterion 4: the Skip the game screen switch saves on the account, and a reload keeps it. Nothing on Today reads it since
// 23f-3a took the old game's skip out (the clock game's Play always opens its game screen), so only the switch is checked.
test("the Skip the game screen switch is saved on the account", async () => {
  await page.goto("/");
  const banner = page.getByRole("region", { name: GAME.name });
  await expect(banner.getByRole("link", { name: "Play", exact: true })).toHaveAttribute("href", "/play");

  await flip(page, "Skip the game screen", true);
  // Saved on the account: a reload keeps it.
  await page.reload();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(sheetOf(page).getByRole("switch", { name: /Skip the game screen/ })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(banner.getByRole("link", { name: "Play", exact: true })).toHaveAttribute("href", "/play");
});
