// Game 2's run in Midnight Brew (docs/milestones/M16-16g-2-midnight-brew-in-play2.md, 16g-2a and 16g-2b), on a day and words of this
// test's own, as e2e/play2.e2e.ts plays the run's rules: here the village. Full screen with the way out, the village in
// before Start, the camera still whenever the box has focus (16g-1 answer 9), the word's moment, the change casting while
// Next waits (16g-1 answer 25), a refused try's fizzle with no camera move (answer 7), the short finale after round 7 by
// itself and the cards after it (16g-1 answer 26), and no console errors throughout.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const ROUNDS = ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"];
const WORDS = ["aqkqmb", "aqmjb", "aqyzbcdefg"];
let today = "";

test.beforeAll(async () => {
  today = (await DB.query<{ d: string }>("select private.today()::text as d")).rows[0].d;
  await DB.query("insert into private.dictionary_word (word_key, spelling, plain, everyday) select w, w, w, true from unnest($1::text[]) as w on conflict do nothing", [WORDS]);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-b%@example.test`]);
  await DB.query("delete from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [today]);
  await DB.query("delete from private.dictionary_word where word_key = any($1)", [WORDS]);
  await DB.end();
});

const addDay = () =>
  DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('substrings', $1::date, $2) on conflict do nothing", [today, { format: 1, game_id: "substrings", date: today, rounds: ROUNDS, bonus_letter: "j" }]);
const runOut = async () => {
  await DB.query("update private.run set started_at = started_at - interval '21 seconds' where game_id = 'substrings'");
  await DB.query("update private.question_open set opened_at = opened_at - interval '21 seconds' where game_id = 'substrings'");
};

// Console errors and page errors, so a broken scene fails the test.
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return errors;
}

test("a run in the village: full screen, the moments, the camera still at the box, the finale and the cards", async ({ browser }) => {
  test.setTimeout(120_000);
  await addDay();
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "bw");
  const errors = watchErrors(page);
  await page.goto("/play2");

  const game = page.getByRole("region", { name: "Game number 2" });
  const scene = game.locator("[data-camera]");
  const box = page.getByLabel("Your word");
  // Full screen: the shell's bars hide while a run shows (answer 2).
  await expect(page.locator("body[data-game]")).toHaveCount(1);
  // Start waits for the village and the witch (answer 11), whose canvas joins the page once they're in.
  await expect(game.getByRole("button", { name: "Start" })).toBeEnabled({ timeout: 30_000 });
  await expect(game.locator("canvas")).toBeVisible();
  await game.getByRole("button", { name: "Start" }).click();
  await expect(box).toBeFocused();
  await expect(scene).toHaveAttribute("data-camera", "still");

  // A refused try fizzles and moves nothing (answer 7).
  await box.fill("zzzqqqzz");
  await box.press("Enter");
  await expect(game.getByRole("status")).toHaveText("Not in the dictionary.");
  await expect(scene).toHaveAttribute("data-camera", "still");
  await page.waitForTimeout(600);

  // A good word's moment, then the change casts while Next waits; the box comes back with the camera still.
  await box.fill("aqkqmb");
  await box.press("Enter");
  const next = game.getByRole("button", { name: "Next question" });
  await expect(game.getByRole("button", { name: "Casting the spell…" })).toBeDisabled({ timeout: 15_000 });
  await expect(game.getByText("You played aqkqmb: 40 points.")).toBeVisible();
  await expect(next).toBeFocused({ timeout: 15_000 });
  await expect(scene).toHaveAttribute("data-camera", "still");
  await next.click();
  await expect(game.getByText("qm", { exact: true })).toBeVisible();
  await expect(box).toBeFocused();
  await expect(scene).toHaveAttribute("data-camera", "still");

  // A try past the clock: the time-up's moment plays and the change still casts while Next waits (16g-1 answer 27).
  await runOut();
  await box.fill("aqmb");
  await box.press("Enter");
  await expect(game.getByRole("button", { name: "Casting the spell…" })).toBeDisabled({ timeout: 15_000 });
  await expect(game.getByText("Time's up.")).toBeVisible();
  await expect(next).toBeFocused({ timeout: 15_000 });
  await next.click();
  await expect(game.getByText("qnp", { exact: true })).toBeVisible();
  // Rounds 3 to 6 run out in the database and reload, where the village stands as the run does.
  for (let i = 2; i < 6; i++) {
    await runOut();
    await page.reload();
    await expect(game.getByText("Time's up.")).toBeVisible({ timeout: 30_000 });
    await expect(next).toBeEnabled({ timeout: 15_000 });
    await next.click();
    await expect(game.getByText(ROUNDS[i + 1], { exact: true })).toBeVisible();
  }
  // Round 7, live: a huge word, then the finale by itself and the cards, with no button between (16g-1 answer 26).
  await expect(box).toBeFocused();
  await box.fill("aqyzbcdefg");
  await box.press("Enter");
  await expect(page.getByRole("list", { name: "Your rounds" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("body[data-game]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("the way out leads back to Today", async ({ browser }) => {
  await addDay();
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "bx");
  await page.goto("/play2");
  await page.getByRole("button", { name: "Back to Today" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("body[data-game]")).toHaveCount(0);
});

// Reduce motion's calm version (16g-2b, answers 5, 23 to 31): the camera never moves; between moments the village holds
// still, so two pictures of it a few draws apart are the same, before Start and at round 7, and with Reduce motion off
// they differ (the check can see motion); a switch during a moment waits for it, and the next moment follows (answer 26);
// and a whole run plays to the cards.
test("Reduce motion: the camera never moves, the village holds still, a switch is followed, and a run plays to the cards", async ({ browser }) => {
  // The first test's 120 s, plus about 30 s of pictures and waits below.
  test.setTimeout(150_000);
  await addDay();
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await signInAndPick(page, "bc");
  const errors = watchErrors(page);
  // Any camera move at all, kept per page load.
  await page.addInitScript(() => {
    const w = window as unknown as { __moved: boolean };
    w.__moved = false;
    new MutationObserver(() => { if (document.querySelector('[data-camera="moving"]')) w.__moved = true; })
      .observe(document, { subtree: true, attributes: true, attributeFilter: ["data-camera"] });
  });
  const moved = () => page.evaluate(() => (window as unknown as { __moved: boolean }).__moved);
  const forget = () => page.evaluate(() => { (window as unknown as { __moved: boolean }).__moved = false; });
  await page.goto("/play2");

  const game = page.getByRole("region", { name: "Game number 2" });
  const box = page.getByLabel("Your word");
  const next = game.getByRole("button", { name: "Next question" });
  await expect(game.getByRole("button", { name: "Start" })).toBeEnabled({ timeout: 30_000 });
  // The animals in and grown (their fade-in takes 0.8 s, village.ts), so nothing is still arriving.
  await expect(game.locator('[data-extras="in"]')).toHaveCount(1, { timeout: 30_000 });
  await page.waitForTimeout(1_000);
  const canvas = game.locator("canvas");
  // Two pictures 2 s apart: past SLOW_DRAW_MS and a draw on a slow GPU, so at least one draw lands between them.
  const still = async () => {
    const a = await canvas.screenshot();
    await page.waitForTimeout(2_000);
    return a.equals(await canvas.screenshot());
  };
  expect(await still()).toBe(true);
  // With Reduce motion off the same pictures differ, so the check can see motion; switched back, it holds still again once
  // the smoke already rising has gone: its particles live 3.5 s (village.ts) less or more by a fifth (scene.ts's
  // lifeJitter, 0.4), so up to 4.2 s; 5 s covers it.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await still()).toBe(false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(5_000);
  expect(await still()).toBe(true);

  await game.getByRole("button", { name: "Start" }).click();
  await expect(box).toBeFocused();
  // A word's quiet moment, the change fading in while Next waits.
  await box.fill("aqkqmb");
  await box.press("Enter");
  await expect(game.getByRole("button", { name: "Casting the spell…" })).toBeDisabled({ timeout: 15_000 });
  await expect(game.getByText("You played aqkqmb: 40 points.")).toBeVisible();
  await expect(next).toBeFocused({ timeout: 15_000 });
  await next.click();
  await expect(game.getByText("qm", { exact: true })).toBeVisible();
  // Switched during a run (answer 26): with Reduce motion off, the time-up's moment moves the camera; switched back while
  // it plays, that moment finishes as it began, and the cast after it, the next moment, is calm again.
  expect(await moved()).toBe(false);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await runOut();
  await box.fill("aqmb");
  await box.press("Enter");
  await expect.poll(moved, { timeout: 15_000 }).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(game.getByText("Time's up.")).toBeVisible({ timeout: 15_000 });
  await forget();
  await expect(next).toBeFocused({ timeout: 15_000 });
  expect(await moved()).toBe(false);
  await next.click();
  await expect(game.getByText("qnp", { exact: true })).toBeVisible();
  expect(await moved()).toBe(false);
  // Rounds 3 to 6 run out in the database and reload.
  for (let i = 2; i < 6; i++) {
    await runOut();
    await page.reload();
    await expect(game.getByText("Time's up.")).toBeVisible({ timeout: 30_000 });
    await expect(next).toBeEnabled({ timeout: 15_000 });
    await next.click();
    await expect(game.getByText(ROUNDS[i + 1], { exact: true })).toBeVisible();
    expect(await moved()).toBe(false);
  }
  // At round 7, with six changes in, the village holds still too: the bats, ghosts, skeletons, spider and the house.
  await expect(game.locator('[data-extras="in"]')).toHaveCount(1, { timeout: 30_000 });
  await page.waitForTimeout(1_000);
  expect(await still()).toBe(true);
  // Round 7's huge word gets the same quiet moment, then the column fades up and the cards follow.
  await expect(box).toBeFocused();
  await box.fill("aqyzbcdefg");
  await box.press("Enter");
  await expect(page.getByRole("list", { name: "Your rounds" })).toBeVisible({ timeout: 20_000 });
  expect(await moved()).toBe(false);
  expect(errors).toEqual([]);
});
