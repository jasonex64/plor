// Fragments' test run (docs/milestones/M15-15f-fragments-test-run.md, 15f-2), as test-run.e2e.ts is Offbeat's: an admin presses
// Play test on the Puzzles page, plays a whole day on the real screen (an accepted word, each refusal, timeouts, the end), sees
// its result with no Share, comments or board, and goes back; the database's counts are as they were. The days and their words
// are this test's own, as the real list isn't in git; the draft is written to content/substrings for this test and removed
// after. The 20 seconds are the browser's own countdown, run out with a fake clock, as test-run.e2e.ts does.
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { dayText } from "../src/app/day-text";
import { SUBSTRINGS } from "../src/platform/game";
import { RUN, signInAndPick } from "./players";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
const DRAFTS = join(process.cwd(), "content", "substrings");
const ROUNDS = ["zx", "zy", "zqp", "zrs", "ztv", "zwu", "zkl"];
const WORDS = ["azxzyb", "azyb", "azqpb", "ajzklb"];
let ahead = "";
let approvedOnly = "";
let draftFile = "";
let createdFolder = false;

const game = (page: Page) => page.getByRole("region", { name: SUBSTRINGS.name, exact: true });
const next = (page: Page) => game(page).getByRole("button", { name: "Next", exact: true });
const letters = (page: Page, set: string) => expect(game(page).getByText(set, { exact: true })).toBeVisible();
const COUNTED = ["run", "question_open", "round_word", "round_reject", "points_ledger"];
const counts = async () => (await DB.query<{ n: number[] }>(`select array[${COUNTED.map((t) => `(select count(*)::int from private.${t})`).join(", ")}] as n`)).rows[0].n;

test.beforeAll(async () => {
  ahead = (await DB.query<{ d: string }>("select (private.today() + 480)::text as d")).rows[0].d;
  approvedOnly = (await DB.query<{ d: string }>("select (private.today() + 481)::text as d")).rows[0].d;
  await DB.query("insert into private.dictionary_word (word_key, spelling, plain, everyday) select w, w, w, true from unnest($1::text[]) as w on conflict do nothing", [WORDS]);
  await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('substrings', $1::date, $2)", [approvedOnly, { format: 1, game_id: "substrings", date: approvedOnly, rounds: ROUNDS, bonus_letter: "j" }]);
  createdFolder = !existsSync(DRAFTS);
  mkdirSync(DRAFTS, { recursive: true });
  draftFile = join(DRAFTS, `${ahead}.json`);
  if (existsSync(draftFile)) throw new Error(`${draftFile} exists; this test writes its own draft there`);
  writeFileSync(draftFile, JSON.stringify({ format: 1, game_id: "substrings", date: ahead, rounds: ROUNDS, bonus_letter: "j" }));
});

test.afterAll(async () => {
  if (draftFile) rmSync(draftFile, { force: true });
  if (createdFolder && existsSync(DRAFTS) && readdirSync(DRAFTS).length === 0) rmdirSync(DRAFTS);
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.query("delete from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [approvedOnly]);
  await DB.query("delete from private.dictionary_word where word_key = any($1)", [WORDS]);
  await DB.end();
});

async function openFromPuzzles(page: Page, date: string) {
  await page.goto("/admin/puzzles");
  await page.getByRole("navigation", { name: "Days" }).getByRole("button", { name: dayText(date) }).click();
  const link = page.getByRole("region", { name: `${SUBSTRINGS.name} day` }).getByRole("link", { name: "Play test" });
  // As calm.e2e.ts holds every control to: 44px tall.
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/admin/test2/${date}$`));
}

const tryWord = async (page: Page, text: string) => {
  await page.getByLabel("Your word").fill(text);
  await game(page).getByRole("button", { name: "Try", exact: true }).click();
};

test("an admin plays a whole Fragments day as a test run, sees its result and goes back, and nothing is saved", async ({ browser }) => {
  test.slow();
  const before = await counts();
  const admin = await (await browser.newContext()).newPage();
  await admin.clock.install();
  await admin.goto("/");
  await signInAndPick(admin, "fta");
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-fta@example.test`]);
  await openFromPuzzles(admin, ahead);

  // The draft is what's played, and said so, with Restart; Start begins round 1 on the real screen with the real clock.
  await expect(admin.getByText("Test run of the draft: nothing is saved")).toBeVisible();
  await game(admin).getByRole("button", { name: "Start", exact: true }).click();
  await letters(admin, "zx");
  const timer = admin.getByRole("timer").filter({ hasText: /seconds left/ });
  await expect(timer).toHaveText("20 seconds left");
  // The label and Restart stay above the round (as Offbeat's test run's do).
  await expect(admin.getByText("Test run of the draft: nothing is saved")).toBeVisible();
  await expect(admin.getByRole("button", { name: "Restart" })).toBeVisible();

  // Each refusal, with the real screen's words; then a word with the letters, that is a word.
  await tryWord(admin, "zzzzqqq");
  await expect(admin.getByText("Not in the dictionary.")).toBeVisible();
  await tryWord(admin, "azyb");
  await expect(admin.getByText("Needs the letters zx.")).toBeVisible();
  await tryWord(admin, "azxzyb");
  await expect(game(admin).getByText(/You played azxzyb: \d+ points/).first()).toBeVisible();

  // Round 2: its time runs out. Round 3: a word. Rounds 4 to 6 run out. Round 7: a word with the bonus letter.
  await next(admin).click();
  await letters(admin, "zy");
  // Used in round 1, which also holds zy.
  await tryWord(admin, "azxzyb");
  await expect(admin.getByText("Already used.")).toBeVisible();
  await admin.clock.fastForward("00:20");
  await expect(game(admin).getByText("Time's up.").first()).toBeVisible();
  await next(admin).click();
  await letters(admin, "zqp");
  await tryWord(admin, "azqpb");
  await expect(game(admin).getByText(/You played azqpb: \d+ points/).first()).toBeVisible();
  for (const set of ["zrs", "ztv", "zwu"]) {
    await next(admin).click();
    await letters(admin, set);
    await admin.clock.fastForward("00:20");
    await expect(game(admin).getByText("Time's up.").first()).toBeVisible();
  }
  await next(admin).click();
  await letters(admin, "zkl");
  await tryWord(admin, "ajzklb");
  await expect(game(admin).getByText(/You played ajzklb: \d+ points, and 120 for the bonus letter/).first()).toBeVisible();

  // The result: the score, each round, a missed round's examples; no Share, comments or board; the way back stays.
  await game(admin).getByRole("button", { name: "See results", exact: true }).click();
  await expect(game(admin).getByRole("heading", { name: "Your score" })).toBeVisible();
  const rounds = game(admin).getByRole("list", { name: "Your rounds" });
  await expect(rounds.getByRole("listitem")).toHaveCount(7);
  await expect(rounds.getByText("Missed")).toHaveCount(4);
  await expect(rounds.getByText("You could have played").first()).toBeVisible();
  await expect(admin.getByRole("button", { name: /share/i })).toHaveCount(0);
  await expect(admin.getByRole("region", { name: `${SUBSTRINGS.name} comments` })).toHaveCount(0);
  await expect(admin.getByText(/Better than \d+% of players/)).toHaveCount(0);
  await expect(admin.getByText("Test run of the draft: nothing is saved")).toBeVisible();

  // Restart plays it again from Start; the way back goes to the Puzzles page.
  await admin.getByRole("button", { name: "Restart" }).click();
  await expect(game(admin).getByRole("button", { name: "Start", exact: true })).toBeVisible();
  await admin.getByRole("link", { name: "Puzzles" }).click();
  await expect(admin).toHaveURL(/\/admin\/puzzles$/);

  // Nothing of any run was saved.
  expect(await counts()).toEqual(before);
});

test("a day with no draft plays as approved, and the × goes back to the Puzzles page", async ({ browser }) => {
  const before = await counts();
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/");
  await signInAndPick(admin, "ftb");
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-ftb@example.test`]);
  await openFromPuzzles(admin, approvedOnly);
  await expect(admin.getByText("Test run: nothing is saved")).toBeVisible();
  await game(admin).getByRole("button", { name: "Start", exact: true }).click();
  await letters(admin, "zx");
  await admin.getByRole("button", { name: "Back to Puzzles" }).click();
  await expect(admin).toHaveURL(/\/admin\/puzzles$/);
  expect(await counts()).toEqual(before);
});

test("a player who isn't an admin sees no game on a Fragments test run's page", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "ftc");
  await page.goto(`/admin/test2/${ahead}`);
  await expect(page.getByRole("alert").filter({ hasText: "This page is for admins only." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toHaveCount(0);
});
