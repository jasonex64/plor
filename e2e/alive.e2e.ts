// 14b-10b, alive on touch (docs/milestones/M14-14b-10-calm-and-alive.md): a hovered desktop tab takes the soft tint and
// its icon's solid version until the pointer leaves, the current tab shows its solid version, Groups turns, and both
// versions are in the tab's own text colour in every theme; a hovered button lifts 2px and rows take the tint, still
// under reduced motion; a number counts up from what the browser last showed within 600ms; a reaction you add and a
// comment that arrives pop in.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, sent, signInAndPick, sharedLink } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
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

const soft = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--soft)";
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });

// A tab's two icon versions: their opacity, and whether each is drawn in the tab's own colour.
const icon = (tab: Locator) =>
  tab.evaluate((a) => {
    const [outline, solid] = [...a.querySelectorAll("svg")];
    const color = getComputedStyle(a).color;
    return {
      outline: getComputedStyle(outline).opacity,
      solid: getComputedStyle(solid).opacity,
      ownColour: getComputedStyle(outline).color === color && getComputedStyle(solid).color === color,
    };
  });

async function caught(page: Page) {
  await page.goto("/");
  await play(page);
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.locator("#result")).toContainText("You climbed 0 of 7 stops");
}

test("a desktop tab changes to its solid icon on hover and holds it, in the tab's colour in every theme", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: WIDE })).newPage();
  await page.goto("/");
  await signInAndPick(page, "va");
  const nav = page.getByRole("navigation", { name: "Main" });
  const today = nav.getByRole("link", { name: "Today" });
  const friends = nav.getByRole("link", { name: "Friends" });
  const groups = nav.getByRole("link", { name: "Groups" });

  // At rest: the current tab solid, the others outlined.
  await expect.poll(() => icon(today)).toEqual({ outline: "0", solid: "1", ownColour: true });
  await expect.poll(() => icon(friends)).toEqual({ outline: "1", solid: "0", ownColour: true });

  // Hovered: the soft fill and the solid version, held while the pointer stays; back once it leaves.
  await friends.hover();
  await expect.poll(() => icon(friends)).toEqual({ outline: "0", solid: "1", ownColour: true });
  expect(await friends.evaluate((a) => getComputedStyle(a).backgroundColor)).toBe(await soft(page));
  await page.waitForTimeout(400);
  expect(await icon(friends)).toEqual({ outline: "0", solid: "1", ownColour: true });
  await page.mouse.move(900, 450);
  await expect.poll(() => icon(friends)).toEqual({ outline: "1", solid: "0", ownColour: true });

  // Groups turns as it changes: its solid version turned -60° at rest, upright under the pointer.
  const turn = () => groups.evaluate((a) => getComputedStyle(a.querySelectorAll("svg")[1].querySelector(":scope > g")!).transform);
  expect(await turn()).not.toBe("none");
  await groups.hover();
  await expect.poll(turn).toBe("none");
  await page.mouse.move(900, 450);

  // Every theme: both versions in the tab's own colour, for the current tab and the rest.
  for (const theme of ["paper", "night", "sky", "moonlit", "ink"]) {
    await DB.query("update private.profile set theme = $1 where user_id = (select id from auth.users where email = $2)", [theme, `${RUN}-va@example.test`]);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const tab of [today, friends, groups, nav.getByRole("link", { name: "Me" })]) expect((await icon(tab)).ownColour, theme).toBe(true);
  }
});

test("a hovered button lifts 2px, and stays put under reduced motion", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const page = await (await browser.newContext({ viewport: WIDE, reducedMotion })).newPage();
    await page.goto("/");
    await signInAndPick(page, reducedMotion === "reduce" ? "vc" : "vb");
    await page.goto("/updraft");
    const start = page.getByRole("button", { name: "Start", exact: true });
    await start.hover();
    const lift = () => start.evaluate((b) => [getComputedStyle(b).transform, getComputedStyle(b).boxShadow.replace(/^rgba?\([^)]*\) /, "")]);
    if (reducedMotion === "reduce") expect(await lift()).toEqual(["none", "0px 4px 0px 0px"]);
    else {
      await expect.poll(lift).toEqual(["matrix(1, 0, 0, 1, 0, -2)", "0px 6px 0px 0px"]);
      // Pressed, it drops in 80ms, as before 14b-10b (answer 14: "then press as now"); released, it eases back in 200ms.
      await page.mouse.down();
      expect(await start.evaluate((b) => getComputedStyle(b).transitionDuration)).toBe("0.08s, 0.08s");
      await page.mouse.up();
      expect(await start.evaluate((b) => getComputedStyle(b).transitionDuration)).toBe("0.2s, 0.2s");
    }
  }
});

test("a number counts up from what this browser last showed, within 600ms, and not under reduced motion", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const context = await browser.newContext({ viewport: WIDE, reducedMotion });
    // Every number Me's "points all time" tile shows, with when it showed it.
    await context.addInitScript(() => {
      const seen: { text: string; at: number }[] = [];
      (window as unknown as { seen: typeof seen }).seen = seen;
      new MutationObserver(() => {
        // While counting, the shown number is the hidden-from-readers copy; after, the plain text.
        const dd = document.querySelector("section[aria-label='All games'] dd");
        const text = dd ? (dd.querySelector("span[aria-hidden]") ?? dd).textContent : null;
        if (text !== null && seen.at(-1)?.text !== text) seen.push({ text, at: performance.now() });
      }).observe(document, { subtree: true, childList: true, characterData: true });
    });
    const page = await context.newPage();
    await page.goto("/");
    await signInAndPick(page, reducedMotion === "reduce" ? "ve" : "vd");
    await caught(page);
    // This browser last showed 40 points; the account has 0 (today's points count once the day is over).
    await page.evaluate(() => localStorage.setItem("plor.shown.me.points", "40"));
    await page.goto("/me");
    const points = page.getByRole("region", { name: "All games" }).locator("dd").first();
    await expect(points).toHaveText("0");
    const seen = await page.evaluate(() => (window as unknown as { seen: { text: string; at: number }[] }).seen);
    if (reducedMotion === "reduce") expect(seen.map((s) => s.text)).toEqual(["0"]);
    else {
      expect(seen[0].text).toBe("40");
      expect(seen.at(-1)!.text).toBe("0");
      // 600ms, and a frame either side for the browser to paint.
      expect(seen.at(-1)!.at - seen[0].at).toBeLessThanOrEqual(600 + 2 * 17);
    }
    // Kept once the count has ended (its last frame can come just after the number already reads 0).
    await expect.poll(() => page.evaluate(() => localStorage.getItem("plor.shown.me.points"))).toBe("0");
  }
});

test("a friend's row takes the tint under the pointer, and a reaction you add and a comment that arrives pop in", async ({ browser }) => {
  test.slow();
  const friend = await (await browser.newContext({ viewport: WIDE, permissions: ["clipboard-read", "clipboard-write"] })).newPage();
  await friend.goto("/friends");
  await signInAndPick(friend, "vf");
  const invite = await sharedLink(friend, friend.getByRole("region", { name: "Invite friends" }).getByRole("button", { name: "Invite a friend" }));
  const page = await (await browser.newContext({ viewport: WIDE })).newPage();
  await page.goto(new URL(invite).pathname);
  await signInAndPick(page, "vg");
  await page.getByRole("button", { name: "Add friend" }).click();
  await caught(friend);
  await caught(page);
  const popping = (el: Locator) => el.evaluate((e) => getComputedStyle(e).animationName !== "none");

  // A friend's row on the leaderboard (not the player's own, which is tinted already) takes the tint under the pointer.
  await page.goto("/");
  const row = page.getByRole("region", { name: "Leaderboard" }).getByRole("listitem").filter({ hasNotText: "(you)" });
  await expect(row).toBeVisible();
  const tint = await soft(page);
  expect(await row.evaluate((r) => getComputedStyle(r).backgroundColor)).not.toBe(tint);
  await row.hover();
  await expect.poll(() => row.evaluate((r) => getComputedStyle(r).backgroundColor)).toBe(tint);

  // The player's own comment pops as it's posted, and not again when the server's copy (with Delete) replaces it.
  await page.goto("/");
  const feed = page.getByRole("region", { name: "Feed" });
  const mine = feed.getByRole("listitem").filter({ hasText: "First, mine." });
  await page.getByLabel("Comment to your friends").fill("First, mine.");
  await page.getByRole("button", { name: "Post" }).click();
  await expect(mine).toBeVisible();
  expect(await popping(mine)).toBe(true);
  await sent(page, "/api/comments");
  await expect(mine.getByRole("button", { name: "Delete" })).toBeVisible();
  expect(await popping(mine)).toBe(false);

  // The player's Today is open when the friend's comment arrives: it pops; the comment already there doesn't.
  await friend.goto("/");
  await friend.getByLabel("Comment to your friends").fill("Then, theirs.");
  await friend.getByRole("button", { name: "Post" }).click();
  await sent(friend, "/api/comments");
  const theirs = feed.getByRole("listitem").filter({ hasText: "Then, theirs." });
  await expect(theirs).toBeVisible();
  expect(await popping(theirs)).toBe(true);
  expect(await popping(mine)).toBe(false);

  // A reaction added pops its emoji in; the others don't.
  const laugh = theirs.getByRole("button", { name: "😂" });
  expect(await popping(laugh.locator("span").first())).toBe(false);
  await laugh.click();
  await expect(laugh).toHaveText("😂 1");
  expect(await popping(laugh.locator("span").first())).toBe(true);
  expect(await popping(theirs.getByRole("button", { name: "👍" }).locator("span").first())).toBe(false);
});
