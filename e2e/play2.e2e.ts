// A whole day of game 2 at /play2 (docs/milestones/M16-16d-playing-it.md, 16d-2), on a day and words of this test's own,
// as the real list isn't in git. Clocks that would take 20 seconds are run out in the database.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { GAME } from "../src/platform/game";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
// A friend's finished run is written with the round rules off, which needs the local superuser.
const ADMIN = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
const ROUNDS = ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"];
const WORDS = ["aqkb", "aqkqmb", "aqmb", "aqmjb", "aqyzb", "aqyzc", "aqyzd"];
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
  await ADMIN.end();
});

test("a signed-out visit shows sign-in", async ({ page }) => {
  await page.goto("/play2");
  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
});

test("a day with no puzzle says so", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "pn");
  await page.goto("/play2");
  await expect(page.getByRole("heading", { name: "Game number 2" })).toBeVisible();
  await expect(page.getByText("There's no puzzle today.")).toBeVisible();
});

// Each test that plays adds the day itself, as a retry runs in a new worker, whose cleanup took it away.
const addDay = () =>
  DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('substrings', $1::date, $2) on conflict do nothing", [today, { format: 1, game_id: "substrings", date: today, rounds: ROUNDS, bonus_letter: "j" }]);

test("a whole day: a word, each reason, a lockout, a timeout, Next and the results", async ({ page }) => {
  // The screen loads its village too now (M16 16g-2), and each round's end plays its moment.
  test.setTimeout(120_000);
  await addDay();
  await page.goto("/");
  await signInAndPick(page, "pl");
  await page.goto("/play2");
  await page.getByRole("button", { name: "Start" }).click();

  const box = page.getByLabel("Your word");
  const reason = page.getByRole("region", { name: "Game number 2" }).getByRole("status");
  await expect(page.getByText("qk", { exact: true })).toBeVisible();
  await expect(page.getByText("Bonus letter j")).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByText("Letters used: 0 of 26")).toBeVisible();

  // A second Enter on the way doesn't hide the reason behind the lockout's.
  await box.fill("zzzqqqzz");
  await box.evaluate((input: HTMLInputElement) => {
    input.form!.requestSubmit();
    input.form!.requestSubmit();
  });
  await expect(reason).toHaveText("Not in the dictionary.");
  await expect(box).toHaveValue("");
  // Within the lockout the box stays usable, and a try is refused unjudged. This one try's "locked" answer is stubbed with
  // the real run: on CI the software-drawn village held the page past the 0.5 s lockout, and the server's lockout itself is
  // checked in src/app/api/substrings/route.db.test.ts (docs/milestones/M16-16g-2-midnight-brew-in-play2.md, answer 22).
  await page.route("**/api/substrings/try", async (route) => {
    const headers = { "x-protocol": route.request().headers()["x-protocol"] };
    const { run } = await (await page.request.get("/api/substrings", { headers })).json();
    await route.fulfill({ json: { ok: true, outcome: "locked", run } });
  }, { times: 1 });
  await box.fill("aqkb");
  await expect(box).toBeEnabled();
  await box.press("Enter");
  await expect(reason).toHaveText("Too quick. Try again in a moment.");
  await expect(box).toHaveValue("");
  await page.waitForTimeout(600);
  await box.fill("aqmb");
  await box.press("Enter");
  await expect(reason).toHaveText("Needs the letters qk.");
  await expect(box).toHaveValue("");
  await page.waitForTimeout(600);
  // Letters typed while a refusal is on its way are the next word, and stay.
  let answer = () => {};
  const answered = new Promise<void>((resolve) => (answer = resolve));
  await page.route("**/api/substrings/try", async (route) => {
    await answered;
    await route.continue();
  });
  await box.fill("zzzqqqzz");
  await box.press("Enter");
  await box.fill("aq");
  answer();
  await expect(reason).toHaveText("Not in the dictionary.");
  await expect(box).toHaveValue("aq");
  await page.unroute("**/api/substrings/try");
  await page.waitForTimeout(600);
  // What doesn't register clears too, and costs no lockout, as the word after it shows.
  for (const nothing of ["123", "  "]) {
    await box.fill(nothing);
    await box.press("Enter");
    await expect(box).toHaveValue("");
  }
  await box.fill("aqkqmb");
  await box.press("Enter");

  // Between rounds there's no clock and no letters yet, and Next has the focus once the village's change has cast
  // (16g-2; 16g-1 answer 25), so Enter goes on. The word's points show, and the tracker has its letters (M16 16e, answer 20).
  await expect(page.getByText("You played aqkqmb: 40 points.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Letters used: 5 of 26")).toBeVisible();
  // The row of letters marks just those: a marked letter is the only one with a class.
  const marked = page.getByRole("region", { name: "Game number 2" }).locator('p[aria-hidden="true"] span[class]');
  await expect(marked).toHaveText(["a", "b", "k", "m", "q"]);
  await expect(page.getByRole("timer")).toBeHidden();
  await expect(page.getByText("qm", { exact: true })).toBeHidden();
  const next = page.getByRole("region", { name: "Game number 2" }).getByRole("button", { name: "Next question", exact: true });
  await expect(next).toBeFocused({ timeout: 15_000 });
  await page.keyboard.press("Enter");
  await expect(page.getByText("qm", { exact: true })).toBeVisible();

  await box.fill("aqkqmb");
  await box.press("Enter");
  await expect(reason).toHaveText("Already used.");
  await expect(box).toHaveValue("");
  await page.waitForTimeout(600);
  // A word holding the bonus letter earns its points too, once.
  await box.fill("aqmjb");
  await box.press("Enter");
  await expect(page.getByText("You played aqmjb: 30 points, and 120 for the bonus letter.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Letters used: 6 of 26")).toBeVisible();
  await expect(marked).toHaveText(["a", "b", "j", "k", "m", "q"]);
  await next.click();
  await expect(page.getByText("qnp", { exact: true })).toBeVisible();

  // A try past the clock moves the screen on, as the server says.
  await runOut();
  await box.fill("aqmb");
  await box.press("Enter");
  await expect(page.getByText("Time's up.")).toBeVisible({ timeout: 15_000 });
  await next.click();
  await expect(page.getByText("qrs", { exact: true })).toBeVisible();

  // So does the clock reaching zero, with no reload. Six seconds are left, as the reload has to land inside them.
  await DB.query("update private.question_open set opened_at = opened_at - interval '14 seconds' where game_id = 'substrings' and question_idx = 3");
  await page.reload();
  await expect(page.getByText("qrs", { exact: true })).toBeVisible();
  await expect(page.getByText("Time's up.")).toBeVisible({ timeout: 15_000 });
  await next.click();
  await expect(page.getByText("qtv", { exact: true })).toBeVisible();

  // The rest run out.
  for (let i = 4; i < 6; i++) {
    await runOut();
    await page.reload();
    await expect(page.getByText("Time's up.")).toBeVisible();
    await next.click();
    await expect(page.getByText(ROUNDS[i + 1], { exact: true })).toBeVisible();
  }
  // A friend has finished today with no word, so the end ranks the run among friends (M16 16e-2).
  const client = await ADMIN.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    const friend = (await client.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [`${RUN}-plf@example.test`])).rows[0].id;
    await client.query("insert into private.friendship (user_a, user_b) select least($1::uuid, id), greatest($1::uuid, id) from auth.users where email = $2", [friend, `${RUN}-pl@example.test`]);
    await client.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'substrings', $2::date, now() - interval '1 hour')", [friend, today]);
    await client.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx, opened_at) values ($1, 'substrings', $2::date, 6, now() - interval '1 hour')", [friend, today]);
    await client.query("commit");
  } finally {
    client.release();
  }
  await runOut();
  await page.reload();
  await expect(page.getByText("1st of 2 with your friends so far today.")).toBeVisible();

  const results = page.getByRole("list", { name: "Your rounds" });
  await expect(results.getByRole("listitem")).toHaveCount(7);
  await expect(results.getByRole("listitem").first()).toContainText("aqkqmb, 40 points");
  await expect(results.getByRole("listitem").nth(1)).toContainText("aqmjb, 30 points, and 120 for the bonus letter");
  await expect(results.getByRole("listitem").last()).toContainText("aqyzb, aqyzc, aqyzd");
  // The score: two words, one with the bonus letter, and six different letters cashed in.
  await expect(page.getByRole("definition")).toHaveText(["70", "120", "65", "255"]);
  await expect(page.getByText("Bonus letter j, in 1 word")).toBeVisible();
  await expect(page.getByText("Different letters, 6 of 26")).toBeVisible();
});

test("a tab left between rounds finds the day it's in, and a real failure says so", async ({ page }) => {
  // The screen loads its village too now (M16 16g-2), and each round's end plays its moment.
  test.setTimeout(120_000);
  await addDay();
  await page.goto("/");
  await signInAndPick(page, "pm");
  await page.goto("/play2");
  await page.getByRole("button", { name: "Start" }).click();
  const box = page.getByLabel("Your word");
  await box.fill("aqkb");
  await box.press("Enter");
  const game = page.getByRole("region", { name: "Game number 2" });
  const next = game.getByRole("button", { name: "Next question", exact: true });
  await expect(next).toBeVisible({ timeout: 15_000 });
  // The server failing isn't the screen being behind: it's said, and the player can try again.
  await page.route("**/api/substrings/next", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, error: "internal" }) }));
  await next.click();
  await expect(game.getByRole("alert")).toBeVisible();
  await expect(next).toBeVisible();
  await page.unroute("**/api/substrings/next");
  // As a new day leaves it: the run this screen shows isn't today's any more.
  await DB.query("delete from private.run where game_id = 'substrings' and user_id = (select id from auth.users where email = $1)", [`${RUN}-pm@example.test`]);
  await game.getByRole("button", { name: "Next question", exact: true }).click();
  await expect(game.getByRole("button", { name: "Start" })).toBeVisible();
});

test("game 1 stays as it was", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "pg");
  await expect(page.getByRole("heading", { name: "Plor, Today" })).toBeVisible();
  await expect(page.getByRole("region", { name: GAME.name })).toBeVisible();
  await expect(page.getByRole("region", { name: "Game number 2" })).toHaveCount(0);
});

// The Friends page's leaderboard switches between the games (M16 16e-2, answers 23 and 24), and game 2's adds up places.
test("the friends leaderboard switches to game 2", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "qb");
  await page.goto("/friends");
  const board = page.getByRole("region", { name: "Friends leaderboard" });
  const games = board.getByRole("radiogroup", { name: "Game" });
  await expect(games.getByRole("radio", { name: GAME.name })).toBeChecked();
  await expect(board.getByText("Each day adds the % of players you beat.")).toHaveCount(0);
  await games.getByText("Game number 2").click();
  await expect(games.getByRole("radio", { name: "Game number 2" })).toBeChecked();
  await expect(board.getByText("Each day adds the % of players you beat.")).toBeVisible();
  // A new player's week: their own row, a plain 0, as places aren't points.
  await expect(board.getByRole("region", { name: "This week" }).getByRole("listitem").first()).toContainText("(you)");
  await expect(board.getByRole("region", { name: "This week" }).getByRole("listitem").first()).not.toContainText("points");
});
