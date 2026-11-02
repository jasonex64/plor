// 14b-19, controls, layout jumps, lost taps and stale state (docs/milestones/M14-14b-19-controls-layout-and-state.md):
// disabled buttons flat, your own reaction filled, the dark themes' danger red, 16px fields; no cards flashing on
// Continue, a countdown that doesn't move the prompt, a long name cut on a board row only at the default text size,
// Privacy's list items without a lone last word; the feed kept across Start, a tab tapped mid-slide opened, the streak
// read again at the daily reset and Me after a time-up.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { GAME } from "../src/platform/game";
import { RUN, play, sharedLink, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const PHONE = { width: 390, height: 844 };
let puzzle: TodayPuzzle;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

// A colour slot as the page computes it.
const slot = (page: Page, name: string, property = "color") =>
  page.evaluate(
    ({ name, property }) => {
      const probe = document.createElement("span");
      probe.style.setProperty(property, `var(${name})`);
      document.body.append(probe);
      const value = getComputedStyle(probe).getPropertyValue(property);
      probe.remove();
      return value;
    },
    { name, property },
  );

async function caught(page: Page) {
  await page.goto("/");
  await play(page);
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.locator("#result")).toBeVisible();
}

test("a disabled button is flat, edged in grey and muted, the accent and small kinds too, in Paper and Night", async ({ page }) => {
  await page.goto("/groups");
  await signInAndPick(page, "cd");
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/groups");
    const create = page.getByRole("button", { name: "Create group" });
    await expect(create).toBeEnabled();
    // The real button with its kit kinds (accent, small), disabled as it is while a group is being made, and a plain one.
    const looks = await create.evaluate((button) => {
      const accent = button.cloneNode(true) as HTMLButtonElement;
      accent.disabled = true;
      const plain = document.createElement("button");
      plain.disabled = true;
      plain.textContent = "Add friend";
      button.after(accent, plain);
      return [accent, plain].map((b) => {
        const s = getComputedStyle(b);
        return [s.boxShadow, s.borderTopColor, s.backgroundColor, s.color];
      });
    });
    const expected = [await slot(page, "--edge"), await slot(page, "--surface"), await slot(page, "--muted")];
    for (const look of looks) expect(look, scheme).toEqual(["none", ...expected]);
  }
});

test("the dark themes' danger red is #ff5c5c; Paper and Sky keep theirs", async ({ page }) => {
  await page.goto("/privacy");
  for (const [theme, red] of [
    ["night", "rgb(255, 92, 92)"],
    ["moonlit", "rgb(255, 92, 92)"],
    ["ink", "rgb(255, 92, 92)"],
    ["paper", "rgb(180, 35, 47)"],
    ["sky", "rgb(180, 35, 47)"],
  ]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    expect(await slot(page, "--danger"), theme).toBe(red);
  }
  await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await slot(page, "--danger"), "device dark").toBe("rgb(255, 92, 92)");
});

test("your own reaction in the ⋯ menu is filled with the accent", async ({ browser }) => {
  test.slow();
  const friend = await (await browser.newContext({ viewport: PHONE })).newPage();
  await friend.goto("/friends");
  await signInAndPick(friend, "ca");
  const invite = await sharedLink(friend, friend.getByRole("button", { name: "Invite a friend" }));
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await page.goto(new URL(invite).pathname);
  await signInAndPick(page, "cb");
  await page.getByRole("button", { name: "Add friend" }).click();
  await caught(friend);
  await caught(page);
  // The friend's comment, with this player's 😂, written straight to the database: the reaction rules aren't what this
  // checks.
  await DB.query("begin");
  await DB.query("set local session_replication_role = replica");
  const { rows } = await DB.query(
    `insert into private.comment (user_id, game_id, puzzle_date, body) select id, $2, private.today(), 'Pressed.' from auth.users where email = $1 returning id`,
    [`${RUN}-ca@example.test`, GAME.id],
  );
  await DB.query(
    `insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji) select id, $2, private.today(), $3, '😂' from auth.users where email = $1`,
    [`${RUN}-cb@example.test`, GAME.id, rows[0].id],
  );
  await DB.query("commit");
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const comment = page.getByRole("region", { name: "Feed" }).getByRole("listitem").filter({ hasText: "Pressed." });
    await comment.getByRole("button", { name: /^Actions for / }).click();
    const mine = comment.getByRole("button", { name: "😂" });
    await expect(mine).toHaveAttribute("aria-pressed", "true");
    const accent = await slot(page, "--accent", "background-color");
    expect(await mine.evaluate((b) => [getComputedStyle(b).backgroundColor, getComputedStyle(b).boxShadow]), scheme).toEqual([accent, "none"]);
    // Still filled under the pointer, where you'd tap to take it back (14b-19 review).
    await mine.hover();
    expect(await mine.evaluate((b) => getComputedStyle(b).backgroundColor), `${scheme}, hovered`).toBe(accent);
  }
});

test("the comment box and the pickers are 16px, and follow the browser's text size", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "cf");
  await caught(page);
  await page.goto("/");
  const box = page.getByLabel("Comment to your friends");
  const picker = page.getByRole("combobox").first();
  await expect(box).toBeVisible();
  expect(await box.evaluate((el) => getComputedStyle(el).fontSize)).toBe("16px");
  expect(await picker.evaluate((el) => getComputedStyle(el).fontSize)).toBe("16px");
  // Any field, not only these two: a textarea and a select with no class of their own (Insights' day picker is one).
  expect(
    await page.evaluate(() => {
      const fields = [document.createElement("textarea"), document.createElement("select")];
      document.querySelector("main")!.append(...fields);
      return fields.map((f) => getComputedStyle(f).fontSize);
    }),
  ).toEqual(["16px", "16px"]);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32 } });
  await page.reload();
  await expect(box).toBeVisible();
  expect(await box.evaluate((el) => getComputedStyle(el).fontSize)).toBe("32px");
});

test("Continue shows the question's skeleton, never the cards, until the run loads", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "cc");
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await page.goto("/");
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/run", async (route) => {
    if (new URL(page.url()).pathname === GAME.path) await held;
    await route.continue();
  });
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL(new RegExp(`${GAME.path}$`));
  await expect(page.getByRole("status", { name: "Loading your question" })).toBeVisible();
  await expect(page.getByRole("heading", { name: `Your ${GAME.name}` })).toHaveCount(0);
  await expect(page.getByRole("region", { name: `${GAME.name} comments` })).toHaveCount(0);
  release();
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await expect(page.getByRole("heading", { name: `Your ${GAME.name}` })).toHaveCount(0);
});

test("the clock bar's Back also opens on the question's skeleton", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "cq");
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  // Opened from its address, so the game screen isn't already in the page, kept hidden from the visit above.
  await page.goto("/friends");
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/run", async (route) => {
    if (new URL(page.url()).pathname === GAME.path) await held;
    await route.continue();
  });
  await page.getByRole("region", { name: "Stop in play" }).getByRole("link", { name: "Back" }).click();
  await expect(page.getByRole("status", { name: "Loading your question" })).toBeVisible();
  release();
  await expect(page.getByLabel("Your answer")).toBeVisible();
});

test("from 1200px the game screen's feed column is there from the first paint, not after the run loads", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await signInAndPick(page, "cj");
  await expect(page.locator("body[data-column]")).toBeAttached();
  // Every time the page's room for the column goes, from Play on Today until the game screen has its run.
  await page.evaluate(() => {
    const w = window as unknown as { gone: number };
    w.gone = 0;
    new MutationObserver(() => {
      if (!document.body.hasAttribute("data-column")) w.gone++;
    }).observe(document.body, { attributes: true, attributeFilter: ["data-column"] });
  });
  await page.getByRole("link", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: `${GAME.name} comments` })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { gone: number }).gone)).toBe(0);
});

test("the countdown keeps its width from two digits to one, so the prompt doesn't move", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await signInAndPick(page, "ck");
  await play(page);
  const clock = page.getByRole("timer", { name: "Seconds left" });
  await expect(clock).toHaveText(/^\d\d$/);
  const two = (await clock.boundingBox())!.width;
  await page.clock.fastForward("00:12");
  await expect(clock).toHaveText(/^\d$/);
  expect(Math.abs((await clock.boundingBox())!.width - two)).toBeLessThan(0.5);
});

test("a long name on a board row is cut at the default text size, and shown whole with the points under it at 200%", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/friends");
  await signInAndPick(page, "cl");
  await DB.query("update private.profile set display_name = 'Bartholomew Fitzwilliams' where username = $1", [`cl${RUN}`]);
  await page.reload();
  const row = page.getByRole("listitem").filter({ hasText: "Bartholomew Fitzwilliams (you)" }).first();
  const fits = () =>
    row.evaluate((li) => {
      const pointLines = (el: Element) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      };
      const name = li.querySelector("span[class*='name']") as HTMLElement;
      const points = li.querySelector("b")!;
      return {
        cut: name.scrollWidth > name.clientWidth,
        ellipsis: getComputedStyle(name).textOverflow,
        // On the name's line, the points start above the name's foot, and on one line of their own ("0 points" whole).
        oneLine: points.getBoundingClientRect().top < name.getBoundingClientRect().bottom && pointLines(points) === 1,
      };
    });
  await expect(row).toBeVisible();
  expect(await fits()).toEqual({ cut: true, ellipsis: "ellipsis", oneLine: true });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32 } });
  await page.reload();
  await expect(row).toBeVisible();
  const big = await fits();
  expect({ cut: big.cut, oneLine: big.oneLine }).toEqual({ cut: false, oneLine: false });
});

test("Privacy's list items avoid a lone last word", async ({ page }) => {
  await page.goto("/privacy");
  expect(await page.locator("main li").first().evaluate((li) => getComputedStyle(li).getPropertyValue("text-wrap-style"))).toBe("pretty");
});

test("the game screen's feed keeps the day it shows across Start and the run", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "cs");
  await page.getByRole("link", { name: "Play", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${GAME.path}$`));
  const feed = page.getByRole("region", { name: `${GAME.name} comments` });
  await feed.getByRole("button", { name: "Earlier day" }).click();
  const earlier = page.getByRole("heading", { level: 2, name: /^Friends' comments on / });
  await expect(earlier).toBeVisible();
  const shown = await earlier.textContent();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: shown! })).toBeVisible();
});

test("a tab tapped while a page slides opens that tab", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/me");
  await signInAndPick(page, "ct");
  const tab = (await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Friends" }).boundingBox())!;
  // The streak pill opens /streak with a slide; the tap lands while the slide runs.
  await page.evaluate(() => (document.querySelector('a[href="/streak"]') as HTMLAnchorElement).click());
  await page.waitForFunction(() => document.documentElement.matches(":active-view-transition"));
  await page.mouse.click(tab.x + tab.width / 2, tab.y + tab.height / 2);
  await expect(page).toHaveURL(/\/friends$/);
});

test("a click with no point while a page slides isn't sent to the navigation", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/streak");
  await signInAndPick(page, "cn");
  await expect(page.getByRole("main").getByRole("link", { name: "Me" })).toBeVisible();
  // Back to Me slides; a click as the keyboard makes one (no count, at 0, 0) lands while it runs. The sidebar's pill,
  // hidden on phones, has an empty box at 0, 0.
  await page.evaluate(() => (document.querySelector("main a[href='/me']") as HTMLAnchorElement).click());
  await page.waitForFunction(() => document.documentElement.matches(":active-view-transition"));
  await page.evaluate(() => document.body.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await expect(page).toHaveURL(/\/me$/);
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/me$/);
});

test("the streak pill is read again at the daily reset", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "cr");
  // The server's time to the reset, made a second so the test needn't wait for midnight; the page loads the profile once
  // or twice as it starts (the dev server's double effects), so the read that counts is one a second or more later.
  const reads: number[] = [];
  let faked = 0;
  await page.route("**/api/profile", async (route) => {
    reads.push(Date.now());
    const response = await route.fetch();
    const body = await response.json();
    // The next day's reset far off once this one's read.
    await route.fulfill({ response, json: { ...body, msToReset: faked ? 3_600_000 : 1000 } });
    if (!faked) faked = Date.now();
  });
  await page.reload();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect.poll(() => reads.filter((at) => at - faked >= 900).length, { timeout: 5000 }).toBeGreaterThanOrEqual(1);
});

test("a setting saved before the reset doesn't put the reset's read off", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "cv");
  // The reset 3 s after the first read, each read saying what's left of them, as the server would, and the next day's far
  // off once it's past; a setting saved 1.5 s in must not start the 3 s again.
  const reads: number[] = [];
  await page.route("**/api/profile", async (route) => {
    reads.push(Date.now());
    const response = await route.fetch();
    const body = await response.json();
    const left = 3000 - (Date.now() - reads[0]);
    await route.fulfill({ response, json: { ...body, msToReset: left > 0 ? left : 3_600_000 } });
  });
  await page.reload();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect.poll(() => reads.length).toBeGreaterThanOrEqual(1);
  const first = reads[0];
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Settings" }).filter({ visible: true }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("switch", { name: /Numbers on the calendar/ }).click();
  await expect.poll(() => reads.filter((at) => at - first >= 2800).length, { timeout: 6000 }).toBeGreaterThanOrEqual(1);
  expect(reads.find((at) => at - first >= 2800)! - first).toBeLessThan(4000);
});

test("after a time-up away from the game, Me reads its numbers again", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await signInAndPick(page, "cm");
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Me" }).click();
  await expect(page.getByRole("region", { name: "Stop in play" })).toBeVisible();
  let reads = 0;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/api/me") reads++;
  });
  await page.clock.fastForward("00:25");
  await expect(page.getByRole("region", { name: "Stop in play" })).toContainText("at stop 1");
  await expect.poll(() => reads).toBeGreaterThanOrEqual(1);
});
