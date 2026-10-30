// A question's answer search (docs/milestones/M14-14b-12-answer-lists.md, criterion 4): a player caught at stop 1 opens
// Search answers on their result card and finds the answers that question accepted, with their tiers; a player mid-run
// has no search. On the fixture day under today (e2e/puzzle.ts).
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
let puzzle: TodayPuzzle;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-sr_@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

test("a player whose run is over searches a question's answers from the result card", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "sra");
  await play(page);
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  const result = page.locator("#result");
  await result.getByRole("button", { name: "Search answers" }).click();
  await page.getByLabel("Search the answers to Name an animal").fill("polar");
  const found = page.getByRole("list", { name: "Answers to Name an animal" });
  await expect(found.getByRole("listitem").filter({ hasText: "polar bear" })).toContainText("rare");
  // Another of its names finds it too, and says which name matched.
  await page.getByLabel("Search the answers to Name an animal").fill("maritimus");
  await expect(found.getByRole("listitem")).toHaveText(["polar bear (ursus maritimus) rare"]);
});

test("a player mid-run has no answer search", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "srb");
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await expect(page.getByRole("button", { name: "Search answers" })).toHaveCount(0);
});
