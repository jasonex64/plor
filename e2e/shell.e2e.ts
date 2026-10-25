// The shell (docs/milestones/M14-14a-1-shell.md): four tabs as a bottom tab bar on phones and a sidebar from 768px,
// each with its sections; no sideways scroll at 320px; a question in play survives a visit to another tab; Paper or
// Night following the device; fonts served by Plor, not Google; and the focus ring on the tabs.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, signInAndPick } from "./players";
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
  { name: "Today", path: "/", sections: ["Offbeat", "Leaderboard", "Feed"] },
  { name: "Friends", path: "/friends", sections: ["Friends today", "Friends leaderboard"] },
  { name: "Groups", path: "/groups", sections: ["Groups"] },
  { name: "Me", path: "/me", sections: ["Your account"] },
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

// The visible page's top-level sections (those not inside another section, wherever the layout puts them): Next.js
// keeps a page already visited in the document, hidden, so the tab navigated from is still there (cacheComponents,
// next.config.ts).
const sections = (page: Page) =>
  page
    .locator("main section")
    .evaluateAll((all) => all.filter((s) => s.checkVisibility() && !s.parentElement?.closest("section")).map((s) => s.getAttribute("aria-label")));

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

// The tabs stay during a run, and leaving lets the timer run (M14 L18): back on the game screen, the question is still
// in play. On the game screen the Today tab is current, as the page it opens from (14a-2b).
test("a question in play is still there after a visit to another tab", async ({ browser }) => {
  const { page, nav } = await player(browser, "se", { width: 360, height: 800 });
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await expect(nav.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "true");
  await nav.getByRole("link", { name: "Friends" }).click();
  await expect(page.getByRole("region", { name: "Friends today" })).toBeVisible();
  await page.getByRole("region", { name: "Question in play" }).getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL("http://localhost:3000/offbeat");
  await expect(page.getByLabel("Your answer")).toBeVisible();
});

// Away from the game screen, the question's clock sits just above the tab bar, with Back; at zero it says time's up
// and links to the result (M14 L18; docs/milestones/M14-14a-2a-today.md, criterion 6; 14a-2b moved the game to
// /offbeat). The clock is faked so zero comes at once.
test("away from the game screen, a question in play shows its clock above the tab bar, and time's up at zero", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 360, height: 800 } })).newPage();
  await page.clock.install();
  await page.goto("/");
  await signInAndPick(page, "sh");
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  // Not on the game screen itself, which shows the question's own countdown.
  const clock = page.getByRole("region", { name: "Question in play" });
  await expect(clock).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Friends" }).click();

  await expect(clock.getByRole("timer")).toHaveText(/^Question 1 · \d+s left$/);
  await expect(clock.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/offbeat");
  const [bar, tabs] = [(await clock.boundingBox())!, (await nav.boundingBox())!];
  expect(bar.y + bar.height).toBeCloseTo(tabs.y, 0);

  // From 768px, at the top of the content, beside the sidebar.
  await page.setViewportSize({ width: 1440, height: 900 });
  const [wide, side] = [(await clock.boundingBox())!, (await nav.boundingBox())!];
  expect([wide.y, wide.x]).toEqual([0, side.x + side.width]);
  await page.setViewportSize({ width: 360, height: 800 });

  // Past the question's 20 seconds: announced once, as a status.
  await page.clock.fastForward("00:21");
  await expect(clock.getByRole("status")).toHaveText("Time's up on question 1");
  await expect(clock.getByRole("link", { name: "Result" })).toHaveAttribute("href", "/offbeat#result");
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

// Reached by keyboard, every link in the tab bar and the sidebar shows the focus ring: a 3px solid outline in the
// accent, offset 3px (criterion 9; WCAG 2.2 2.4.7). The players are admins, so the sidebar's Admin is checked too.
test("every tab shows the focus ring from the keyboard", async ({ browser }) => {
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 1440, height: 900 },
  ]) {
    const name = `sf${viewport.width}`;
    const { page } = await player(browser, name, viewport);
    await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-${name}@example.test`]);
    await page.reload();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    const expected = TABS.map((t) => t.name).concat(viewport.width >= 768 ? ["Admin"] : []);
    const accent = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--accent)";
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    const focusedInNav = () =>
      page.evaluate(() => {
        const el = document.activeElement;
        if (!el?.closest("nav[aria-label='Main']")) return null;
        const style = getComputedStyle(el);
        return { text: el.textContent, ring: [style.outlineWidth, style.outlineStyle, style.outlineColor, style.outlineOffset] };
      });
    // Tab through the page until focus has passed every link in the navigation. The navigation comes after the page's
    // own content; the cap only stops a broken page from looping, well above the links a tab page has.
    const seen: { text: string | null; ring: string[] }[] = [];
    for (let i = 0; i < 80 && seen.length < expected.length; i++) {
      await page.keyboard.press("Tab");
      const focused = await focusedInNav();
      if (focused) seen.push(focused);
    }
    expect(seen.map((f) => f.text)).toEqual(expected);
    for (const f of seen) expect(f.ring).toEqual(["3px", "solid", accent, "3px"]);
  }
});
