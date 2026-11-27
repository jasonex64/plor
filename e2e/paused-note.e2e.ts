// The paused site's note (docs/milestones/M23-23f-the-switch.md, 23f-1; answers 69 to 71): with no day approved for either
// game, a guest and a signed-in player read "Plor is being rebuilt. Back soon." where the old "no puzzle" line was, on both
// games, with no "A new day starts in" beside it; and the signed-out front page's line for Offbeat is the clock game's own.
// Like play2.e2e.ts's test of a day with no puzzle, it needs today free of a day for each game, and says so if one is there
// (as e2e/puzzle.ts does): the other files add their days to the shared database and remove them in afterAll.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { GAME, SUBSTRINGS } from "../src/platform/game";
import { RUN, signInAndPick } from "./players";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
const NOTE = "Plor is being rebuilt. Back soon.";
const COUNTDOWN = "A new day starts in";

test.beforeAll(async () => {
  const { rows } = await DB.query<{ game_id: string }>("select game_id from private.puzzle where puzzle_date = private.today()");
  if (rows.length > 0) throw new Error(`today has a day for ${rows.map((r) => r.game_id).join(", ")}; this file needs both games paused`);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

test("a guest's front page says the site is being rebuilt, and Offbeat's line is the clock game's", { tag: "@visual" }, async ({ page }) => {
  await page.goto("/");
  // With neither game's day approved only Offbeat's card shows, and it carries the note (src/app/today-games.ts).
  await expect(page.getByRole("region", { name: GAME.name, exact: true }).getByText(NOTE)).toBeVisible();
  await expect(page.getByText(NOTE)).toHaveCount(1);
  await expect(page.getByText(COUNTDOWN)).toHaveCount(0);
  await expect(page.getByText("Three questions, one clock. Name as many as you can.", { exact: true })).toBeVisible();
});

test("a player's Today says the site is being rebuilt", { tag: "@visual" }, async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "pnote");
  await expect(page.getByRole("region", { name: GAME.name, exact: true }).getByText(NOTE)).toBeVisible();
  await expect(page.getByText(NOTE)).toHaveCount(1);
  await expect(page.getByText(COUNTDOWN)).toHaveCount(0);
});

test("Offbeat's page says the site is being rebuilt", { tag: "@visual" }, async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "pnoteo");
  await page.goto(GAME.path);
  await expect(page.getByText(NOTE)).toBeVisible();
  await expect(page.getByText(COUNTDOWN)).toHaveCount(0);
});

test("Fragments' page says the site is being rebuilt", { tag: "@visual" }, async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "pnotef");
  await page.goto("/play2");
  await expect(page.getByRole("heading", { name: SUBSTRINGS.name, exact: true })).toBeVisible();
  await expect(page.getByText(NOTE)).toBeVisible();
  await expect(page.getByText(COUNTDOWN)).toHaveCount(0);
});
