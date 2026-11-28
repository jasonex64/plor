// The feed on Today (docs/milestones/M16-16f-the-shared-pieces.md, 16f-5; the human's answers 9, 12, 14, 19, 22, 23, 26, 27,
// 29, 46 to 54): endless scrolling, a friend's result blurred until the viewer finishes that game, reactions on today's
// items, date lines, the comment box with its game, no leaderboard card on phones, and the APG Feed's keys. Friends'
// runs and comments are written in the database with the rules off (as today-games.e2e.ts writes Fragments runs), so
// each item's time and day are chosen; the viewer is a real signed-in player who plays Offbeat for real where a test
// needs a finished run of it. Fragments' day and words are this file's own, as play2.e2e.ts's are.
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { FEED_PAGE_SIZE } from "../src/config/tunables";
import { GAME, SUBSTRINGS } from "../src/platform/game";
import { fixtureId } from "../src/test/answer-fixture";
import { RUN, playToEnd, sent, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
// Rows for players who never played are written with the rules off, which needs the local superuser.
const ADMIN = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 1 });
const ROUNDS = ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"];
let puzzle: TodayPuzzle;
let today = "";
let addedDay = false;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
  today = (await DB.query<{ d: string }>("select private.today()::text as d")).rows[0].d;
  const { rowCount } = await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('substrings', $1::date, $2) on conflict do nothing", [
    today,
    { format: 1, game_id: "substrings", date: today, rounds: ROUNDS, bonus_letter: "j" },
  ]);
  addedDay = rowCount === 1;
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  if (addedDay) await DB.query("delete from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [today]);
  await removePuzzle(DB, puzzle);
  await DB.end();
  await ADMIN.end();
});

// Each test's pages are closed and its players go (their rows cascade), so the next starts from nothing.
const contexts: BrowserContext[] = [];
test.afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.close()));
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
});

async function viewer(browser: Browser, name: string, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport });
  contexts.push(context);
  const page = await context.newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  return page;
}

const idOf = async (name: string) => (await DB.query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${name}@example.test`])).rows[0].id;

// Writes with the rules off: friendships, comments, reactions and runs as the app would have written them by a time.
async function seed(write: (q: (sql: string, params?: unknown[]) => Promise<unknown>) => Promise<void>) {
  const client = await ADMIN.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    await write((sql, params) => client.query(sql, params));
    await client.query("commit");
  } finally {
    client.release();
  }
}

// A friend who never signs in, befriended to the viewer; returns their ID.
async function friendOf(name: string, viewerName: string): Promise<string> {
  const me = await idOf(viewerName);
  const id = randomUUID();
  await seed(async (q) => {
    await q("insert into auth.users (id, email) values ($1, $2)", [id, `${RUN}-${name}@example.test`]);
    await q("insert into private.profile (user_id, username) values ($1, $2)", [id, `${name}${RUN}`]);
    await q("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [me, id]);
  });
  return id;
}

// A comment of the friends thread, `ago` minutes before now, on a puzzle day (a number of days before today).
// Its day is its time's day, as the app writes it: a day later than its time's hides it from a later page, whose cursor
// is a time (CI failed so in the minutes after the day's reset, 2026-11-15).
const comment = (userId: string, body: string, minutesAgo: number, game = "offbeat") =>
  seed(async (q) => {
    await q("insert into private.comment (user_id, game_id, puzzle_date, body, created_at) values ($1, $2, private.day_of(now() - make_interval(mins => $4::int)), $3, now() - make_interval(mins => $4::int))", [
      userId,
      game,
      body,
      minutesAgo,
    ]);
  });

// A finished run of Offbeat, two answers for 35 points (dog, cat), and of Fragments, a word in its last round: written as the db tests do.
const offbeatDone = (userId: string) =>
  seed(async (q) => {
    await q("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'offbeat', private.today(), now() - interval '1 hour')", [userId]);
    for (const [slug, tier, points] of [["dog", "common", 10], ["cat", "uncommon", 25]] as const)
      await q(
        "insert into private.clock_answer (user_id, game_id, puzzle_date, question_idx, entry_id, tier, added_ms, points, created_at) values ($1, 'offbeat', private.today(), 0, $2, $3, 3000, $4, now() - interval '50 minutes')",
        [userId, fixtureId(0, slug), tier, points],
      );
  });
const fragmentsDone = (userId: string) =>
  seed(async (q) => {
    await q("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'substrings', private.today(), now() - interval '1 hour')", [userId]);
    await q("insert into private.question_open (user_id, game_id, puzzle_date, question_idx, opened_at) values ($1, 'substrings', private.today(), 6, now() - interval '50 minutes')", [userId]);
    await q("insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word, created_at) values ($1, 'substrings', private.today(), 6, 'qyzx', 'qyzx', now() - interval '45 minutes')", [userId]);
  });

// Plays Offbeat's run on a clock from Today's card to its result, and leaves the player on Today.
async function finishOffbeat(page: Page) {
  await playToEnd(page);
  await page.goto("/");
}

const feedOf = (page: Page) => page.getByRole("feed", { name: "Feed" });
const articles = (page: Page) => feedOf(page).getByRole("article");

test("45 items load 20 at a time as the last comes on screen, and the last is reached", async ({ browser }) => {
  const page = await viewer(browser, "fa");
  const friend = await friendOf("fb", "fa");
  for (let i = 0; i < 45; i++) await comment(friend, `feed comment ${i}`, i + 1);
  const pages: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/feed/items?cursor=")) pages.push(r.url());
  });
  await page.goto("/");
  await expect(articles(page)).toHaveCount(FEED_PAGE_SIZE);
  // Nothing loaded yet beyond the first page, and loading never moves focus.
  await articles(page).first().focus();
  expect(pages).toHaveLength(0);
  await articles(page).last().scrollIntoViewIfNeeded();
  await expect(articles(page)).toHaveCount(40);
  await articles(page).last().scrollIntoViewIfNeeded();
  await expect(articles(page)).toHaveCount(45);
  await expect(articles(page).last()).toContainText("feed comment 44");
  await expect(articles(page).last()).toHaveAttribute("aria-posinset", "45");
  await expect(articles(page).last()).toHaveAttribute("aria-setsize", "45");
  await expect(articles(page).first()).toBeFocused();
  await expect(feedOf(page)).toHaveAttribute("aria-busy", "false");
  // The end: the last item on screen loads nothing more.
  await articles(page).last().scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  expect(pages).toHaveLength(2);
});

test("a page loading shows three still or pulsing dots and a status for a screen reader, not the words", async ({ browser }) => {
  const page = await viewer(browser, "fx");
  const friend = await friendOf("fy", "fx");
  for (let i = 0; i < FEED_PAGE_SIZE + 1; i++) await comment(friend, `dots comment ${i}`, i + 1);
  // Hold the second page until the checks are done.
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/feed/items?cursor=*", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/");
  const status = feedOf(page).locator("xpath=following-sibling::*[@role='status']");
  await expect(articles(page)).toHaveCount(FEED_PAGE_SIZE);
  await expect(status).toHaveCount(1);
  await expect(status.locator("span[aria-hidden] > span")).toHaveCount(0);
  await articles(page).last().scrollIntoViewIfNeeded();
  await expect(status).toHaveText("Loading more");
  await expect(status.locator("span[aria-hidden] > span")).toHaveCount(3);
  // The words are for a screen reader only: they take no room beside the dots.
  expect((await status.getByText("Loading more").boundingBox())!.width).toBeLessThanOrEqual(1);
  expect(await status.locator("span[aria-hidden] > span").first().evaluate((el) => getComputedStyle(el).animationName)).not.toBe("none");
  // Under Reduce motion the dots stand still.
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await status.locator("span[aria-hidden] > span").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  release();
  await expect(articles(page)).toHaveCount(FEED_PAGE_SIZE + 1);
  await expect(status).toHaveCount(0);
});

test("a friend's result is blurred until the viewer finishes that game, and 'Play to see' opens the game", async ({ browser }) => {
  test.slow();
  const page = await viewer(browser, "fc");
  const friend = await friendOf("fd", "fc");
  await offbeatDone(friend);
  await fragmentsDone(friend);
  await page.goto("/");
  const name = `fd${RUN}`;
  const item = (game: string) => articles(page).filter({ hasText: name }).filter({ hasText: game });
  // Name, game and time, and the words of an offer: nothing of the run.
  for (const game of [GAME.name, SUBSTRINGS.name]) {
    await expect(item(game)).toHaveCount(1);
    await expect(item(game).getByRole("link", { name: "Play to see", exact: true })).toBeVisible();
    await expect(item(game).locator("time")).toBeVisible();
    await expect(item(game)).not.toContainText(/scored|points/);
  }
  expect(await feedOf(page).innerHTML()).not.toMatch(/scored|\d+ points/);
  await expect(item(SUBSTRINGS.name).getByRole("link", { name: "Play to see" })).toHaveAttribute("href", SUBSTRINGS.path);

  // It opens that game.
  await item(SUBSTRINGS.name).getByRole("link", { name: "Play to see" }).click();
  await expect(page).toHaveURL(/\/play2$/);
  await page.goto("/");

  // Finishing Offbeat clears Offbeat's alone.
  await finishOffbeat(page);
  await expect(item(GAME.name)).toContainText("scored 35 points with 2 answers");
  await expect(item(GAME.name).getByRole("link", { name: "Play to see" })).toHaveCount(0);
  await expect(item(SUBSTRINGS.name).getByRole("link", { name: "Play to see" })).toBeVisible();

  // Then Fragments: its item is whole once the viewer has finished it.
  await fragmentsDone(await idOf("fc"));
  await page.goto("/");
  await expect(item(SUBSTRINGS.name)).toContainText(/\d+ points/);
  await expect(page.getByRole("link", { name: "Play to see" })).toHaveCount(0);
});

test("a friend's result today takes a reaction from its menu, and it stays", async ({ browser }) => {
  test.slow();
  const page = await viewer(browser, "fe");
  const friend = await friendOf("ff", "fe");
  await offbeatDone(friend);
  await page.goto("/");
  await finishOffbeat(page);
  const item = articles(page).filter({ hasText: `ff${RUN}` });
  await item.getByRole("button", { name: `React to ff${RUN}'s ${GAME.name} run` }).click();
  await item.getByRole("button", { name: "😂" }).click();
  await expect(item).toContainText("😂 1");
  await sent(page, "/api/reactions");
  await page.reload();
  await expect(articles(page).filter({ hasText: `ff${RUN}` })).toContainText("😂 1");
});

test("a date line begins each earlier day, inside its first article and outside its name; earlier days take no new reaction", async ({ browser }) => {
  const page = await viewer(browser, "fg");
  const friend = await friendOf("fh", "fg");
  await comment(friend, `today ${RUN}`, 5);
  await comment(friend, `yesterday ${RUN}`, 60 * 24);
  await comment(friend, `older ${RUN}`, 60 * 24 * 3);
  // A reaction already on yesterday's comment, to be shown without a menu to add one.
  await seed(async (q) => {
    await q(
      "insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji) select c.user_id, c.game_id, c.puzzle_date, c.id, '😂' from private.comment c where c.body = $1",
      [`yesterday ${RUN}`],
    );
  });
  await page.goto("/");
  const [now, yesterday, older] = [`today ${RUN}`, `yesterday ${RUN}`, `older ${RUN}`].map((text) => articles(page).filter({ hasText: text }));
  await expect(articles(page)).toHaveCount(3);
  await expect(articles(page).nth(0)).toContainText(`today ${RUN}`);
  await expect(articles(page).nth(1)).toContainText(`yesterday ${RUN}`);
  await expect(now).not.toContainText(/Yesterday|\w{3} \d+ \w{3}/);
  await expect(yesterday).toContainText("Yesterday");
  const expected = await DB.query<{ d: string }>("select to_char(private.today() - 3, 'Dy FMDD Mon') as d");
  await expect(older).toContainText(expected.rows[0].d);
  // The line is in the article but not in what names it.
  await expect(yesterday).not.toHaveAccessibleName(/Yesterday/);
  await expect(yesterday).toContainText("😂 1");
  await yesterday.getByRole("button", { name: /^Actions for / }).click();
  // The menu opens with its action and none of the emoji to pick.
  await expect(yesterday.getByRole("button", { name: "Report" })).toBeVisible();
  await expect(yesterday.getByRole("button", { name: "👍" })).toHaveCount(0);
});

test("the comment box posts to a game the writer has finished today, chosen in the box", async ({ browser }) => {
  test.slow();
  const page = await viewer(browser, "fi");
  await friendOf("fj", "fi");
  await page.goto("/");
  const section = page.getByRole("region", { name: "Feed" });
  // Nothing finished: no box, and a line saying so.
  await expect(section.getByText("Finish today's game to join in.")).toBeVisible();
  await expect(section.getByLabel("Comment to your friends")).toHaveCount(0);

  // One game finished: the box, with no choice to make.
  await finishOffbeat(page);
  await expect(section.getByLabel("Comment to your friends")).toBeVisible();
  await expect(section.getByLabel("Game")).toHaveCount(0);

  // Both: the box offers each, by its shown name, as a switch like the boards' (docs/milestones/
  // M20-design-rules-and-clean-up.md, answer 39), not the browser's dropdown.
  await fragmentsDone(await idOf("fi"));
  await page.goto("/");
  const game = section.getByRole("radiogroup", { name: "Game" });
  await expect(game.getByRole("radio")).toHaveCount(2);
  await expect(section.locator("select")).toHaveCount(0);
  await expect(game.getByRole("radio", { name: GAME.name })).toBeChecked();
  await game.getByText(SUBSTRINGS.name, { exact: true }).click();
  await expect(game.getByRole("radio", { name: SUBSTRINGS.name })).toBeChecked();
  const body = `to fragments ${RUN}`;
  await section.getByLabel("Comment to your friends").fill(body);
  await section.getByRole("button", { name: "Post" }).click();
  const mine = articles(page).filter({ hasText: body });
  await expect(mine).toContainText(SUBSTRINGS.name);
  await sent(page, "/api/comments");
  const rows = await DB.query<{ game_id: string }>("select game_id from private.comment where body = $1", [body]);
  expect(rows.rows).toEqual([{ game_id: "substrings" }]);
  await page.reload();
  await expect(articles(page).filter({ hasText: body })).toContainText(SUBSTRINGS.name);
});

// The chosen game in the comment box looks as it does on a board's switch: the composer's label rule must not reach the
// switch's choices (docs/milestones/M20-design-rules-and-clean-up.md, 20n-1, finding 1). It sets its own 1280px screen.
const chosenLook = (switchGroup: Locator) =>
  switchGroup.locator("label:has(input:checked)").evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, background: s.backgroundColor, fontSize: s.fontSize, fontWeight: s.fontWeight };
  });

test("the chosen game in the comment box looks as it does on the board's switch", async ({ browser }) => {
  test.slow();
  const page = await viewer(browser, "fo");
  await finishOffbeat(page);
  await fragmentsDone(await idOf("fo"));
  await page.goto("/");
  const box = page.getByRole("region", { name: "Feed" }).getByRole("radiogroup", { name: "Game" });
  const board = page.getByRole("region", { name: "Leaderboard" }).getByRole("radiogroup", { name: "Game" });
  await expect(box.getByRole("radio")).toHaveCount(2);
  expect(await chosenLook(box)).toEqual(await chosenLook(board));
});

test("on phones Today has no leaderboard card; from 768px it does", async ({ browser }) => {
  const page = await viewer(browser, "fk", { width: 375, height: 800 });
  await expect(page.getByRole("region", { name: "Feed" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Leaderboard" })).toHaveCount(0);
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole("region", { name: "Leaderboard" })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.getByRole("region", { name: "Leaderboard" })).toHaveCount(0);
});

test("Page Down and Page Up move between items; Control+End and Control+Home leave the feed", async ({ browser }) => {
  const page = await viewer(browser, "fl");
  const friend = await friendOf("fm", "fl");
  for (let i = 0; i < 3; i++) await comment(friend, `key ${i}`, i + 1);
  await page.goto("/");
  await expect(articles(page)).toHaveCount(3);
  const items = articles(page);
  await items.nth(0).focus();
  await page.keyboard.press("PageDown");
  await expect(items.nth(1)).toBeFocused();
  // From a control inside an item too.
  await items.nth(1).getByRole("button", { name: /^Actions for / }).focus();
  await page.keyboard.press("PageDown");
  await expect(items.nth(2)).toBeFocused();
  await page.keyboard.press("PageUp");
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press("PageUp");
  await expect(items.nth(0)).toBeFocused();

  const outside = (where: "after" | "before") =>
    page.evaluate((side) => {
      const feed = document.querySelector('[role="feed"]')!;
      const active = document.activeElement!;
      const position = feed.compareDocumentPosition(active);
      return !feed.contains(active) && Boolean(position & (side === "after" ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING));
    }, where);
  await page.keyboard.press("Control+End");
  expect(await outside("after")).toBe(true);
  await items.nth(1).focus();
  await page.keyboard.press("Control+Home");
  expect(await outside("before")).toBe(true);
});

test("a group's page lists both games' comments for the day, each tagged, and its box picks the game", async ({ browser }) => {
  test.slow();
  const page = await viewer(browser, "fn");
  await page.goto("/groups");
  await page.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Owls");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  const group = page.url();
  // Offbeat finished for real, Fragments in the database: the box offers both.
  await page.goto("/");
  await finishOffbeat(page);
  await fragmentsDone(await idOf("fn"));
  await page.goto(group);
  const thread = page.getByRole("region", { name: "Comments" });
  // The game as a switch (answer 39).
  const games = thread.getByRole("radiogroup", { name: "Game" });
  await expect(games.getByRole("radio")).toHaveCount(2);
  await expect(thread.locator("select")).toHaveCount(0);
  const posts = [
    [GAME.name, `owls offbeat ${RUN}`],
    [SUBSTRINGS.name, `owls fragments ${RUN}`],
  ];
  for (const [game, body] of posts) {
    await games.getByText(game, { exact: true }).click();
    await thread.getByLabel("Comment", { exact: true }).fill(body);
    await thread.getByRole("button", { name: "Post" }).click();
    await sent(page, "/api/comments");
  }
  // One list, oldest first, each comment tagged with its game.
  const rows = thread.getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText(`${GAME.name} · `);
  await expect(rows.nth(0)).toContainText(posts[0][1]);
  await expect(rows.nth(1)).toContainText(`${SUBSTRINGS.name} · `);
  await expect(rows.nth(1)).toContainText(posts[1][1]);
  // Each landed in its own game's thread of the group.
  const stored = await DB.query<{ game_id: string }>("select game_id from private.comment where body = any($1) and group_id is not null order by created_at", [posts.map((p) => p[1])]);
  expect(stored.rows.map((r) => r.game_id)).toEqual(["offbeat", "substrings"]);
});

// M20 20h (inbox #243; docs/milestones/M20-design-rules-and-clean-up.md, answers 19 and 34): a friend's result carries
// its game's colour, as the chosen Balanced look draws it, a 4px edge on its row's left; a comment carries none, so it no
// longer looks like a result.
test("a friend's result carries its game's colour on its row, and a comment none", async ({ browser }) => {
  const page = await viewer(browser, "fh");
  const friend = await friendOf("fi", "fh");
  await offbeatDone(friend);
  await fragmentsDone(friend);
  await offbeatDone(await idOf("fh"));
  await fragmentsDone(await idOf("fh"));
  const words = `that last one ${RUN}`;
  await comment(friend, words, 5);
  await page.goto("/");
  const slot = (name: string) =>
    page.evaluate((name) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${name})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    }, name);
  const edge = (item: ReturnType<typeof articles>) => item.locator("[class*='row']").first().evaluate((el) => getComputedStyle(el).boxShadow);
  const name = `fi${RUN}`;
  const result = (game: string) => articles(page).filter({ hasText: name }).filter({ hasText: game }).filter({ hasNotText: words });
  await expect(result(GAME.name)).toContainText("scored 35 points with 2 answers");
  await expect(result(SUBSTRINGS.name)).toContainText(/\d+ points/);
  expect(await edge(result(GAME.name))).toBe(`${await slot("--offbeat")} 4px 0px 0px 0px inset`);
  expect(await edge(result(SUBSTRINGS.name))).toBe(`${await slot("--fragments")} 4px 0px 0px 0px inset`);
  expect(await edge(articles(page).filter({ hasText: words }))).toBe("none");
});

// M20 20j (inbox #249; docs/milestones/M20-design-rules-and-clean-up.md, answers 28 and 51 to 53): a reaction names who
// used it, "You" first then A to Z, under the pointer, on focus (Escape hides it) and after a finger holds it 500ms.
test("a reaction names who used it on hover, on focus and after a long press", async ({ browser }) => {
  test.slow();
  const page = await viewer(browser, "fj");
  const zed = await friendOf("fk", "fj");
  const amy = await friendOf("fl", "fj");
  await DB.query("update private.profile set display_name = $2 where user_id = $1", [zed, "Zed"]);
  await DB.query("update private.profile set display_name = $2 where user_id = $1", [amy, "Amy"]);
  await offbeatDone(await idOf("fj"));
  const words = `who reacted ${RUN}`;
  await comment(zed, words, 5);
  await seed(async (q) => {
    await q(
      "insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji) select u, c.game_id, c.puzzle_date, c.id, '😂' from private.comment c, unnest($2::uuid[]) as u where c.body = $1",
      [words, [amy, zed, await idOf("fj")]],
    );
  });
  await page.goto("/");
  const item = articles(page).filter({ hasText: words });
  const used = item.getByRole("group", { name: "Reactions" }).locator("[aria-describedby]");
  const box = item.getByRole("tooltip");
  await expect(used).toHaveText(/😂 3/);
  await expect(box).toBeHidden();
  await used.hover();
  await expect(box).toHaveText("You, Amy, Zed");
  // As wide as the row's second line, so the names don't wrap at the chip's width.
  expect((await box.boundingBox())!.width).toBeGreaterThan((await used.boundingBox())!.width);
  await page.mouse.move(0, 0);
  await expect(box).toBeHidden();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await used.focus();
  await expect(used).toBeFocused();
  await expect(box).toBeVisible();
  await expect(used).toHaveAccessibleDescription("You, Amy, Zed");
  await page.keyboard.press("Escape");
  await expect(box).toBeHidden();

  // A phone: a tap, which focuses the chip, shows nothing; a finger held 500ms shows the names.
  const phone = await (await browser.newContext({ storageState: await page.context().storageState(), hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })).newPage();
  await phone.goto("/");
  const held = articles(phone).filter({ hasText: words }).getByRole("group", { name: "Reactions" }).locator("[aria-describedby]");
  const names = articles(phone).filter({ hasText: words }).getByRole("tooltip");
  await held.scrollIntoViewIfNeeded();
  await held.tap();
  await expect(held).toBeFocused();
  await phone.waitForTimeout(600);
  await expect(names).toBeHidden();
  await held.dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true });
  await expect(names).toHaveText("You, Amy, Zed");
});

// M20 20k-1 (answer 56): a comment has no box, in the feed and in the result screen's thread, so the card's edge is the
// one strong line; a result keeps its box and edge (20h).
test("a comment has no box, in the feed and in the result screen's thread", async ({ browser }) => {
  const page = await viewer(browser, "fm");
  const friend = await friendOf("fn", "fm");
  await offbeatDone(await idOf("fm"));
  const words = `no box ${RUN}`;
  await comment(friend, words, 5);
  const border = (item: ReturnType<typeof page.locator>) => item.evaluate((el) => getComputedStyle(el).borderTopColor);
  await page.goto("/");
  const inFeed = articles(page).filter({ hasText: words }).locator("[class*='row']").first();
  await expect(inFeed).toBeVisible();
  expect(await border(inFeed)).toBe("rgba(0, 0, 0, 0)");
  await page.goto(GAME.path);
  const inThread = page.getByRole("region", { name: `${GAME.name} comments` }).getByRole("listitem").filter({ hasText: words });
  await expect(inThread).toBeVisible();
  expect(await border(inThread)).toBe("rgba(0, 0, 0, 0)");
});
