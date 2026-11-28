// The admin area in the shell (docs/milestones/M14-14b-2b-2-admin-build.md, criteria 1, 2, 3 and 5): /admin opens
// Puzzles inside the shell with Admin as the current section; the sub-tabs in two groups; what needs the admin in the
// right column from 1200px; on phones one menu in the sub-tabs' order. The warning when tomorrow
// has no puzzle (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6f, criterion 7).
import { expect, test, type Browser } from "@playwright/test";
import { Pool } from "pg";
import { fixedWidth } from "./fixed-width";
import { removePuzzle, todayPuzzle, tomorrowWarning, type TodayPuzzle } from "./puzzle";
import { fixtureClockDay, loadFixtureBase } from "../src/test/answer-fixture";
import { localStack } from "../scripts/slot.ts";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
let puzzle: TodayPuzzle;

// Today's day, so the page lists an Offbeat day, as it does once any is drafted.
test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
});
test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

async function admin(browser: Browser, name: string, viewport: { width: number; height: number }) {
  const page = await (await browser.newContext({ viewport })).newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-${name}@example.test`]);
  return page;
}

test("the admin area sits in the shell, with grouped sub-tabs and what needs the admin beside it", async ({ browser }) => {
  const page = await admin(browser, "ar", { width: 1440, height: 900 });
  await page.goto("/admin");
  await expect(page).toHaveURL("/admin/puzzles");
  await expect(page.getByRole("heading", { level: 2, name: "Puzzles" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Admin" })).toHaveAttribute("aria-current", "true");

  const tabs = page.getByRole("navigation", { name: "Admin" });
  await expect(tabs.getByRole("group", { name: "To do" }).getByRole("link")).toHaveText([/^Puzzles/, /^Reports/, /^Lists/]);
  await expect(tabs.getByRole("group", { name: "Look up" }).getByRole("link")).toHaveText(["Database", "Kit"]);
  await expect(tabs.getByRole("link", { name: /^Puzzles/ })).toHaveAttribute("aria-current", "page");

  const needs = page.getByRole("complementary", { name: "What needs you" });
  await expect(needs.getByRole("listitem")).toHaveCount(4);
  // Tomorrow isn't approved here, so its warning stands in for the days-ahead row, first (14b-6f).
  const warning = await tomorrowWarning(DB);
  await expect(needs.getByRole("link")).toHaveText([new RegExp(warning.what), /to approve/, /reported comment/, /to look through/]);
  // At the right edge of the width a fixed bar gets (fixed-width.ts).
  expect(await needs.boundingBox()).toEqual({ x: (await fixedWidth(page)) - 360, y: 0, width: 360, height: 900 });
});

test("on a phone the admin pages are one menu in the sub-tabs' order", async ({ browser }) => {
  const page = await admin(browser, "as", { width: 360, height: 800 });
  await page.goto("/admin/lists");
  const menu = page.getByRole("navigation", { name: "Admin" });
  const button = menu.getByRole("button", { name: /^Lists/ });
  // Escape closes it, back on its button, and so does a press outside it (14b-2c-3, item 41).
  await button.click();
  await expect(menu.getByRole("list", { name: "To do" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu.getByRole("list", { name: "To do" })).toHaveCount(0);
  await expect(button).toBeFocused();
  await button.click();
  await page.getByRole("heading", { level: 2, name: "Lists" }).click();
  await expect(menu.getByRole("list", { name: "To do" })).toHaveCount(0);
  // On a phone each table's cells name their columns, and the table and its headers are still there for screen
  // readers (answer 17).
  const table = page.getByRole("table").first();
  await expect(table.getByRole("columnheader", { name: "Answers" })).toHaveCount(1);
  const cell = table.getByRole("cell").nth(1);
  expect(await cell.evaluate((td) => [td.getAttribute("data-label"), getComputedStyle(td, "::before").content])).toEqual(["Answers", expect.stringContaining("Answers")]);
  await button.click();
  await expect(menu.getByRole("list", { name: "To do" }).getByRole("link")).toHaveText([/^Puzzles/, /^Reports/, /^Lists/]);
  await expect(menu.getByRole("list", { name: "Look up" }).getByRole("link")).toHaveText(["Database", "Kit"]);
  await menu.getByRole("link", { name: "Database" }).click();
  await expect(page).toHaveURL("/admin/base");
  await expect(page.getByRole("heading", { level: 2, name: "Database" })).toBeVisible();
  // No sideways scroll on a phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

// Until tomorrow is approved, the rail's first row warns in the danger colour and says what to do, and the phone's
// Waiting strip shows it first; with nothing drafted, Puzzles also has an empty slot that says how days get drafted;
// with tomorrow approved, none of them shows (criterion 7; answers 27 to 29). Whether tomorrow is drafted depends on the
// repo's content on the day the test runs (tomorrowWarning).
test("the admin is warned until tomorrow is approved", async ({ browser }) => {
  const warning = await tomorrowWarning(DB);
  const tomorrow = warning.date;
  const { rows } = await DB.query<{ taken: boolean }>(
    "select exists (select 1 from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date) as taken",
    [tomorrow],
  );
  expect(rows[0].taken, "the test needs tomorrow free").toBe(false);

  const page = await admin(browser, "tw", { width: 1440, height: 900 });
  await page.goto("/admin/puzzles");
  const first = page.getByRole("complementary", { name: "What needs you" }).getByRole("link").first();
  await expect(first).toContainText(warning.what);
  await expect(first).toContainText(warning.todo);
  const look = await first.evaluate((el) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--danger)";
    document.body.append(probe);
    const danger = getComputedStyle(probe).color;
    probe.remove();
    return getComputedStyle(el).color === danger;
  });
  expect(look).toBe(true);
  const days = page.getByRole("navigation", { name: "Days" });
  // The day the page opens on is the one shown pressed, the empty slot beside it not (14b-6f review).
  await expect(days.getByRole("button", { pressed: true })).toHaveCount(1);
  // Days after tomorrow that only Fragments has (drafted in the repo) are Not drafted slots too.
  const slots = await days.getByRole("button", { name: /Not drafted/ }).count();
  if (warning.drafted) {
    // A drafted tomorrow is a day in the row, not an empty slot.
    expect(slots).toBe(0);
  } else {
    // Tomorrow's is the first of them.
    const slot = days.getByRole("button", { name: /Not drafted/ }).first();
    await expect(slot).toHaveAttribute("aria-pressed", "false");
    await slot.click();
    await expect(days.getByRole("button", { pressed: true })).toHaveText(/Not drafted/);
    await expect(page.getByText(/^Nothing drafted for .+\. A Claude session drafts days from the question bank\.$/)).toBeVisible();
  }

  const phone = await admin(browser, "tp", { width: 360, height: 800 });
  await phone.goto("/admin/puzzles");
  await expect(phone.getByRole("navigation", { name: "Admin" }).getByRole("link").first()).toHaveText(warning.what);

  await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [tomorrow, fixtureClockDay(tomorrow, await loadFixtureBase(DB))]);
  try {
    await page.reload();
    await expect(first).toContainText("to approve");
    await expect(page.getByText(/^Tomorrow /)).toHaveCount(0);
    await expect(days.getByRole("button", { name: /Not drafted/ })).toHaveCount(warning.drafted ? slots : slots - 1);
    await expect(days.getByRole("button", { pressed: true })).toHaveCount(1);
    await phone.reload();
    await expect(phone.getByRole("navigation", { name: "Admin" }).getByRole("button", { name: /Puzzles/ })).toBeVisible();
    await expect(phone.getByText(/^Tomorrow /)).toHaveCount(0);
  } finally {
    await DB.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [tomorrow]);
  }
});
