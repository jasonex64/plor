// 14b-10a, the still look (docs/milestones/M14-14b-10-calm-and-alive.md): only what can be pressed has a shadow, in
// each theme; every button, field and select is 44px tall (the reactions too, since 14b-13 put them behind a ⋯), so
// Rename lines up with the group's name; the streak pill is fully round; card headings 24px and the stat numbers 40px; your own row on a
// board, the streak pill and Me's four tiles take the soft tint; a stat tile's number shrinks to fit a phone (answer 23).
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, sent, signInAndPick, sharedLink } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const PHONE = { width: 390, height: 844 };
const WIDE = { width: 1440, height: 900 };
let puzzle: TodayPuzzle;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

// A theme slot as the browser computes it.
const slot = (page: Page, name: string) =>
  page.evaluate((name) => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = `var(${name})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  }, name);

// What's drawn with a shadow: the buttons and links among it counted (so a page with none shows nothing was measured),
// anything else listed.
const shadowed = (page: Page) =>
  page.evaluate(() => {
    const all = [...document.querySelectorAll("body *")].filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).boxShadow !== "none");
    const pressable = all.filter((el) => el.tagName === "BUTTON" || el.tagName === "A");
    const stray = all.filter((el) => !pressable.includes(el)).map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 40)}"`);
    return { pressable: pressable.length, stray };
  });

// Buttons, links drawn as buttons (the ones with a shadow), text fields and selects under 44px tall.
const short = (page: Page) =>
  page.evaluate(() => {
    const controls = [...document.querySelectorAll("button, a, input, select")].filter((el) => {
      if (el.getClientRects().length === 0) return false;
      if (el.tagName === "A") return getComputedStyle(el).boxShadow !== "none";
      if (el.tagName === "INPUT") return !["checkbox", "radio", "hidden"].includes((el as HTMLInputElement).type);
      return true;
    });
    const low = controls
      .map((el) => ({ el, height: el.getBoundingClientRect().height }))
      .filter(({ height }) => height < 43.5)
      .map(({ el, height }) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${height}px`);
    return { measured: controls.length, low };
  });

// Controls each page must show before it's measured: the small kinds that were under 44px before 14b-10a.
// A comment's Report and Delete are behind its ⋯ since 14b-13; the ⋯ itself is measured.
const SHOWN: Record<string, (string | RegExp)[]> = { "/": ["Post", /^Actions for /, "Earlier day"], "/friends": ["Remove"], "/groups": ["Create group"] };

test("only what can be pressed has a shadow, and every control is 44px tall", async ({ browser }) => {
  // Two players who are friends, share a group, and have both played and commented, so the friends list's Remove, the
  // group's Rename, a comment's Report and Delete, and the feed's Post are all on screen. Two sign-ins, two runs and 23
  // pages measured took 96s on the Windows PC (2026-10-30), past test.slow()'s 90s.
  test.setTimeout(3 * 60_000);
  const friend = await (await browser.newContext({ viewport: PHONE, permissions: ["clipboard-read", "clipboard-write"] })).newPage();
  await friend.goto("/friends");
  await signInAndPick(friend, "kb");
  const invite = await sharedLink(friend, friend.getByRole("region", { name: "Invite friends" }).getByRole("button", { name: "Invite a friend" }));
  const page = await (await browser.newContext({ viewport: PHONE, permissions: ["clipboard-read", "clipboard-write"] })).newPage();
  await page.goto(new URL(invite).pathname);
  await signInAndPick(page, "ka");
  await page.getByRole("button", { name: "Add friend" }).click();
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-ka@example.test`]);
  await page.goto("/groups");
  await page.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Calm Club");
  await page.getByRole("region", { name: "Groups" }).getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  const group = new URL(page.url()).pathname;
  for (const [player, body] of [[friend, "Bear, first stop."], [page, "Bear for me too."]] as const) {
    await player.goto("/");
    await play(player);
    await player.getByLabel("Your answer").fill(puzzle.hostAnswer);
    await player.getByRole("button", { name: "Answer" }).click();
    await expect(player.locator("#result")).toContainText("You climbed 0 of 7 stops");
    await player.goto("/");
    await player.getByLabel("Comment to your friends").fill(body);
    await player.getByRole("button", { name: "Post" }).click();
    await sent(player, "/api/comments");
  }

  for (const viewport of [PHONE, WIDE]) {
    await page.setViewportSize(viewport);
    for (const path of ["/", "/friends", "/groups", group, "/me", "/streak", "/updraft", "/admin/puzzles", "/admin/insights"]) {
      await page.goto(path);
      // Measured once every section has loaded: no skeleton left, and the page's own small controls on screen.
      await expect(page.getByRole("status", { name: /^Loading/ })).toHaveCount(0);
      for (const name of SHOWN[path] ?? (path === group ? ["Rename"] : [])) await expect(page.getByRole("button", { name, exact: true }).first()).toBeVisible();
      const where = `${path} at ${viewport.width}px`;
      const shadows = await shadowed(page);
      expect(shadows.stray, where).toEqual([]);
      expect(shadows.pressable, where).toBeGreaterThan(0);
      const heights = await short(page);
      expect(heights.low, where).toEqual([]);
      expect(heights.measured, where).toBeGreaterThan(0);
    }
  }

  // The group's name and Rename line up, top and bottom.
  await page.goto(group);
  const name = page.getByLabel("Group name");
  const rename = page.getByRole("button", { name: "Rename" });
  const [a, b] = [(await name.boundingBox())!, (await rename.boundingBox())!];
  expect(Math.abs(a.y - b.y)).toBeLessThan(0.5);
  expect(Math.abs(a.y + a.height - (b.y + b.height))).toBeLessThan(0.5);

  // Your own row takes the soft tint: on the leaderboard ("(you)") and in "Where everyone ended" on Friends.
  await page.setViewportSize(PHONE);
  await page.goto("/");
  const soft = await slot(page, "--soft");
  const yours = page.getByRole("region", { name: "Leaderboard" }).getByRole("listitem").filter({ hasText: "(you)" });
  await expect(yours).toBeVisible();
  expect(await yours.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(soft);
  await page.goto("/friends");
  const ended = page.getByRole("region", { name: "Where everyone ended" }).locator(":scope > ul > li").filter({ hasText: "You" });
  await expect(ended).toBeVisible();
  expect(await ended.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(soft);

  // The same in every theme, on Today.
  await page.setViewportSize(PHONE);
  for (const theme of ["paper", "night", "sky", "moonlit", "ink"]) {
    await DB.query("update private.profile set theme = $1 where user_id = (select id from auth.users where email = $2)", [theme, `${RUN}-ka@example.test`]);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("status", { name: /^Loading/ })).toHaveCount(0);
    const shadows = await shadowed(page);
    expect(shadows.stray, theme).toEqual([]);
    expect(shadows.pressable, theme).toBeGreaterThan(0);
  }
});

// A stat tile's number fits its tile: written in as the widest the tile can show (answers 23 and 24), then its text's
// width measured against the room inside the tile. The text, not the dd: a dd may stretch to the tile or shrink to its text.
const fits = (number: import("@playwright/test").Locator, widest: string) =>
  number.evaluate((el, widest) => {
    el.textContent = widest;
    const text = document.createRange();
    text.selectNodeContents(el);
    const tile = getComputedStyle(el.parentElement!);
    const room = el.parentElement!.clientWidth - parseFloat(tile.paddingLeft) - parseFloat(tile.paddingRight);
    return text.getBoundingClientRect().width <= room;
  }, widest);

test("the streak pill is round and tinted, and the sizes are the new ones", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await page.goto("/");
  await signInAndPick(page, "kc");
  await play(page);
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.locator("#result")).toContainText("You climbed 0 of 7 stops");
  const soft = await slot(page, "--soft");

  const pill = page.getByRole("banner").getByRole("link", { name: /day streak/ });
  const round = await pill.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius) >= el.getBoundingClientRect().height / 2);
  expect(round).toBe(true);
  expect(await pill.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(soft);

  // The game screen's stat tiles, after the run: on a phone the best score's most, "1,500", fits its tile; on a desktop
  // the numbers are 40px.
  const stats = page.getByRole("region", { name: /^Your / }).locator("dd");
  await expect(stats.first()).toBeVisible();
  expect(await fits(stats.nth(1), "1,500")).toBe(true);
  await page.setViewportSize(WIDE);
  await page.reload();
  await expect(stats.first()).toBeVisible();
  expect(await stats.first().evaluate((el) => getComputedStyle(el).fontSize)).toBe("40px");
  await page.setViewportSize(PHONE);

  // Today: a card's heading.
  await page.goto("/");
  const board = page.getByRole("region", { name: "Leaderboard" });
  expect(await board.getByRole("heading", { name: "Leaderboard" }).evaluate((el) => getComputedStyle(el).fontSize)).toBe("24px");

  // Me: the four headline tiles, tinted; on a 360px phone "999,999" points fits a tile, and on a desktop the numbers are
  // 40px.
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/me");
  const tiles = page.getByRole("region", { name: "All games" }).locator("dd");
  await expect(tiles).toHaveCount(4);
  for (const tile of await tiles.all()) expect(await tile.evaluate((el) => getComputedStyle(el.parentElement!).backgroundColor)).toBe(soft);
  expect(await fits(tiles.first(), "999,999")).toBe(true);
  await page.setViewportSize(WIDE);
  await page.reload();
  await expect(tiles).toHaveCount(4);
  for (const tile of await tiles.all()) expect(await tile.evaluate((el) => getComputedStyle(el).fontSize)).toBe("40px");

  // /streak's number.
  await page.goto("/streak");
  const number = page.getByRole("heading", { name: /^Your streak/ }).locator("span");
  expect(await number.evaluate((el) => getComputedStyle(el).fontSize)).toBe("40px");
});
