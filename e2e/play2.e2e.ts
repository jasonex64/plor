// A whole day of game 2 at /play2 (docs/milestones/M16-16d-playing-it.md, 16d-2), on a day and words of this test's own,
// as the real list isn't in git. Clocks that would take 20 seconds are run out in the database.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const ROUNDS = ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"];
const WORDS = ["aqkb", "aqmb", "aqyzb", "aqyzc", "aqyzd"];
let today = "";

const runOut = async () => {
  await DB.query("update private.run set started_at = started_at - interval '21 seconds' where game_id = 'substrings'");
  await DB.query("update private.question_open set opened_at = opened_at - interval '21 seconds' where game_id = 'substrings'");
};

test.beforeAll(async () => {
  today = (await DB.query<{ d: string }>("select private.today()::text as d")).rows[0].d;
  await DB.query("insert into private.dictionary_word (word_key, spelling, plain, everyday) select w, w, w, true from unnest($1::text[]) as w on conflict do nothing", [WORDS]);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.query("delete from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [today]);
  await DB.query("delete from private.dictionary_word where word_key = any($1)", [WORDS]);
  await DB.end();
});

test("a signed-out visit shows sign-in", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/play2");
  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
});

test("a day with no puzzle says so", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "pn");
  await page.goto("/play2");
  await expect(page.getByRole("heading", { name: "Game number 2" })).toBeVisible();
  await expect(page.getByText("There's no puzzle today.")).toBeVisible();
});

test("a whole day: a word, each reason, a lockout, a timeout, Next and the results", async ({ browser }) => {
  await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('substrings', $1::date, $2)", [today, { format: 1, game_id: "substrings", date: today, rounds: ROUNDS, bonus_letter: "j" }]);
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "pl");
  await page.goto("/play2");
  await page.getByRole("button", { name: "Start" }).click();

  const box = page.getByLabel("Your word");
  const reason = page.getByRole("region", { name: "Game number 2" }).getByRole("status");
  await expect(page.getByText("qk", { exact: true })).toBeVisible();
  await expect(page.getByText("Bonus letter j")).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();

  await box.fill("zzzqqqzz");
  await box.press("Enter");
  await expect(reason).toHaveText("Not in the dictionary.");
  // Within the lockout the box stays usable, and a try is refused unjudged.
  await box.fill("aqkb");
  await expect(box).toBeEnabled();
  await box.press("Enter");
  await expect(reason).toHaveText("Too quick. Try again in a moment.");
  await page.waitForTimeout(600);
  await box.fill("aqmb");
  await box.press("Enter");
  await expect(reason).toHaveText("Needs the letters qk.");
  await page.waitForTimeout(600);
  await box.fill("  ");
  await box.press("Enter");
  await box.fill("aqkb");
  await box.press("Enter");

  // Between rounds there's no clock and no letters yet.
  await expect(page.getByText("You played aqkb")).toBeVisible();
  await expect(page.getByRole("timer")).toBeHidden();
  await expect(page.getByText("qm", { exact: true })).toBeHidden();
  await page.getByRole("region", { name: "Game number 2" }).getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("qm", { exact: true })).toBeVisible();

  await box.fill("aqkb");
  await box.press("Enter");
  await expect(reason).toHaveText("Needs the letters qm.");
  await page.waitForTimeout(600);

  // The rest run out, and the screen moves on when its clock reaches zero or on a reload.
  for (let i = 1; i < 6; i++) {
    await runOut();
    await page.reload();
    await expect(page.getByText("Time's up.")).toBeVisible();
    await page.getByRole("region", { name: "Game number 2" }).getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText(ROUNDS[i + 1], { exact: true })).toBeVisible();
  }
  await runOut();
  await page.reload();

  const results = page.getByRole("list", { name: "Your rounds" });
  await expect(results.getByRole("listitem")).toHaveCount(7);
  await expect(results.getByRole("listitem").first()).toContainText("aqkb");
  await expect(results.getByRole("listitem").last()).toContainText("aqyzb, aqyzc, aqyzd");
});

test("game 1 stays as it was", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "pg");
  await expect(page.getByRole("heading", { name: "Plor, Today" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Game number 1" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Game number 2" })).toHaveCount(0);
});
