// A drafted day of game 2 approved on /admin/puzzles (docs/milestones/M16-16c-a-day-of-game-2.md, 16c-2), and the page's
// one date for both games (docs/milestones/M15-15f-fragments-test-run.md, 15f-1). The days are far ahead, written to
// content/substrings for this test and removed after.
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { dayText } from "../src/app/day-text";
import { SUBSTRINGS } from "../src/platform/game";
import { RUN, signInAndPick } from "./players";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
const DRAFTS = join(process.cwd(), "content", "substrings");
const ROUNDS = ["ou", "lu", "att", "yin", "odo", "hec", "vet"];
const AFTER_ROUNDS = ["pr", "st", "ing", "ame", "ode", "ush", "ald"];
const THIRD_ROUNDS = ["bl", "dr", "ove", "ink", "ran", "elt", "oat"];
const REDRAFT = ["nt", "mu", "cen", "bin", "agr", "ipt", "vio"];
let ahead = "";
let draftFile = "";
let after = "";
let afterFile = "";
let third = "";
let thirdFile = "";
const dayFile = (rounds: string[], bonus_letter: string) => JSON.stringify({ format: 1, game_id: "substrings", date: ahead, rounds, bonus_letter });

test.beforeAll(async () => {
  ahead = (await DB.query<{ d: string }>("select (private.today() + 430)::text as d")).rows[0].d;
  mkdirSync(DRAFTS, { recursive: true });
  draftFile = join(DRAFTS, `${ahead}.json`);
  if (existsSync(draftFile)) throw new Error(`${draftFile} exists; this test writes its own draft there`);
  writeFileSync(draftFile, dayFile(ROUNDS, "f"));
  after = (await DB.query<{ d: string }>("select (private.today() + 431)::text as d")).rows[0].d;
  afterFile = join(DRAFTS, `${after}.json`);
  if (existsSync(afterFile)) throw new Error(`${afterFile} exists; this test writes its own draft there`);
  writeFileSync(afterFile, JSON.stringify({ format: 1, game_id: "substrings", date: after, rounds: AFTER_ROUNDS, bonus_letter: "z" }));
  third = (await DB.query<{ d: string }>("select (private.today() + 432)::text as d")).rows[0].d;
  thirdFile = join(DRAFTS, `${third}.json`);
  if (existsSync(thirdFile)) throw new Error(`${thirdFile} exists; this test writes its own draft there`);
  writeFileSync(thirdFile, JSON.stringify({ format: 1, game_id: "substrings", date: third, rounds: THIRD_ROUNDS, bonus_letter: "x" }));
});

test.afterAll(async () => {
  if (draftFile) rmSync(draftFile);
  if (afterFile) rmSync(afterFile);
  if (thirdFile) rmSync(thirdFile);
  if (readdirSync(DRAFTS).length === 0) rmdirSync(DRAFTS);
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.query("delete from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [ahead]);
  await DB.end();
});

test("an admin sees a drafted game 2 day and approves it", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/");
  await signInAndPick(admin, "gt");
  await expect(admin.getByRole("heading", { name: "Plor, Today" })).toBeVisible();
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-gt@example.test`]);
  await admin.goto("/admin/puzzles");

  await admin.getByRole("navigation", { name: "Days" }).getByRole("button", { name: dayText(ahead) }).click();
  const games = admin.getByRole("region", { name: `${SUBSTRINGS.name} day` });
  const day = games.getByRole("group", { name: dayText(ahead) });
  await expect(day.getByText("Draft, waiting for approval.")).toBeVisible();
  for (const set of ROUNDS) await expect(day.getByText(set, { exact: true })).toBeVisible();
  await expect(day.getByText("Bonus letter f")).toBeVisible();

  await day.getByRole("button", { name: "Approve day" }).click();
  await expect(day.getByRole("status")).toHaveText("Approved.");
  const stored = await DB.query("select content ->> 'bonus_letter' as bonus from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [ahead]);
  expect(stored.rows[0].bonus).toBe("f");

  await admin.reload();
  await admin.getByRole("navigation", { name: "Days" }).getByRole("button", { name: dayText(ahead) }).click();
  const again = games.getByRole("group", { name: dayText(ahead) });
  await expect(again.getByText("Approved.")).toBeVisible();

  // A redraft of an approved day doesn't pass as approved: players get the approved letters until it's approved again.
  writeFileSync(draftFile, dayFile(REDRAFT, "z"));
  await admin.reload();
  await admin.getByRole("navigation", { name: "Days" }).getByRole("button", { name: dayText(ahead) }).click();
  await expect(again.getByText("Approved, but it has been redrafted.", { exact: false })).toBeVisible();
  await expect(again.getByText("Bonus letter f")).toBeVisible();
  await expect(again.getByText("Bonus letter z")).toBeVisible();
  await again.getByRole("button", { name: "Approve again" }).click();
  await expect(again.getByRole("status")).toHaveText("Approved.");
  await expect(again.getByText("Bonus letter f")).toBeHidden();
  const replaced = await DB.query("select content ->> 'bonus_letter' as bonus from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [ahead]);
  expect(replaced.rows[0].bonus).toBe("z");
});

test("the chosen date shows one game 2 day, and choosing another date shows that one", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await admin.goto("/");
  await signInAndPick(admin, "gu");
  await expect(admin.getByRole("heading", { name: "Plor, Today" })).toBeVisible();
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-gu@example.test`]);
  await admin.goto("/admin/puzzles");

  const days = admin.getByRole("navigation", { name: "Days" });
  const games = admin.getByRole("region", { name: `${SUBSTRINGS.name} day` });
  await days.getByRole("button", { name: dayText(third) }).click();
  await expect(games.getByRole("group")).toHaveCount(1);
  await expect(games.getByRole("group", { name: dayText(third) })).toBeVisible();
  for (const set of THIRD_ROUNDS) await expect(games.getByText(set, { exact: true })).toBeVisible();
  await expect(games.getByText("pr", { exact: true })).toHaveCount(0);

  await days.getByRole("button", { name: dayText(after) }).click();
  await expect(games.getByRole("group")).toHaveCount(1);
  await expect(games.getByRole("group", { name: dayText(after) })).toBeVisible();
  for (const set of AFTER_ROUNDS) await expect(games.getByText(set, { exact: true })).toBeVisible();
  await expect(games.getByText("Bonus letter z")).toBeVisible();
  await expect(games.getByText("Bonus letter x")).toHaveCount(0);
});
