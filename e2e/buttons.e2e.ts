// M20 20b (docs/milestones/M20-design-rules-and-clean-up.md, answers 6, 11 and 45 to 47): the raised look only on a
// screen's one main action, the blue `.primary`, a 40px face on its 4px edge, so it stands no taller than a field beside
// it; every other button flat. Read from what the browser paints: a box and its shadow's drop.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, signInAndPick } from "./players";
import { caughtToCards } from "./game";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { GAME, SUBSTRINGS } from "../src/platform/game";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
const ROUNDS = ["zx", "zy", "zqp", "zrs", "ztv", "zwu", "zkl"];
let puzzle: TodayPuzzle;
let fragmentsDay = "";

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
  // A Fragments day of this file's own, far ahead, played as an admin's test run.
  fragmentsDay = (await DB.query<{ d: string }>("select (private.today() + 482)::text as d")).rows[0].d;
  await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('substrings', $1::date, $2)", [
    fragmentsDay,
    { format: 1, game_id: "substrings", date: fragmentsDay, rounds: ROUNDS, bonus_letter: "j" },
  ]);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.query("delete from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [fragmentsDay]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

// The top and the bottom the browser paints, the box and below it a hard shadow's drop, of a field and the button beside
// it, read together so a scroll between two reads can't move one of them.
const sameRow = async (field: Locator, button: Locator) => {
  await expect(button).toBeVisible();
  const [f, b] = await field.evaluate(
    (fieldNode, buttonNode) =>
      [fieldNode, buttonNode!].map((node) => {
        const box = node.getBoundingClientRect();
        const shadow = getComputedStyle(node).boxShadow;
        const drop = shadow === "none" ? 0 : parseFloat(shadow.replace(/^rgba?\([^)]*\)\s*/, "").split(/\s+/)[1]);
        return { top: box.top, bottom: box.bottom + drop };
      }),
    await button.elementHandle(),
  );
  expect(b).toEqual(f);
};

// The buttons and button links in view that cast a shadow, the raised ones, counting only what's on top where it's
// drawn: behind an open dialog's backdrop a button can't be seen as one or pressed.
const raisedInView = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("button, a")]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        const inView = box.width > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
        if (!inView || !el.checkVisibility() || getComputedStyle(el).boxShadow === "none") return false;
        const x = Math.min(Math.max(box.left + box.width / 2, 0), innerWidth - 1);
        const y = Math.min(Math.max(box.top + box.height / 2, 0), innerHeight - 1);
        return el.contains(document.elementFromPoint(x, y));
      })
      .map((el) => el.textContent?.trim()),
  );

const oneAtMost = async (page: Page, where: string) => {
  const raised = await raisedInView(page);
  expect({ where, raised: raised.length > 1 ? raised : [] }).toEqual({ where, raised: [] });
};

test("a button beside a field stands as tall as the field, raised or flat", async ({ browser }) => {
  test.slow();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto("/groups");
  await signInAndPick(page, "bf");
  const groups = page.getByRole("region", { name: "Groups" });
  await sameRow(groups.getByLabel("New group's name"), groups.getByRole("button", { name: "Create group" }));
  await groups.getByLabel("New group's name").fill("Row Club");
  await groups.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  const group = page.getByRole("region", { name: "Group" });
  await sameRow(group.getByLabel("Group name"), group.getByRole("button", { name: "Rename" }));

  await page.goto("/friends");
  const find = page.getByRole("region", { name: "Find a player" });
  await sameRow(find.getByLabel("Their exact username"), find.getByRole("button", { name: "Find" }));

  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-bf@example.test`]);
  await page.goto(`/admin/test2/${fragmentsDay}`);
  const game = page.getByRole("region", { name: SUBSTRINGS.name, exact: true });
  await game.getByRole("button", { name: "Start" }).click();
  await sameRow(page.getByLabel("Your word"), game.getByRole("button", { name: "Try", exact: true }));
});

test("each main screen shows at most one raised button, on a phone and a computer", async ({ browser }) => {
  test.slow();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto("/groups");
  await signInAndPick(page, "br");
  await page.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Raised Club");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  const group = new URL(page.url()).pathname;
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const path of ["/", "/friends", "/groups", "/me", group, `/u/br${RUN}`, "/streak"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await oneAtMost(page, `${path} at ${viewport.width}px`);
    }
  }
});

// The screens around the tabs (answer 46): signed out, with the sign-in form; How to play over Today; the settings sheet;
// the game screen before Start; a result.
test("the sign-in form, How to play, the settings sheet, the game screen and a result each show at most one raised button", async ({ browser }) => {
  test.slow();
  const out = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  for (const path of ["/", "/?sign-in"]) {
    await out.goto(path);
    await out.waitForLoadState("networkidle");
    await oneAtMost(out, `signed out ${path}`);
  }
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "bs");
  // On the game's card a flat button takes the card's text colour (answer 49; since 20k-3 the card is white, so the theme's text).
  const howToPlay = page.getByRole("region", { name: GAME.name, exact: true }).getByRole("button", { name: "How to play" });
  const [own, card] = await howToPlay.evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el.closest("[class*='banner']")!).color]);
  expect(own).toBe(card);
  await howToPlay.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await oneAtMost(page, "How to play over Today");
  await page.keyboard.press("Escape");
  await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await oneAtMost(page, "the settings sheet");
  await page.keyboard.press("Escape");
  await page.goto("/play");
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  await oneAtMost(page, "the game screen before Start");
  await page.goto("/");
  await play(page);
  await caughtToCards(page, puzzle.hostAnswer);
  await oneAtMost(page, "a result");
});

// Answers 37 and 48: the sidebar's Settings takes the hover rule's fill and swaps its gear's outline for the solid one,
// as a tab does.
test("the sidebar's Settings fills and shows its solid gear under the pointer", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "bg");
  const settings = page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Settings" });
  const looks = () =>
    settings.evaluate((el) => ({
      fill: getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)",
      solid: getComputedStyle(el.querySelector("svg:last-of-type")!).opacity,
    }));
  expect(await looks()).toEqual({ fill: false, solid: "0" });
  await settings.hover();
  await expect.poll(looks).toEqual({ fill: true, solid: "1" });
});
