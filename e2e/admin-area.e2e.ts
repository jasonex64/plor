// The admin area in the shell (docs/milestones/M14-14b-2b-2-admin-build.md, criteria 1, 2, 3 and 5): /admin opens
// Puzzles inside the shell with Admin as the current section; the sub-tabs in two groups; what needs the admin in the
// right column from 1200px; the insights chart; on phones one menu in the sub-tabs' order.
import { expect, test, type Browser } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
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
  await expect(needs.getByRole("link")).toHaveText([/to approve/, /to review/, /reported comment/, /approved ahead/]);
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
