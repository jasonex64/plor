// The shell (docs/milestones/M14-14a-1-shell.md): four tabs as a bottom tab bar on phones and a sidebar from 768px,
// each with its sections; no sideways scroll at 320px; a question in play survives a visit to another tab; Paper or
// Night following the device; fonts served by Plor, not Google; and the focus ring on the tabs.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { GAME } from "../src/platform/game";

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

// Each tab's path and the sections it holds (criterion 4): today's sections, moved as they are; the friends list under
// Friends' boards, and Me's stats alone, the account being in the settings sheet (docs/milestones/M14-14a-3b-settings.md).
const TABS = [
  { name: "Today", path: "/", sections: [GAME.name, "Leaderboard", "Feed"] },
  { name: "Friends", path: "/friends", sections: ["Friends today", "Friends leaderboard", "Your friends"] },
  { name: "Groups", path: "/groups", sections: ["Groups"] },
  { name: "Me", path: "/me", sections: ["All games", "Calendar", GAME.name, "Your rarest answers"] },
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
  // And they're the shell's own (docs/milestones/M14-14b-5-local-fonts.md, criterion 4): the heading is drawn at 800,
  // its family's one face is the Baloo 2 file at 800, and the body's family has the DM Sans file at 400 and 700, each
  // of which loads. Read from the page's @font-face rules and faces, since next/font names the families itself.
  // On Plor's own page: the /account visit above left Next.js's 404 page, which styles its own h1.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Plor" })).toBeAttached();
  const fonts = await page.evaluate(async () => {
    const first = (el: Element) => getComputedStyle(el).fontFamily.split(",")[0].trim();
    const unquote = (family: string) => family.replace(/^['"]|['"]$/g, "");
    const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).filter((r) => r instanceof CSSFontFaceRule);
    const files = (family: string) =>
      rules
        .filter((r) => unquote(r.style.getPropertyValue("font-family")) === unquote(family))
        .map((r) => `${r.style.getPropertyValue("font-weight")} ${/\/media\/(\w+?)[.-]/.exec(r.style.getPropertyValue("src"))?.[1]}`)
        .sort();
    const loads = async (family: string, weight: string) =>
      (await document.fonts.load(`${weight} 16px ${family}`)).map((f) => `${f.weight} ${f.status}`);
    const [h1, heading, body] = [document.querySelector("h1")!, first(document.querySelector("h1")!), first(document.body)];
    return {
      headingWeight: getComputedStyle(h1).fontWeight,
      headingFiles: files(heading),
      bodyFiles: files(body),
      loaded: [await loads(heading, "800"), await loads(body, "400"), await loads(body, "700")],
    };
  });
  expect(fonts).toEqual({
    headingWeight: "800",
    headingFiles: ["800 Baloo2_800_latin"],
    bodyFiles: ["400 DMSans_latin", "700 DMSans_latin"],
    loaded: [["800 loaded"], ["400 loaded"], ["700 loaded"]],
  });
});

test("from 768px the tabs are a sidebar, with Admin for admins only", async ({ browser }) => {
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    const { nav } = await player(browser, `sb${viewport.width}`, viewport);
    // The tabs' list: the sidebar also holds the streak's pill (docs/milestones/M14-14b-2a-streak-ranks.md).
    await expect(nav.getByRole("list").getByRole("link")).toHaveText(TABS.map((t) => t.name));
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
  // /admin opens on Puzzles (docs/milestones/M14-14b-2b-2-admin-build.md, criterion 1), so the link ends there; the
  // bare /admin was only seen when the check ran before the redirect, which the persistent frame's prefetch made rare
  // (PR #113's pull-request e2e run, 2026-10-27).
  await expect(page).toHaveURL("http://localhost:3000/admin/puzzles");
  // Back on a desktop, the Me tab leaves it to the sidebar.
  await page.goto("/me");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("main").getByText("Admin", { exact: true })).toBeHidden();

  // A player who isn't an admin sees no Admin on the Me tab either.
  const other = await player(browser, "sg", { width: 360, height: 800 });
  await other.nav.getByRole("link", { name: "Me" }).click();
  await expect(other.page.getByRole("region", { name: "All games" })).toBeVisible();
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
  await page.getByRole("region", { name: "Stop in play" }).getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL("http://localhost:3000/updraft");
  await expect(page.getByLabel("Your answer")).toBeVisible();
});

// Away from the game screen, the question's clock sits just above the tab bar, with Back; at zero it says time's up
// and links to the result (M14 L18; docs/milestones/M14-14a-2a-today.md, criterion 6; 14a-2b moved the game to
// /updraft). The clock is faked so zero comes at once.
test("away from the game screen, a question in play shows its clock above the tab bar, and time's up at zero", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 360, height: 800 } })).newPage();
  await page.clock.install();
  await page.goto("/");
  await signInAndPick(page, "sh");
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  // Not on the game screen itself, which shows the question's own countdown.
  const clock = page.getByRole("region", { name: "Stop in play" });
  await expect(clock).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Friends" }).click();

  await expect(clock.getByRole("timer")).toHaveText(/^Stop 1 · \d+s left$/);
  await expect(clock.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/updraft");
  const [bar, tabs] = [(await clock.boundingBox())!, (await nav.boundingBox())!];
  expect(bar.y + bar.height).toBeCloseTo(tabs.y, 0);

  // From 768px, at the top of the content, beside the sidebar.
  await page.setViewportSize({ width: 1440, height: 900 });
  const [wide, side] = [(await clock.boundingBox())!, (await nav.boundingBox())!];
  expect([wide.y, wide.x]).toEqual([0, side.x + side.width]);
  await page.setViewportSize({ width: 360, height: 800 });

  // Past the question's 20 seconds: announced once, as a status.
  await page.clock.fastForward("00:21");
  await expect(clock.getByRole("status")).toHaveText("Dozed off at stop 1");
  await expect(clock.getByRole("link", { name: "Result" })).toHaveAttribute("href", "/updraft#result");
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
// accent, offset 3px (criterion 9; WCAG 2.2 2.4.7). The players are admins, so the sidebar's Admin is checked too, and
// so is its Settings button (docs/milestones/M14-14a-3b-settings.md), and the streak's pill at its top (14b-2a).
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
    // From 768px the sidebar opens with the streak's pill (docs/milestones/M14-14b-2a-streak-ranks.md), a new player's Seed.
    const wide = viewport.width >= 768;
    const expected = (wide ? ["0 day streak, Seed"] : []).concat(TABS.map((t) => t.name), wide ? ["Admin", "Settings"] : []);
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
    // On phones the gear is in the top bar, not the navigation: tabbed to, it shows the ring too (14b-2c-4, item 30).
    if (!wide) {
      const gearRing = () =>
        page.evaluate(() => {
          const el = document.activeElement;
          if (!el?.matches("header button[aria-label='Settings']")) return null;
          const style = getComputedStyle(el);
          return [style.outlineWidth, style.outlineStyle, style.outlineColor, style.outlineOffset];
        });
      let ring: string[] | null = null;
      for (let i = 0; i < 80 && !ring; i++) {
        await page.keyboard.press("Tab");
        ring = await gearRing();
      }
      expect(ring).toEqual(["3px", "solid", accent, "3px"]);
    }
  }
});

// The wider shell (docs/milestones/M14-14b-2b-1-shell.md, criteria 1 to 4): the 280px sidebar; from 1200px the right
// column, 360px behind a line, with the friends feed on pages without a column of their own; no footer signed in; and
// no control drawn as a text link (an underlined link) on any tab.
test("the sidebar is 280px, the right column holds the feed from 1200px, and no control is a text link", async ({ browser }) => {
  const { page, nav } = await player(browser, "sw", { width: 1440, height: 900 });
  expect((await nav.boundingBox())!.width).toBe(280);
  await nav.getByRole("link", { name: "Me" }).click();
  await expect(page).toHaveURL("http://localhost:3000/me");
  const feed = page.getByRole("complementary", { name: "Friends feed" });
  await expect(feed.getByRole("region", { name: "Feed" })).toBeVisible();
  expect(await feed.boundingBox()).toEqual({ x: 1080, y: 0, width: 360, height: 900 });
  expect(await feed.evaluate((el) => getComputedStyle(el).borderLeftWidth)).toBe("1px");
  // The page's own content stops at the column.
  const main = (await page.locator("main").filter({ visible: true }).boundingBox())!;
  expect(main.x + main.width).toBeLessThanOrEqual(1080);
  await expect(page.locator("footer").filter({ visible: true })).toHaveCount(0);

  for (const tab of TABS) {
    await nav.getByRole("link", { name: tab.name }).click();
    await expect(page).toHaveURL(`http://localhost:3000${tab.path}`);
    // Today's circle (the Leaderboard) is in the right column here, beside the page's own sections.
    await expect.poll(() => sections(page)).toEqual(tab.sections.filter((s) => s !== "Leaderboard"));
    const underlined = await page.evaluate(() =>
      [...document.querySelectorAll("a")]
        .filter((a) => a.checkVisibility() && getComputedStyle(a).textDecorationLine.includes("underline"))
        .map((a) => a.textContent),
    );
    expect(underlined, tab.name).toEqual([]);
  }

  // Below 1200px the other pages show no feed; Today keeps its circle in its own column.
  await page.setViewportSize({ width: 1100, height: 900 });
  await nav.getByRole("link", { name: "Me" }).click();
  await expect(page.getByRole("region", { name: "All games" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Friends feed" })).toHaveCount(0);
});

// No control drawn as a text link beyond the four tabs either (14b-2c-4, item 48): the settings sheet, the clock bar,
// How to play, /streak and a group's page. A link drawn as text stays only inside the About and privacy pages' prose.
test("the settings sheet, the clock bar, How to play, /streak and a group's page have no text-link controls", async ({ browser }) => {
  const { page, nav } = await player(browser, "su2", { width: 1440, height: 900 });
  const underlined = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("a")]
        .filter((a) => a.checkVisibility() && getComputedStyle(a).textDecorationLine.includes("underline"))
        .map((a) => a.textContent),
    );
  await nav.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  expect(await underlined(), "the settings sheet").toEqual([]);
  await page.keyboard.press("Escape");

  for (const path of ["/updraft/how-to-play", "/streak"]) {
    await page.goto(path);
    await expect(nav).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await underlined(), path).toEqual([]);
  }

  await page.goto("/groups");
  const groups = page.getByRole("region", { name: "Groups" });
  await groups.getByLabel("New group's name").fill("Links");
  await groups.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Links" })).toBeVisible();
  expect(await underlined(), "a group's page").toEqual([]);

  await page.goto("/");
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await nav.getByRole("link", { name: "Friends" }).click();
  await expect(page.getByRole("region", { name: "Stop in play" })).toBeVisible();
  expect(await underlined(), "the clock bar").toEqual([]);
});
