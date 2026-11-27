// The question bank's admin page (docs/milestones/M13-13d-the-question-bank.md): an admin sees each bank question with
// the days it ran, from content/bank.json and the drafted days in content/offbeat; a player who isn't an admin sees the
// refusal. The bank and drafts are the repo's own (T1, 2026-10-24).
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { dayText } from "../src/app/day-text";
import { RUN, signInAndPick } from "./players";
import { localStack } from "../scripts/slot.ts";

// Every question the page lists: the repo's bank, which grows with each batch (13e).
const QUESTIONS = (JSON.parse(readFileSync("content/bank.json", "utf8")) as { questions: unknown[] }).questions.length;
const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

test("an admin sees the bank's questions and the days they ran; a player can't", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/");
  await signInAndPick(admin, "bk");
  await expect(admin.getByRole("link", { name: "Play", exact: true }).or(admin.getByText("Plor is being rebuilt. Back soon."))).toBeVisible();
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-bk@example.test`]);
  await admin.goto("/admin");
  await admin.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Bank" }).click();
  // One row per question (docs/milestones/M14-14b-2b-2-admin-build.md, criterion 6), the days written as the admin
  // pages write them.
  const questions = admin.getByRole("region", { name: "Questions" });
  const animal = questions.getByRole("row", { name: "Name an animal", exact: true });
  await expect(animal.getByRole("cell").nth(1)).toHaveText("animal");
  await expect(animal.getByRole("listitem").filter({ hasText: dayText("2026-10-24") })).toBeVisible();
  await expect(questions.locator("tbody tr")).toHaveCount(QUESTIONS);
  // Clicking a question opens its answer pool under the row (docs/milestones/M15-15g-the-answer-pool.md). The bank is the
  // repo's own and asks real categories, which only a loaded answer database has: the fixture base on CI doesn't, and
  // the panel says so there.
  await animal.getByRole("button", { name: "Name an animal", exact: true }).click();
  const pool = questions.getByRole("region", { name: "Answer pool: animal" });
  await expect(pool.getByText(/answers? for any animal\.$/).or(pool.getByText("That category isn't in the answer database."))).toBeVisible();
  await expect(questions.locator("tbody tr")).toHaveCount(QUESTIONS + 1);
  await animal.getByRole("button", { name: "Name an animal", exact: true }).click();
  await expect(pool).toHaveCount(0);

  const player = await (await browser.newContext()).newPage();
  await player.goto("/");
  await signInAndPick(player, "bp");
  await expect(player.getByRole("link", { name: "Play", exact: true }).or(player.getByText("Plor is being rebuilt. Back soon."))).toBeVisible();
  await player.goto("/admin/bank");
  await expect(player.getByText("This page is for admins only.", { exact: true })).toBeVisible();
});
