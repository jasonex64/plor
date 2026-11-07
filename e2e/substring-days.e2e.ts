// A drafted day of game 2 approved on /admin/puzzles (docs/milestones/M16-16c-a-day-of-game-2.md, 16c-2). The day is
// far ahead, written to content/substrings for this test and removed after.
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { dayText } from "../src/app/day-text";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const DRAFTS = join(process.cwd(), "content", "substrings");
const ROUNDS = ["ou", "lu", "att", "yin", "odo", "hec", "vet"];
let ahead = "";
let draftFile = "";

test.beforeAll(async () => {
  ahead = (await DB.query<{ d: string }>("select (private.today() + 430)::text as d")).rows[0].d;
  mkdirSync(DRAFTS, { recursive: true });
  draftFile = join(DRAFTS, `${ahead}.json`);
  if (existsSync(draftFile)) throw new Error(`${draftFile} exists; this test writes its own draft there`);
  writeFileSync(draftFile, JSON.stringify({ format: 1, game_id: "substrings", date: ahead, rounds: ROUNDS, bonus_letter: "f" }));
});

test.afterAll(async () => {
  if (draftFile) rmSync(draftFile);
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

  const games = admin.getByRole("region", { name: "Game 2 days" });
  const day = games.getByRole("group", { name: dayText(ahead) });
  await expect(day.getByText("Draft, waiting for approval.")).toBeVisible();
  for (const set of ROUNDS) await expect(day.getByText(set, { exact: true })).toBeVisible();
  await expect(day.getByText("Bonus letter f")).toBeVisible();

  await day.getByRole("button", { name: "Approve day" }).click();
  await expect(day.getByRole("status")).toHaveText("Approved.");
  const stored = await DB.query("select content ->> 'bonus_letter' as bonus from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [ahead]);
  expect(stored.rows[0].bonus).toBe("f");

  await admin.reload();
  await expect(games.getByRole("group", { name: dayText(ahead) }).getByText("Approved.")).toBeVisible();
});
