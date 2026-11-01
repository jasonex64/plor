// 14b-18, headings, signed-in Today, invites and words (docs/milestones/M14-14b-18-headings-today-invites-words.md):
// from 768px the page's name sits under "Plor" in its one heading; a signed-in player never sees Today's introduction;
// the streak pill is a 44px target; Back from How to play slides back; a refused clipboard shows the link to copy; your
// own invite link doesn't say a friend invited you; the 404 has no feed beside it; dates, bullets, reactions and back
// arrows read one way.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { GAME } from "../src/platform/game";
import { RUN, emailedCode, forwardPlayerIp, play, sharedLink, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { slideOf, watchSlides } from "./slides";

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

const INTRO = "Plor is a small site with a daily word game.";

// What the browser says when the page may not write to the clipboard (MDN, Clipboard.writeText: NotAllowedError).
const refuseClipboard = (page: Page) =>
  page.addInitScript(() => {
    navigator.clipboard.writeText = () => Promise.reject(new DOMException("Write permission denied.", "NotAllowedError"));
  });

test("from 768px the page's name sits under Plor in its heading, by the tab it's under", async ({ page }) => {
  test.slow();
  await page.setViewportSize(WIDE);
  await page.goto("/");
  await signInAndPick(page, "hn");
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-hn@example.test`]);
  const named = [
    ["/", "Today"],
    [GAME.path, "Today"],
    [`${GAME.path}/how-to-play`, "Today"],
    ["/friends", "Friends"],
    ["/groups", "Groups"],
    ["/me", "Me"],
    ["/streak", "Me"],
    ["/admin", "Admin"],
  ];
  for (const [path, name] of named) {
    await page.goto(path);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1, path).toHaveAccessibleName(`Plor, ${name}`);
    const line = h1.getByText(name, { exact: true });
    await expect(line, path).toBeVisible();
    // The card heading's size, muted, so "Plor" stays loudest (Numbers).
    expect(await line.evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).color])).toEqual(
      await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = "var(--muted)";
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return [`${parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.5}px`, color];
      }),
    );
  }
  // The cards keep their own headings.
  await page.goto("/friends");
  await expect(page.getByRole("heading", { level: 2, name: "Your friends" })).toBeVisible();
  // No name on the 404.
  await page.goto("/nope");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Plor");
  // Phones: the heading stays hidden for the top bar's wordmark, and still says the page.
  await page.setViewportSize(PHONE);
  await page.goto("/friends");
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveAccessibleName("Plor, Friends");
  expect(await h1.evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
});

test("signed in, Today's introduction never shows, not even before the profile loads", async ({ page, request }) => {
  // Signed out, the served HTML holds it (M02 2c), and it shows.
  expect(await (await request.get("/")).text()).toContain(INTRO);
  await page.goto("/");
  await expect(page.getByText(INTRO)).toBeVisible();

  // Signed in, on the pick-username step.
  const email = `${RUN}-hi@example.test`;
  await forwardPlayerIp(page, email);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await page.getByLabel("Code").fill(await emailedCode(email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Pick a username" })).toBeVisible();
  await expect(page.getByText(INTRO)).toBeHidden();
  await page.getByLabel("Username").fill(`hi${RUN}`);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Pick a username" })).toBeHidden();

  // A load of / whose profile is held back: the introduction stays hidden while it waits.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/profile", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
  await expect(page.getByText(INTRO)).toBeHidden();
  release();
  await expect(page.getByRole("link", { name: "Play", exact: true })).toBeVisible();
  await expect(page.getByText(INTRO)).toBeHidden();
});

test("the streak pill is a 44px target in the top bar and the sidebar, and looks the same", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/");
  await signInAndPick(page, "hs");
  for (const size of [PHONE, WIDE]) {
    await page.setViewportSize(size);
    const pill = page.locator('a[href="/streak"]').filter({ visible: true });
    await expect(pill).toHaveCount(1);
    const box = (await pill.boundingBox())!;
    // The pill itself isn't grown to 44px (answer 7: the same look).
    expect(box.height, `${size.width}px`).toBeLessThan(44);
    // 44px tall about the pill's middle: at the area's corners and the middle of its top and bottom edges, 21px above
    // and below the middle, a tap reaches the link, and no other control lies anywhere under that point. The area is as
    // wide as the pill inside its 1.5px border (the ::after is placed in the padding box), so the corners are 2px in.
    const points = [box.x + 2, box.x + box.width / 2, box.x + box.width - 2].flatMap((x) => [-21, 21].map((dy) => ({ x, y: box.y + box.height / 2 + dy })));
    const reach = await page.evaluate((points) =>
      points.map(({ x, y }) => {
        const top = document.elementFromPoint(x, y)?.closest("a")?.getAttribute("href") ?? null;
        const others = document.elementsFromPoint(x, y).filter((el) => el.matches("a, button, input, select, textarea") && el.getAttribute("href") !== "/streak");
        return { top, others: others.length };
      }), points);
    expect(reach, `${size.width}px`).toEqual(points.map(() => ({ top: "/streak", others: 0 })));
  }
});

test("the clock bar's Back on How to play slides back up to the game screen", async ({ page }) => {
  await page.goto("/");
  await signInAndPick(page, "hb");
  await play(page);
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await page.goto(`${GAME.path}/how-to-play`);
  const slides = await watchSlides(page);
  await page.getByRole("region", { name: "Stop in play" }).getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(new RegExp(`${GAME.path}$`));
  expect((await slideOf(slides, 1)).types).toEqual(["nav-back"]);
});

test("a refused clipboard shows the link to copy, for an invite, a group and the result", async ({ page }) => {
  test.slow();
  await refuseClipboard(page);
  await page.goto("/friends");
  await signInAndPick(page, "hc");
  const check = async (button: string, value: RegExp) => {
    await page.getByRole("button", { name: button }).click();
    const field = page.getByLabel("Copy it from here");
    await expect(field).toBeFocused();
    await expect(field).toHaveValue(value);
    expect(await field.evaluate((el: HTMLInputElement | HTMLTextAreaElement) => [el.readOnly, el.selectionStart, el.selectionEnd === el.value.length])).toEqual([true, 0, true]);
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  };
  await check("Invite a friend", /^http:\/\/localhost:3000\/i\/[A-Za-z0-9_-]+$/);

  await page.goto("/groups");
  await page.getByLabel("New group's name").fill("Copy Club");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  await check("Share group link", /^http:\/\/localhost:3000\/g\/[A-Za-z0-9_-]{10}$/);

  await page.goto("/");
  await play(page);
  await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.locator("#result")).toBeVisible();
  await check("Share", /http:\/\/localhost:3000\/$/);
});

test("your own invite link says it's yours; a friend's still says a friend invited you", async ({ browser }) => {
  const owner = await (await browser.newContext()).newPage();
  await owner.goto("/friends");
  await signInAndPick(owner, "ho");
  const link = new URL(await sharedLink(owner, owner.getByRole("button", { name: "Invite a friend" }))).pathname;
  await owner.goto(link);
  await expect(owner.getByRole("heading", { name: "This is your invite link" })).toBeVisible();
  await expect(owner.getByText("Send it to a friend.")).toBeVisible();
  await expect(owner.getByText("A friend invited you")).toBeHidden();

  const friend = await (await browser.newContext()).newPage();
  await friend.goto(link);
  await expect(friend.getByText("A friend invited you")).toBeVisible();
  await signInAndPick(friend, "hf");
  await expect(friend.getByRole("button", { name: "Add friend" })).toBeVisible();
  await expect(friend.getByText("A friend invited you")).toBeVisible();
});

test("from 1200px the 404 has no friends feed beside it", async ({ page }) => {
  await page.setViewportSize(WIDE);
  await page.goto("/friends");
  await signInAndPick(page, "h4");
  await expect(page.getByLabel("Friends feed")).toBeVisible();
  await page.goto("/nope");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  // The shell and the feed render together, once the profile is read (src/app/home.tsx, FrameParts).
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.getByLabel("Friends feed")).toHaveCount(0);
});

test("the feed's past day reads like every other date, comments have no bullets, reactions are apart, and back arrows are ‹", async ({ browser }) => {
  test.slow();
  const friend = await (await browser.newContext({ viewport: PHONE })).newPage();
  await friend.goto("/friends");
  await signInAndPick(friend, "hw");
  const invite = await sharedLink(friend, friend.getByRole("button", { name: "Invite a friend" }));
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await page.goto(new URL(invite).pathname);
  await signInAndPick(page, "hx");
  await page.getByRole("button", { name: "Add friend" }).click();
  for (const p of [friend, page]) {
    await p.goto("/");
    await play(p);
    await p.getByLabel("Your answer").fill(puzzle.hostAnswer);
    await p.getByRole("button", { name: "Answer" }).click();
    await expect(p.locator("#result")).toBeVisible();
  }
  // The friend's comment, with a reaction from each of them, written straight to the database: the reaction rules
  // aren't what this checks.
  await DB.query("begin");
  await DB.query("set local session_replication_role = replica");
  const { rows } = await DB.query(
    `insert into private.comment (user_id, game_id, puzzle_date, body)
     select id, $2, private.today(), 'Two reactions.' from auth.users where email = $1 returning id`,
    [`${RUN}-hw@example.test`, GAME.id],
  );
  await DB.query(
    `insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji)
     select u.id, $3, private.today(), $4, e.emoji
     from (values ($1, '😂'), ($2, '❤️')) as e(email, emoji) join auth.users u on u.email = e.email`,
    [`${RUN}-hw@example.test`, `${RUN}-hx@example.test`, GAME.id, rows[0].id],
  );
  await DB.query("commit");

  await page.goto("/");
  const feed = page.getByRole("region", { name: "Feed" });
  const comment = feed.getByRole("listitem").filter({ hasText: "Two reactions." });
  await expect(comment).toBeVisible();
  expect(await comment.evaluate((li) => getComputedStyle(li).listStyleType)).toBe("none");
  // The viewer's own is ❤️, read "❤️ 1, yours"; the comma between the two is read, not shown (Source diff).
  expect(await comment.evaluate((li) => li.textContent)).toContain("😂 1, ❤️ 1, yours");

  await feed.getByRole("button", { name: "Earlier day" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /^Friends' comments on (Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} [A-Z][a-z]{2}$/ })).toBeVisible();

  for (const path of [GAME.path, `${GAME.path}/how-to-play`, "/streak"]) {
    await page.goto(path);
    await expect(page.getByRole("main").getByRole("link").first()).toBeVisible();
    expect(await page.getByRole("main").innerText(), path).not.toContain("←");
  }
});
