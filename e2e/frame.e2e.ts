// M20 20c (docs/milestones/M20-design-rules-and-clean-up.md, answers 40 to 44): every tab's content starts at one place,
// cards are 16px apart, the sidebar shares the wordmark's left edge and the streak pill is the avatar's height; Back sits
// on the heading's line, in the top bar on phones. Chromium shows its scrollbars in this file, so a page that scrolls is
// measured with one (answer 43); Playwright sets that per file, as it needs a browser of its own.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { localStack } from "../scripts/slot.ts";

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
// Today shows its game cards only when there is a day: the fixture day, removed again after.
let puzzle: TodayPuzzle;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

// The first thing a page shows under its heading, and the gaps between the cards that stack directly in it.
const frame = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main")!;
    const flowing = [...main.children].filter((el) => {
      const s = getComputedStyle(el);
      return el.tagName !== "H1" && s.position === "static" && s.float === "none" && el.getBoundingClientRect().height > 0;
    });
    const first = flowing[0].getBoundingClientRect();
    const box = flowing[0].children.length > 1 && !/card/.test(String(flowing[0].className)) ? flowing[0] : main;
    const cards = [...box.children].filter((el) => /card/.test(String(el.className)) && el.getBoundingClientRect().height > 0);
    const gaps = cards.slice(1, 3).map((c, i) => Math.round(c.getBoundingClientRect().top - cards[i].getBoundingClientRect().bottom));
    return { left: first.left, top: first.top, gaps, scrolls: document.documentElement.scrollHeight > innerHeight };
  });

test("every tab starts its content at one place, with cards 16px apart", async ({ browser }) => {
  // Seven pages at two widths, each to its network going quiet.
  test.slow();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 400 } })).newPage();
  await page.goto("/groups");
  await signInAndPick(page, "lf");
  await page.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Frame Club");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  const group = new URL(page.url()).pathname;
  const stacked = ["/friends", "/me", group, `/u/lf${RUN}`];
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: 400 });
    const seen: Record<string, { left: number; top: number; gaps: number[]; scrolls: boolean }> = {};
    for (const path of ["/", "/friends", "/groups", "/me", group, `/u/lf${RUN}`, "/streak"]) {
      await page.goto(path);
      await expect(page.locator("main [class*='card']").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      seen[path] = await frame(page);
    }
    // Groups, with one group, doesn't scroll at this height and Friends does, so the scrollbar's room is compared.
    expect([seen["/groups"].scrolls, seen["/friends"].scrolls]).toEqual([false, true]);
    const at = seen["/friends"];
    for (const [path, place] of Object.entries(seen)) {
      expect({ path, width, left: place.left, top: place.top }).toEqual({ path, width, left: at.left, top: at.top });
      if (stacked.includes(path)) expect({ path, gaps: place.gaps }).toEqual({ path, gaps: [16, 16] });
    }
  }
});

test("the sidebar shares the wordmark's left edge, and the streak pill is the avatar's height", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "ls");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Today" })).toBeVisible();
  const sidebar = await nav.evaluate((el) => {
    const word = el.querySelector("[class*='word']")!;
    const who = el.querySelector("[class*='who']")!;
    const shown = (svgs: Element[]) => svgs.filter((s) => getComputedStyle(s).opacity !== "0").map((s) => s.getBoundingClientRect().left);
    return {
      word: word.getBoundingClientRect().left + parseFloat(getComputedStyle(word).paddingLeft),
      avatar: who.firstElementChild!.getBoundingClientRect(),
      pill: who.querySelector("a[href='/streak']")!.getBoundingClientRect(),
      icons: shown([...el.querySelectorAll("ul svg, button svg")]),
    };
  });
  expect(sidebar.avatar.left).toBe(sidebar.word);
  expect(sidebar.icons).toEqual(sidebar.icons.map(() => sidebar.word));
  expect(sidebar.pill.height).toBe(sidebar.avatar.height);
  expect(sidebar.pill.top + sidebar.pill.height / 2).toBe(sidebar.avatar.top + sidebar.avatar.height / 2);
});

test("Back sits on the heading's line, and in the top bar on phones", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto("/streak");
  await signInAndPick(page, "lb");
  const back = page.locator("main").getByRole("link", { name: "Me", exact: true });
  const heading = page.locator("main > h1");
  await expect(back).toBeVisible();
  const [b, h] = [await back.boundingBox(), await heading.boundingBox()];
  expect(b!.y >= h!.y && b!.y + b!.height <= h!.y + h!.height).toBe(true);
  expect(b!.x + b!.width).toBeGreaterThan(h!.x + h!.width - 1);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(back).toBeVisible();
  const phone = (await back.boundingBox())!;
  expect(phone.y >= 0 && phone.y + phone.height <= 56).toBe(true);
  await expect(page.getByRole("banner").getByText("Plor", { exact: true })).toBeHidden();
  await back.click();
  await expect(page).toHaveURL(/\/me$/);
});

// M20 20f (answers 7 and 62): on a computer "Plor" shows once, in the sidebar, and the page's heading is the page's
// name alone, at the scale's top size (30px) in the text colour; it's still read "Plor, Friends".
test("on a computer Plor shows once, and the page's name is its heading at 30px", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto("/friends");
  await signInAndPick(page, "lp");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Friends" })).toBeVisible();
  const plors = await page.evaluate(() =>
    [...document.querySelectorAll("body *")].filter((el) => {
      const own = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent!.trim()).join("");
      return own === "Plor" && el.checkVisibility() && el.getBoundingClientRect().width > 1;
    }).length,
  );
  expect(plors).toBe(1);
  const heading = page.locator("main > h1");
  await expect(heading).toHaveAccessibleName("Plor, Friends");
  const name = heading.getByText("Friends", { exact: true });
  await expect(name).toBeVisible();
  const text = await page.evaluate(() => getComputedStyle(document.body).color);
  expect(await name.evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).color])).toEqual(["30px", text]);
});
