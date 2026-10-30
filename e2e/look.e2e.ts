// The new look (docs/milestones/M14-14b-8-the-new-look.md; mockup 3, "Nearly square (5px)"), read from computed styles
// on real elements. 14b-8a: buttons, links drawn as buttons and fields take the ink border, corners and hard shadow in
// each theme's ink (its text colour), buttons press down unless the player asks for less motion, and the shell's tab
// bar and sidebar take the ink rules (criterion 1). 14b-8b: a card and a chip, on Today's leaderboard. 14b-8c: Me's
// cards and /streak's ranks. 14b-8d: the admin area.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
import { GAME } from "../src/platform/game";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
// Today's banner shows the day's facts only when there is a day: the fixture day, removed again after.
let puzzle: TodayPuzzle;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

// The theme's text colour as the browser computes it, which is the ink.
const ink = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--text)";
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });

const look = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    return { border: `${s.borderTopWidth} ${s.borderTopColor}`, corners: s.borderTopLeftRadius, shadow: s.boxShadow };
  });

test("buttons, button links and fields take the ink border, corners and shadow, in each theme", async ({ browser }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    const page = await (await browser.newContext({ colorScheme })).newPage();
    await page.goto("/");
    const color = await ink(page);
    expect(await look(page.getByRole("button", { name: "Email me a sign-in code" }))).toEqual({
      border: `2px ${color}`,
      corners: "5px",
      shadow: `${color} 0px 4px 0px 0px`,
    });
    expect(await look(page.getByRole("link", { name: "About Plor" }))).toEqual({
      border: `2px ${color}`,
      corners: "5px",
      shadow: `${color} 0px 4px 0px 0px`,
    });
    expect(await look(page.getByLabel("Email"))).toEqual({ border: `2px ${color}`, corners: "4px", shadow: "none" });
  }
});

test("a button presses down onto its shadow, and doesn't move under reduced motion", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const page = await (await browser.newContext({ reducedMotion })).newPage();
    await page.goto("/");
    const button = page.getByRole("button", { name: "Email me a sign-in code" });
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const pressed = () => button.evaluate((el) => getComputedStyle(el).transform);
    if (reducedMotion === "reduce") expect(await pressed()).toBe("none");
    else await expect.poll(pressed).toBe("matrix(1, 0, 0, 1, 0, 4)");
    await page.mouse.up();
  }
});

test("the tab bar and the sidebar's current item take the ink rules", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "lk");
  const color = await ink(page);
  const nav = page.getByRole("navigation", { name: "Main" });
  expect(await nav.evaluate((el) => `${getComputedStyle(el).borderTopWidth} ${getComputedStyle(el).borderTopColor}`)).toBe(`2px ${color}`);

  // The gear is an icon, not one of the kit's buttons: held down, it neither moves nor gains a shadow (14b-8a review).
  const gear = page.getByRole("button", { name: "Settings" });
  const box = (await gear.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  expect(await gear.evaluate((el) => [getComputedStyle(el).transform, getComputedStyle(el).boxShadow])).toEqual(["none", "none"]);
  await page.mouse.up();
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await nav.evaluate((el) => `${getComputedStyle(el).borderRightWidth} ${getComputedStyle(el).borderRightColor}`)).toBe(`2px ${color}`);
  expect(await look(nav.getByRole("link", { name: "Today" }))).toEqual({ border: `2px ${color}`, corners: "4px", shadow: `${color} 3px 3px 0px 0px` });
});

test("a card and a chip take the kit's border, corners and shadow", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "lc");
  const color = await ink(page);
  const card = page.getByRole("region", { name: "Leaderboard" });
  expect(await look(card)).toEqual({ border: `2px ${color}`, corners: "5px", shadow: `${color} 4px 4px 0px 0px` });
  // The card's date chip, once its scores have loaded.
  const chip = card.getByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d+ \w+$|^From /).first();
  await expect(chip).toBeVisible();
  // Mockup 3's 1.5px edge, which Chromium floors to whole CSS pixels (1px), as it did in the mockup itself.
  expect(await look(chip)).toEqual({ border: `1px ${color}`, corners: "4px", shadow: "none" });
});

// Signed in, Today starts with the game: the introduction is gone (answer 12); the banner's chips are its white on the
// game's colour, not the kit's plain chip (a production CSS order once let the kit's win: 14b-8b review); and with no
// friends a phone ends with the invite card, which from 768px the board says instead (answer 13).
test("signed-in Today: no introduction, the banner's own chips, and the invite card on phones", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "lt");
  const banner = page.getByRole("region", { name: GAME.name, exact: true });
  const chip = banner.getByText("7 stops", { exact: true });
  await expect(chip).toBeVisible();
  await expect(page.getByText("Plor is a small site with a daily word game.")).toBeHidden();
  expect(await chip.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");
  const color = await ink(page);
  expect(await chip.evaluate((el) => getComputedStyle(el).borderTopColor)).not.toBe(color);

  const card = page.getByRole("region", { name: "Plor is better with friends" });
  await expect(card.getByRole("button", { name: "Invite a friend" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(card).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Friends today" }).getByText("Plor is better with friends")).toBeVisible();
});

// 14b-8c: Me's header card lays its avatar beside the name, the avatar is ringed in ink, the totals are stat tiles and
// the days take the cells' corners; /streak's own rank keeps its thicker edge. The header and the rank are scoped above the kit's card, which
// a production CSS order could otherwise let win (14b-8b review).
test("Me's header, stat tiles and days, and /streak's own rank, in the kit", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.goto("/me");
  await signInAndPick(page, "lm");
  const color = await ink(page);
  const header = page.getByText(/^Playing since /).locator("xpath=../..");
  await expect(header).toBeVisible();
  expect(await header.evaluate((el) => getComputedStyle(el).flexDirection)).toBe("row");
  expect(await look(header)).toEqual({ border: `2px ${color}`, corners: "5px", shadow: `${color} 4px 4px 0px 0px` });
  expect(await header.locator("[data-initial]").evaluate((el) => `${getComputedStyle(el).borderTopWidth} ${getComputedStyle(el).borderTopColor}`)).toBe(`2px ${color}`);
  const tile = page.getByRole("region", { name: "All games" }).getByText("points all time", { exact: true }).locator("xpath=..");
  expect(await look(tile)).toEqual({ border: `2px ${color}`, corners: "4px", shadow: `${color} 3px 3px 0px 0px` });
  expect(await page.getByRole("region", { name: "Calendar" }).locator("[data-date]").first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("2px");

  await page.goto("/streak");
  const own = page.locator("li[aria-current]");
  await expect(own).toContainText("Your rank");
  expect(await own.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("3px");
});

// 14b-8d: the admin area's current sub-tab is drawn as the sidebar's current item, a page's section is the kit's card,
// and the rail's warning row is edged in its own danger colour, not the ink (tomorrow has no puzzle in this file).
test("the admin area's current sub-tab, a card and the rail's warning, in the kit", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "la");
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-la@example.test`]);
  await page.goto("/admin/insights");
  const color = await ink(page);
  const tab = page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Insights" });
  expect(await look(tab)).toEqual({ border: `2px ${color}`, corners: "4px", shadow: `${color} 3px 3px 0px 0px` });
  const card = page.getByRole("region", { name: "Caught per question" });
  await expect(card).toBeVisible();
  expect(await look(card)).toEqual({ border: `2px ${color}`, corners: "5px", shadow: `${color} 4px 4px 0px 0px` });
  const warning = page.getByRole("complementary", { name: "What needs you" }).getByRole("link", { name: /Tomorrow has no puzzle/ });
  const [edge, text] = await warning.evaluate((el) => [getComputedStyle(el).borderTopColor, getComputedStyle(el).color]);
  expect(edge).toBe(text);
  expect(edge).not.toBe(color);
});
