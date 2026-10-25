// The shell (docs/milestones/M14-14a-1-shell.md): four tabs as a bottom tab bar on phones and a sidebar from 768px,
// each with its sections; no sideways scroll at 320px; a question in play survives a visit to another tab; Paper or
// Night following the device; fonts served by Plor, not Google; and the focus ring on the tabs.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
let puzzle: TodayPuzzle;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

// Each tab's path and the sections it holds (criterion 4): today's sections, moved as they are.
const TABS = [
  { name: "Today", path: "/", sections: ["Offbeat", "Feed"] },
  { name: "Friends", path: "/friends", sections: ["Friends today", "Friends leaderboard"] },
  { name: "Groups", path: "/groups", sections: ["Groups"] },
  { name: "Me", path: "/me", sections: ["Your account", "Friends"] },
];

// A signed-in player in a fresh browser of the given size, with every request recorded.
async function player(browser: Browser, name: string, viewport: { width: number; height: number }) {
  const page = await (await browser.newContext({ viewport })).newPage();
  const requests: string[] = [];
  page.on("request", (r) => void requests.push(r.url()));
  await page.goto("/");
  await signInAndPick(page, name);
  return { page, requests, nav: page.getByRole("navigation", { name: "Main" }) };
}

const sections = (page: Page) => page.locator("main > section").evaluateAll((all) => all.map((s) => s.getAttribute("aria-label")));

test("a phone gets a bottom tab bar, and each tab holds its sections", async ({ browser }) => {
  const { page, requests, nav } = await player(browser, "sa", { width: 360, height: 800 });
  await expect(nav.getByRole("link")).toHaveText(TABS.map((t) => t.name));
  // Along the bottom edge and the full width: a tab bar, not a sidebar.
  const box = (await nav.boundingBox())!;
  expect([box.x, box.width, box.y + box.height]).toEqual([0, 360, 800]);
  for (const tab of TABS) {
    await nav.getByRole("link", { name: tab.name }).click();
    await expect(page).toHaveURL(`http://localhost:3000${tab.path}`);
    await expect(nav.locator("[aria-current]")).toHaveCount(1);
    await expect(nav.getByRole("link", { name: tab.name })).toHaveAttribute("aria-current", "page");
    await expect.poll(() => sections(page)).toEqual(tab.sections);
  }
  // The account page moved to the Me tab (criterion 4).
  expect((await page.goto("/account"))!.status()).toBe(404);
  // Fonts come from Plor's own server (criterion 8).
  expect(requests.filter((url) => /fonts\.(googleapis|gstatic)\.com/.test(url))).toEqual([]);
});

test("from 768px the tabs are a sidebar, with Admin for admins only", async ({ browser }) => {
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    const { nav } = await player(browser, `sb${viewport.width}`, viewport);
    await expect(nav.getByRole("link")).toHaveText(TABS.map((t) => t.name));
    // Down the left edge, the full height.
    const box = (await nav.boundingBox())!;
    expect([box.x, box.y, box.height]).toEqual([0, 0, viewport.height]);
    expect(box.width).toBeLessThan(viewport.width / 2);
    await nav.getByRole("link", { name: "Groups" }).click();
    await expect(nav.getByRole("link", { name: "Groups" })).toHaveAttribute("aria-current", "page");
  }

  const { page, nav } = await player(browser, "sc", { width: 1440, height: 900 });
  await expect(nav.getByRole("link", { name: "Admin" })).toHaveCount(0);
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-sc@example.test`]);
  await page.reload();
  await expect(nav.getByRole("link", { name: "Admin" })).toBeVisible();
  // A phone has no sidebar: Admin is on the Me tab instead, and only there (it replaces M15 15c).
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(nav.getByRole("link", { name: "Admin" })).toBeHidden();
  await nav.getByRole("link", { name: "Me" }).click();
  await expect(page.getByRole("main").getByRole("link", { name: "Admin" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL("http://localhost:3000/admin");
  // Back on a desktop, the Me tab leaves it to the sidebar.
  await page.goto("/me");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("main").getByText("Admin", { exact: true })).toBeHidden();

  // A player who isn't an admin sees no Admin on the Me tab either.
  const other = await player(browser, "sg", { width: 360, height: 800 });
  await other.nav.getByRole("link", { name: "Me" }).click();
  await expect(other.page.getByRole("region", { name: "Your account" })).toBeVisible();
  await expect(other.page.getByRole("link", { name: "Admin" })).toHaveCount(0);
});

test("no tab scrolls sideways at 320px", async ({ browser }) => {
  const { page } = await player(browser, "sd", { width: 320, height: 640 });
  for (const tab of TABS) {
    await page.goto(tab.path);
    await expect.poll(() => sections(page)).toEqual(tab.sections);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

// The tabs stay during a run, and leaving lets the timer run (M14 L18): back on Today, the question is still in play.
test("a question in play is still there after a visit to another tab", async ({ browser }) => {
  const { page, nav } = await player(browser, "se", { width: 360, height: 800 });
  await page.getByRole("button", { name: "Start today's puzzle" }).click();
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await nav.getByRole("link", { name: "Friends" }).click();
  await expect(page.getByRole("region", { name: "Friends today" })).toBeVisible();
  await nav.getByRole("link", { name: "Today" }).click();
  await expect(page.getByLabel("Your answer")).toBeVisible();
});

test("the colours follow the device: Paper when light, Night when dark", async ({ browser }) => {
  for (const [colorScheme, background] of [
    ["light", "rgb(250, 250, 248)"],
    ["dark", "rgb(18, 18, 18)"],
  ] as const) {
    const page = await (await browser.newContext({ colorScheme })).newPage();
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(background);
  }
});

// Reached by keyboard, a tab shows the focus ring: 3px, solid (WCAG 2.2 2.4.7).
test("the tabs show the focus ring from the keyboard", async ({ browser }) => {
  const { page } = await player(browser, "sf", { width: 1440, height: 900 });
  const focusedTab = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      if (!el?.closest("nav[aria-label='Main']")) return null;
      const style = getComputedStyle(el);
      return { text: el.textContent, outline: `${style.outlineWidth} ${style.outlineStyle}` };
    });
  let found: { text: string | null; outline: string } | null = null;
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press("Tab");
    found = await focusedTab();
  }
  expect(found).toEqual({ text: "Today", outline: "3px solid" });
});
