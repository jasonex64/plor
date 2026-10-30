// The admin area in the shell (docs/milestones/M14-14b-2b-2-admin-build.md, criteria 1, 2, 3 and 5): /admin opens
// Puzzles inside the shell with Admin as the current section; the sub-tabs in two groups; what needs the admin in the
// right column from 1200px; the insights chart; on phones one menu in the sub-tabs' order. The warning when tomorrow
// has no puzzle (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6f, criterion 7). The chart's axis (14b-9).
import { expect, test, type Browser } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { fixtureDay, loadFixtureBase } from "../src/test/answer-fixture";

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
  await expect(page).toHaveURL("http://localhost:3000/admin/puzzles");
  await expect(page.getByRole("heading", { level: 2, name: "Puzzles" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Admin" })).toHaveAttribute("aria-current", "true");

  const tabs = page.getByRole("navigation", { name: "Admin" });
  await expect(tabs.getByRole("group", { name: "To do" }).getByRole("link")).toHaveText([/^Puzzles/, /^Audit/, /^Reports/]);
  await expect(tabs.getByRole("group", { name: "Look up" }).getByRole("link")).toHaveText(["Insights", "Bank", "Database"]);
  await expect(tabs.getByRole("link", { name: /^Puzzles/ })).toHaveAttribute("aria-current", "page");

  const needs = page.getByRole("complementary", { name: "What needs you" });
  await expect(needs.getByRole("listitem")).toHaveCount(4);
  // Tomorrow has nothing drafted or approved here, so its warning stands in for the days-ahead row, first (14b-6f).
  await expect(needs.getByRole("link")).toHaveText([/Tomorrow has no puzzle/, /to approve/, /to review/, /reported comment/]);
  expect(await needs.boundingBox()).toEqual({ x: 1080, y: 0, width: 360, height: 900 });

  // Insights: today's day, the chart against the Gentle target, said in full for screen readers.
  await tabs.getByRole("link", { name: "Insights" }).click();
  await expect(page).toHaveURL("http://localhost:3000/admin/insights");
  const chart = page.getByRole("region", { name: "Caught per question" });
  await expect(chart.getByRole("img")).toHaveAttribute("aria-label", /^Share of players caught per question, against the Gentle target: Q1 /);
  await expect(page.getByRole("button", { name: "Next day" })).toBeDisabled();
});

test("on a phone the admin pages are one menu in the sub-tabs' order", async ({ browser }) => {
  const page = await admin(browser, "as", { width: 360, height: 800 });
  await page.goto("/admin/bank");
  const menu = page.getByRole("navigation", { name: "Admin" });
  const button = menu.getByRole("button", { name: /^Bank/ });
  // Escape closes it, back on its button, and so does a press outside it (14b-2c-3, item 41).
  await button.click();
  await expect(menu.getByRole("list", { name: "To do" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu.getByRole("list", { name: "To do" })).toHaveCount(0);
  await expect(button).toBeFocused();
  await button.click();
  await page.getByRole("heading", { level: 2, name: "Bank" }).click();
  await expect(menu.getByRole("list", { name: "To do" })).toHaveCount(0);
  // On a phone each table's cells name their columns, and the table and its headers are still there for screen
  // readers (answer 17).
  const table = page.getByRole("table").first();
  await expect(table.getByRole("columnheader", { name: "Category" })).toHaveCount(1);
  const cell = table.getByRole("cell").nth(1);
  expect(await cell.evaluate((td) => [td.getAttribute("data-label"), getComputedStyle(td, "::before").content])).toEqual(["Category", expect.stringContaining("Category")]);
  await button.click();
  await expect(menu.getByRole("list", { name: "To do" }).getByRole("link")).toHaveText([/^Puzzles/, /^Audit/, /^Reports/]);
  await expect(menu.getByRole("list", { name: "Look up" }).getByRole("link")).toHaveText(["Insights", "Bank", "Database"]);
  await menu.getByRole("link", { name: "Database" }).click();
  await expect(page).toHaveURL("http://localhost:3000/admin/base");
  await expect(page.getByRole("heading", { level: 2, name: "Database" })).toBeVisible();
  // No sideways scroll on a phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

// The axis on a day a question catches everyone (docs/milestones/M14-14b-9-insights-axis.md, criterion 2): five labels by
// 25%, each label's middle level with its rate's height in the plot, none past the chart's foot or out of its card.
// Before 14b-9 this day had 21 labels, spilling under the chart over the legend and the table.
test("the insights axis fits its chart on a day a question catches everyone", async ({ browser }) => {
  const page = await admin(browser, "ix", { width: 390, height: 844 });
  await play(page);
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.locator("#result")).toContainText("You climbed 0 of 7 stops");
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/admin/insights");
    const card = page.getByRole("region", { name: "Caught per question" });
    const chart = card.getByRole("img");
    await expect(chart.locator(":scope > div").first().locator("span")).toHaveText(["100%", "75%", "50%", "25%", "0%"]);
    const labels = await chart.evaluate((img) => {
      const [axis, column] = [...img.children] as HTMLElement[];
      const box = column.getBoundingClientRect();
      // A bar's height is a share of the column's padding box: above its bottom rule.
      const bottom = box.bottom - parseFloat(getComputedStyle(column).borderBottomWidth);
      const height = bottom - box.top;
      const card = img.closest("section")!.getBoundingClientRect();
      const chartBottom = img.getBoundingClientRect().bottom;
      return [...axis.children].map((span) => {
        const r = span.getBoundingClientRect();
        return {
          off: Math.abs((r.top + r.bottom) / 2 - (bottom - (parseInt(span.textContent!) / 100) * height)),
          inside: r.top >= card.top && r.bottom <= chartBottom,
        };
      });
    });
    for (const { off, inside } of labels) {
      expect(off).toBeLessThanOrEqual(1);
      expect(inside).toBe(true);
    }
  }
});

// With nothing for tomorrow, the rail's first row warns in the danger colour and says what to do, the phone's Waiting
// strip shows it first, and Puzzles has an empty slot that says how days get drafted; with tomorrow approved, none of
// them shows (criterion 7; answers 27 to 29).
test("the admin is warned when tomorrow has no puzzle", async ({ browser }) => {
  const { rows } = await DB.query<{ tomorrow: string; taken: boolean }>(
    "select (private.today() + 1)::text as tomorrow, exists (select 1 from private.puzzle where game_id = 'offbeat' and puzzle_date = private.today() + 1) as taken",
  );
  const { tomorrow } = rows[0];
  expect(rows[0].taken, "the test needs tomorrow free").toBe(false);

  const page = await admin(browser, "tw", { width: 1440, height: 900 });
  await page.goto("/admin/puzzles");
  const first = page.getByRole("complementary", { name: "What needs you" }).getByRole("link").first();
  await expect(first).toContainText("Tomorrow has no puzzle");
  await expect(first).toContainText("Draft it before midnight Pacific");
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
  await expect(days.getByRole("button", { name: /Not drafted/ })).toHaveAttribute("aria-pressed", "false");
  await days.getByRole("button", { name: /Not drafted/ }).click();
  await expect(days.getByRole("button", { pressed: true })).toHaveText(/Not drafted/);
  await expect(page.getByText(/^Nothing drafted for .+\. A Claude session drafts days from the question bank\.$/)).toBeVisible();

  const phone = await admin(browser, "tp", { width: 360, height: 800 });
  await phone.goto("/admin/puzzles");
  await expect(phone.getByRole("navigation", { name: "Admin" }).getByRole("link").first()).toHaveText("Tomorrow has no puzzle");

  await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [tomorrow, fixtureDay(tomorrow, await loadFixtureBase(DB))]);
  try {
    await page.reload();
    await expect(first).toContainText("to approve");
    await expect(page.getByText(/^Tomorrow /)).toHaveCount(0);
    await expect(days.getByRole("button", { name: /Not drafted/ })).toHaveCount(0);
    await expect(days.getByRole("button", { pressed: true })).toHaveCount(1);
    await phone.reload();
    await expect(phone.getByRole("navigation", { name: "Admin" }).getByRole("button", { name: /Puzzles/ })).toBeVisible();
    await expect(phone.getByText(/^Tomorrow /)).toHaveCount(0);
  } finally {
    await DB.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [tomorrow]);
  }
});
