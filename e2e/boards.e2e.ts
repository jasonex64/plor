// The boards for two games (docs/milestones/M16-16f-the-shared-pieces.md, 16f-6; the human's answers 4, 20, 24, 56 and 57):
// a friend's Fragments row moves live to the round they're on and then to their score, on its own board; the Friends tab's
// board and Today's have a game switch where the two games' cards sit side by side and follow the front card in the
// carousel; Today's leaderboard card switches between Offbeat, Fragments and Overall. The viewer's friend is written in
// the database, with the triggers on, so the live board hears each change as it would from a browser (the phone's own game
// is play2.e2e.ts's). Fragments' day and words are this file's own, as the real list isn't in git.
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { Pool } from "pg";
import { SUBSTRING_ROUNDS } from "../src/config/tunables";
import { scoreRun } from "../src/game/substring-scoring";
import { GAME, SUBSTRINGS } from "../src/platform/game";
import { fixtureId } from "../src/test/answer-fixture";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { localStack } from "../scripts/slot.ts";
import { RUN, openBoard, signInAndPick, playToEnd } from "./players";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
// A player who never signs in, and a finished run of Fragments with no word, are written with the round rules off, which needs
// the local superuser.
const ADMIN = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 1 });
const PHONE = { width: 390, height: 844 };
// The app's tablet width (src/app/min-width.ts): Today shows the board from here, its cards still a carousel.
const TABLET = { width: 768, height: 1024 };
// Wide enough that Today's cards sit side by side (e2e/today-games.e2e.ts), beside the right column: their row needs
// 560px (M20 answer 78) and is far past it here.
const WIDE = { width: 1920, height: 900 };
const ROUNDS = ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"];
// A word for each round, as the keys score: the run's score is the scoring function's, from them.
const WORDS = ["aqkb", "aqmb", "aqnpb", "aqrsb", "aqtvb", "aqwxb", "aqyzb"];
let puzzle: TodayPuzzle;
let today = "";

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
  today = (await DB.query<{ d: string }>("select private.today()::text as d")).rows[0].d;
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removeDay();
  await removePuzzle(DB, puzzle);
  await DB.end();
  await ADMIN.end();
});

const addDay = () =>
  DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('substrings', $1::date, $2) on conflict do nothing", [
    today,
    { format: 1, game_id: "substrings", date: today, rounds: ROUNDS, bonus_letter: "j" },
  ]);
const removeDay = () => DB.query("delete from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [today]);

// Each test leaves nothing the next depends on: its pages are closed, so none is still fetching, and its players' runs of
// Fragments go (their rows cascade), so the next test can take the day away.
const contexts: BrowserContext[] = [];
test.afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.close()));
  await DB.query("delete from private.run where game_id = 'substrings' and user_id in (select id from auth.users where email like $1)", [`${RUN}-b%@example.test`]);
});

// A signed-in viewer, whose account is from before yesterday: yesterday's friends board lists a player only from the day they
// signed up (M19 19c).
async function viewer(browser: Browser, name: string, viewport?: { width: number; height: number }) {
  const context = await browser.newContext({ viewport });
  contexts.push(context);
  const page = await context.newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  await DB.query("update private.profile set created_at = now() - interval '14 days' where username = $1", [`${name}${RUN}`]);
  return page;
}

const idOf = async (name: string) => (await DB.query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${name}@example.test`])).rows[0].id;

// The viewer's friend, who never signs in.
async function friendOf(viewerName: string, name: string): Promise<{ id: string; username: string }> {
  const email = `${RUN}-${name}@example.test`;
  const client = await ADMIN.connect();
  let id: string;
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    id = (await client.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [email])).rows[0].id;
    await client.query("commit");
  } finally {
    client.release();
  }
  const username = `${name}${RUN}`;
  await DB.query("insert into private.profile (user_id, username, created_at) values ($1, $2, now() - interval '14 days')", [id, username]);
  const viewerId = await idOf(viewerName);
  await DB.query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [id, viewerId]);
  return { id, username };
}

// A friend's Fragments run, each step with the triggers on, so the viewer's board hears it.
const beginRun = (id: string) => DB.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, 'substrings', $2::date)", [id, today]);
const giveWord = (id: string, round: number) =>
  DB.query("insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word) values ($1, 'substrings', $2::date, $3, $4, $4)", [id, today, round, WORDS[round]]);
const openRound = (id: string, round: number) =>
  DB.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx) values ($1, 'substrings', $2::date, $3)", [id, today, round]);

// The viewer's own run of Fragments, over: round 7 opened an hour ago, with no word, as play2.e2e.ts writes a friend's.
async function finishFragments(userId: string) {
  const client = await ADMIN.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    await client.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'substrings', $2::date, now() - interval '1 hour')", [userId, today]);
    await client.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx, opened_at) values ($1, 'substrings', $2::date, 6, now() - interval '1 hour')", [userId, today]);
    await client.query("commit");
  } finally {
    client.release();
  }
}

// Plays Offbeat's run on a clock from Today's card to its result, and leaves the player on Today.
async function finishOffbeat(page: Page) {
  await playToEnd(page);
  await page.goto("/");
}

const board = (page: Page) => page.getByRole("region", { name: "Friends today", exact: true });
const gameSwitch = (page: Page) => board(page).getByRole("radiogroup", { name: "Game", exact: true });
// A friend's row on the board's plain list, not the lists inside "where everyone ended".
const row = (page: Page, username: string) => board(page).locator(":scope > ul > li").filter({ hasText: username });
const started = "started (you'll see how it's going once you finish)";

test("a friend's Fragments row moves live to the round they're on, then to their score, on its own board", async ({ browser }) => {
  test.slow();
  await addDay();
  const page = await viewer(browser, "bva");
  const friend = await friendOf("bva", "bfa");
  await finishFragments(await idOf("bva"));
  await openBoard(page);

  // One board a game, opened on Offbeat (answer 56): the friend has played neither.
  await expect(gameSwitch(page)).toBeVisible();
  await expect(gameSwitch(page).getByRole("radio", { name: GAME.name, exact: true })).toBeChecked();
  await expect(gameSwitch(page).getByRole("radio", { name: SUBSTRINGS.name, exact: true })).not.toBeChecked();
  await expect(row(page, friend.username)).toContainText("Not yet");
  await gameSwitch(page).getByText(SUBSTRINGS.name, { exact: true }).click();
  await expect(gameSwitch(page).getByRole("radio", { name: SUBSTRINGS.name, exact: true })).toBeChecked();
  await expect(row(page, friend.username)).toContainText("Not yet");

  // The viewer has finished Fragments, so the friend's progress shows as it happens: the round, counted against the day's
  // rounds, then the score once they finish too.
  await beginRun(friend.id);
  await expect(row(page, friend.username)).toContainText(`${friend.username}: on round 1 of ${SUBSTRING_ROUNDS.length}`);
  await giveWord(friend.id, 0);
  await expect(row(page, friend.username)).toContainText(`on round 2 of ${SUBSTRING_ROUNDS.length}`);
  for (let round = 1; round < ROUNDS.length - 1; round++) {
    await openRound(friend.id, round);
    await giveWord(friend.id, round);
    await expect(row(page, friend.username)).toContainText(`on round ${round + 2} of ${SUBSTRING_ROUNDS.length}`);
  }
  await openRound(friend.id, ROUNDS.length - 1);
  await giveWord(friend.id, ROUNDS.length - 1);
  const score = scoreRun(WORDS, "j").total;
  await expect(row(page, friend.username)).toContainText(`${friend.username}: ${score} points`);
  // Their words never reach the page.
  await expect(board(page)).not.toContainText(WORDS[0]);

  // Offbeat's board is its own: the friend has no Offbeat run.
  await gameSwitch(page).getByText(GAME.name, { exact: true }).click();
  await expect(row(page, friend.username)).toContainText("Not yet");
});

test("a day with an approved day in one game only has no switch on the board", async ({ browser }) => {
  await removeDay();
  const page = await viewer(browser, "bvb", PHONE);
  await friendOf("bvb", "bfb");
  await openBoard(page);
  await expect(board(page)).toBeVisible();
  await expect(row(page, `bfb${RUN}`)).toContainText("Not yet");
  await expect(gameSwitch(page)).toHaveCount(0);
});

test("with the cards side by side, Today's board has the switch, opened on the game left to play; Offbeat when both are played", async ({ browser }) => {
  test.slow();
  await addDay();
  const page = await viewer(browser, "bvc", WIDE);
  const friend = await friendOf("bvc", "bfc");
  await beginRun(friend.id);
  await finishOffbeat(page);

  // Offbeat over and Fragments not: the board opens on Fragments, where the friend has started and the viewer hasn't finished.
  await expect(gameSwitch(page)).toBeVisible();
  await expect(gameSwitch(page).getByRole("radio", { name: SUBSTRINGS.name, exact: true })).toBeChecked();
  await expect(row(page, friend.username)).toContainText(started);
  await gameSwitch(page).getByText(GAME.name, { exact: true }).click();
  await expect(row(page, friend.username)).toContainText("Not yet");

  // Both over: it opens on Offbeat.
  await finishFragments(await idOf("bvc"));
  await page.goto("/");
  await expect(gameSwitch(page).getByRole("radio", { name: GAME.name, exact: true })).toBeChecked();
});

test("with the cards in a carousel, Today's board has no switch and follows the card in front", async ({ browser }) => {
  test.slow();
  await addDay();
  const page = await viewer(browser, "bvd", TABLET);
  const friend = await friendOf("bvd", "bfd");
  await beginRun(friend.id);
  await finishOffbeat(page);

  // At the tablet's width the board is on Today and the cards are still a carousel (today-games.e2e.ts), with Fragments, the
  // game left to play, in front: the board is Fragments'.
  await expect(page.getByText("2 of 2", { exact: true })).toBeVisible();
  await expect(board(page)).toBeVisible();
  await expect(gameSwitch(page)).toHaveCount(0);
  await expect(row(page, friend.username)).toContainText(started);
  // Offbeat in front: Offbeat's board, where the friend hasn't played.
  await page.getByRole("button", { name: "Previous game", exact: true }).click();
  await expect(row(page, friend.username)).toContainText("Not yet");
  await page.getByRole("button", { name: "Next game", exact: true }).click();
  await expect(row(page, friend.username)).toContainText(started);
});

test("Today's leaderboard card switches between Offbeat, Fragments and Overall", { tag: "@visual" }, async ({ browser }) => {
  await addDay();
  const page = await viewer(browser, "bve");
  const friend = await friendOf("bve", "bfe");
  const card = page.getByRole("region", { name: "Leaderboard", exact: true });
  const choices = card.getByRole("radiogroup", { name: "Game", exact: true });
  const names = [friend.username, `bve${RUN}`].sort();
  const list = (day: "Yesterday" | "This week") => card.getByRole("region", { name: day, exact: true }).getByRole("listitem");

  // Offbeat on load, as the other leaderboards, in points.
  await expect(choices.getByRole("radio", { name: GAME.name, exact: true })).toBeChecked();
  await expect(choices.getByRole("radio")).toHaveCount(3);
  // Today on load, closed until the viewer has finished that game, or each game with a par for Overall, Fragments alone
  // while Offbeat has none (docs/milestones/M22-todays-board.md, answers 3, 6 and 10; M23 23f-2, answer 60).
  await expect(card.getByRole("radio", { name: "Today", exact: true })).toBeChecked();
  for (const [game, line] of [
    [SUBSTRINGS.name, `Finish today's ${SUBSTRINGS.name} to see today's board.`],
    ["Overall", `Finish today's ${SUBSTRINGS.name} to see today's board.`],
    [GAME.name, `Finish today's ${GAME.name} to see today's board.`],
  ] as const) {
    await choices.getByText(game, { exact: true }).click();
    await expect(card.getByRole("region", { name: "Today", exact: true })).toHaveText(line);
  }
  // Yesterday is read once chosen, after the viewer's account was dated back and the friend made.
  await card.getByText("Yesterday", { exact: true }).click();
  await expect(list("Yesterday")).toHaveText(names.map((n) => `${n}${n === `bve${RUN}` ? " (you)" : ""}: 0 points`));

  // Fragments' are points too (issue #265), Overall's a plain number, and the route is told the game.
  for (const [game, id, shown] of [[SUBSTRINGS.name, "substrings", "0 points"], ["Overall", "overall", "0"]] as const) {
    const asked = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/leaderboard/yesterday" && new URL(r.url()).searchParams.get("game") === id);
    await choices.getByText(game, { exact: true }).click();
    await asked;
    await expect(list("Yesterday")).toHaveText(names.map((n) => `${n}${n === `bve${RUN}` ? " (you)" : ""}: ${shown}`));
  }
  // The week follows the game too.
  const week = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/leaderboard" && new URL(r.url()).searchParams.get("game") === "overall");
  await card.getByText("This week", { exact: true }).click();
  await week;
  await expect(list("This week")).toHaveCount(2);
});

// Today's board (docs/milestones/M22-todays-board.md): open once the viewer's own run is over, with their result screen's
// score, and a friend who hasn't played below it, on Today's card and on the Friends tab's board (answers 5 and 9).
test("today's board opens once the viewer has finished, on Today's card and the Friends tab", async ({ browser }) => {
  const page = await viewer(browser, "bvt", WIDE);
  const friend = await friendOf("bvt", "bft");
  await playToEnd(page);
  await expect(page.getByText("0 points", { exact: true })).toBeVisible();
  const rows = [`bvt${RUN} (you): 0 points`, `${friend.username}: not played yet`];
  await page.goto("/");
  const card = page.getByRole("region", { name: "Leaderboard", exact: true });
  await expect(card.getByRole("region", { name: "Today", exact: true }).getByRole("listitem")).toHaveText(rows);
  await openBoard(page);
  await expect(page.getByRole("region", { name: "Friends leaderboard" }).getByRole("region", { name: "Today", exact: true }).getByRole("listitem")).toHaveText(rows);
});

// Inbox #250 (human, 2026-11-17, M20 answers 5 and 9: "short words"): a long name is cut on one line, and each friend's status
// chip sits in its own column at the row's right edge, in the same place on every row.
test("a long name is cut with an ellipsis on one line and every status chip ends at the row's right edge", async ({ browser }) => {
  await removeDay();
  const page = await viewer(browser, "bvf", { width: 320, height: 640 });
  const longName = "W".repeat(24);
  const [long, short] = [await friendOf("bvf", "bff"), await friendOf("bvf", "bfg")];
  await DB.query("update private.profile set display_name = $2 where username = $1", [long.username, longName]);
  await openBoard(page);
  const rows = [row(page, longName), row(page, short.username)];
  await expect(rows[0]).toContainText(`${longName}: Not yet`);
  const chips = rows.map((r) => r.getByText("Not yet", { exact: true }));
  const [longRow, shortRow] = await Promise.all(rows.map((r) => r.boundingBox()));
  const [longChip, shortChip] = await Promise.all(chips.map((c) => c.boundingBox()));
  // One line: the long name's row is as tall as the short one's, and its name keeps the 24 letters, cut by an ellipsis.
  expect(longRow!.height).toBeCloseTo(shortRow!.height, 0);
  expect(await rows[0].getByText(longName, { exact: true }).evaluate((el) => getComputedStyle(el).textOverflow)).toBe("ellipsis");
  // The chip is inside its row, with the same right edge on both.
  expect(longChip!.x + longChip!.width).toBeLessThanOrEqual(longRow!.x + longRow!.width);
  expect(longChip!.x + longChip!.width).toBeCloseTo(shortChip!.x + shortChip!.width, 0);
});

// #257's review: a long status beside a long name on a 320px phone. The status wraps to a second line inside its
// chip rather than take the name's room (the human, 2026-11-17: "Wrap them to a second line"); the chip still ends at the
// row's right edge.
test("a long status wraps inside its chip and leaves the name its room", async ({ browser }) => {
  test.slow();
  await removeDay();
  const page = await viewer(browser, "bvw", { width: 320, height: 640 });
  const longName = "W".repeat(24);
  const [friend, waiting] = [await friendOf("bvw", "bfw"), await friendOf("bvw", "bfx")];
  await DB.query("update private.profile set display_name = $2 where username = $1", [friend.username, longName]);
  // The friend is on question 1 with two answers, 35 points, written with the rules off (the longest status Offbeat's board shows).
  const client = await ADMIN.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    await client.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'offbeat', private.today(), now())", [friend.id]);
    for (const [slug, tier, points] of [["dog", "common", 10], ["cat", "uncommon", 25]] as const)
      await client.query(
        "insert into private.clock_answer (user_id, game_id, puzzle_date, question_idx, entry_id, tier, added_ms, points, created_at) values ($1, 'offbeat', private.today(), 0, $2, $3, 3000, $4, now())",
        [friend.id, fixtureId(0, slug), tier, points],
      );
    await client.query("commit");
  } finally {
    client.release();
  }
  await openBoard(page);
  const [longRow, shortRow] = [row(page, longName), row(page, waiting.username)];
  await expect(longRow).toContainText(`${longName}: Question 1 of 3 · 35 points`);
  const longChip = longRow.getByText("Question 1 of 3 · 35 points", { exact: true });
  const shortChip = shortRow.getByText("Not yet", { exact: true });
  const [name, avatar, chip, notYet, box] = await Promise.all([
    longRow.getByText(longName, { exact: true }).boundingBox(),
    longRow.locator("[data-initial]").boundingBox(),
    longChip.boundingBox(),
    shortChip.boundingBox(),
    longRow.boundingBox(),
  ]);
  // The status takes more than one line: its chip is taller than the one-line "Not yet".
  expect(chip!.height).toBeGreaterThan(notYet!.height);
  // The name keeps room: wider than the avatar beside it, so its first letters show before the ellipsis.
  expect(name!.width).toBeGreaterThan(avatar!.width);
  // The chip is inside its row, with the same right edge as the one-line chip's.
  expect(chip!.x + chip!.width).toBeLessThanOrEqual(box!.x + box!.width);
  expect(chip!.x + chip!.width).toBeCloseTo(notYet!.x + notYet!.width, 0);
});

// M20 20i (inbox #248; docs/milestones/M20-design-rules-and-clean-up.md, answer 27): the Friends tab's and a group's
// leaderboard are one board with a Period switch, Today, This week and Last week, opened on Today on every load.
test("the Friends tab's and a group's leaderboard are one board with a Period switch, opened on Today", async ({ browser }) => {
  test.slow();
  const page = await viewer(browser, "bvp");
  await page.goto("/groups");
  await page.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Period Club");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  const group = new URL(page.url()).pathname;
  for (const [path, title] of [["/friends", "Friends leaderboard"], [group, "Group leaderboard"]] as const) {
    await page.goto(path);
    const card = page.getByRole("region", { name: title });
    const period = card.getByRole("radiogroup", { name: "Period", exact: true });
    await expect(period.getByRole("radio")).toHaveCount(3);
    await expect(period.getByRole("radio", { name: "Today", exact: true })).toBeChecked();
    const shown = () => card.getByRole("region").filter({ has: page.getByRole("heading", { level: 3 }) });
    await expect(card.getByRole("region", { name: "Today", exact: true })).toBeVisible();
    await expect(shown()).toHaveCount(1);
    for (const name of ["This week", "Last week", "Today"]) {
      await period.getByRole("radio", { name, exact: true }).check();
      await expect(card.getByRole("region", { name, exact: true })).toBeVisible();
      await expect(shown()).toHaveCount(1);
    }
    // Opened on Today again on the next load.
    await period.getByRole("radio", { name: "Last week", exact: true }).check();
    await page.reload();
    await expect(page.getByRole("region", { name: title }).getByRole("radiogroup", { name: "Period", exact: true }).getByRole("radio", { name: "Today", exact: true })).toBeChecked();
  }
});

// M20 20k-1 (docs/milestones/M20-design-rules-and-clean-up.md, answers 34 and 56): the Balanced look's one border level
// on every board. A row is a hairline in the theme's --line with its game's 4px edge inside its left; your own row the
// accent edge, in bold.
test("a board's rows are a hairline with their game's edge, and your own row the accent edge", async ({ browser }) => {
  test.slow();
  const page = await viewer(browser, "bvk");
  const friend = await friendOf("bvk", "bfk");
  await finishOffbeat(page);
  const slot = (name: string) =>
    page.evaluate((name) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${name})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    }, name);
  const looks = (row: ReturnType<typeof page.locator>) =>
    row.evaluate((el) => ({ border: getComputedStyle(el).borderTopColor, edge: getComputedStyle(el).boxShadow, weight: getComputedStyle(el).fontWeight }));
  await page.goto("/friends");
  const friendRow = row(page, friend.username);
  await expect(friendRow).toBeVisible();
  expect(await looks(friendRow)).toEqual({ border: await slot("--line"), edge: `${await slot("--offbeat")} 4px 0px 0px 0px inset`, weight: "400" });
  const leaderboard = page.getByRole("region", { name: "Friends leaderboard" });
  await leaderboard.getByRole("radio", { name: "This week", exact: true }).check();
  const mine = leaderboard.getByRole("region", { name: "This week" }).getByRole("listitem").filter({ hasText: "(you)" });
  await expect(mine).toBeVisible();
  expect(await looks(mine)).toEqual({ border: await slot("--line"), edge: `${await slot("--accent")} 4px 0px 0px 0px inset`, weight: "700" });
});

// M20 20n-6a (inbox #268; answers 90 and 94 to 96): on a board, 1st's badge wears a small crown, 2nd's and 3rd's have
// two ribbon tails, 4th's is plain; the drawings are for the eye only and make no row taller.
test("the top three stand out on a board: a crown on 1st, ribbon tails on 2nd and 3rd, 4th plain", async ({ browser }) => {
  const page = await viewer(browser, "bvm", WIDE);
  for (const name of ["bfm", "bfn", "bfo"]) await friendOf("bvm", name);
  await page.goto("/friends");
  const card = page.getByRole("region", { name: "Friends leaderboard", exact: true });
  await card.getByRole("radiogroup", { name: "Period", exact: true }).getByText("This week", { exact: true }).click();
  const places = card.getByRole("region", { name: "This week", exact: true }).locator("ol > li");
  await expect(places).toHaveCount(4);
  const drawn = await places.evaluateAll((rows) =>
    rows.map((li) => {
      const badge = li.querySelector("[data-place]")!;
      return {
        place: badge.getAttribute("data-place"),
        crown: badge.querySelector("[data-crown]") !== null,
        tails: badge.querySelector("[data-tails]") !== null,
        hidden: badge.getAttribute("aria-hidden") === "true",
        height: Math.round(li.getBoundingClientRect().height),
      };
    }),
  );
  const height = drawn[3].height;
  expect(drawn).toEqual([
    { place: "1", crown: true, tails: false, hidden: true, height },
    { place: "2", crown: false, tails: true, hidden: true, height },
    { place: "3", crown: false, tails: true, hidden: true, height },
    { place: "4", crown: false, tails: false, hidden: true, height },
  ]);
  // The crown is over the badge's top and the tails under its foot, each showing outside the badge's circle.
  const box = (selector: string) => places.locator(selector).first().boundingBox();
  const [first, crown, second, tails] = [await box("[data-place='1']"), await box("[data-crown] path"), await box("[data-place='2']"), await box("[data-tails] path")];
  expect(crown!.y).toBeLessThan(first!.y);
  expect(tails!.y + tails!.height).toBeGreaterThan(second!.y + second!.height);
});

// M20 20n-6b (the second look audit's finding 3; answers 77 and 91 to 93): once the player has finished a game that a
// friend has finished too, Today says the player's place in it under the cards, one line a game, and the line opens the
// Friends tab's board on that game. No friend finished, no strip.
test("Today says your place in each game you and a friend have finished, and the line opens that game's board on Friends", async ({ browser }) => {
  test.slow(); // a sign-in, two page loads and two trips to Friends
  await addDay();
  const page = await viewer(browser, "bvq", PHONE);
  const friend = await friendOf("bvq", "bfq");
  const strip = page.getByRole("region", { name: "Among friends today", exact: true });
  await finishFragments(await idOf("bvq"));
  await page.goto("/");
  await expect(page.getByRole("region", { name: SUBSTRINGS.name, exact: true }).getByRole("link", { name: "Result", exact: true })).toBeVisible();
  // Alone on the board: nothing to stand among.
  await page.waitForLoadState("networkidle");
  await expect(strip).toHaveCount(0);

  await finishFragments(friend.id);
  await page.reload();
  const line = strip.getByRole("link");
  await expect(line).toHaveCount(1);
  await expect(line).toHaveText(new RegExp(`^${SUBSTRINGS.name}: (1st|2nd) of 2$`));
  await expect(line).toHaveAttribute("href", "/friends?board=substrings");
  // Under the cards, above the feed.
  const [cards, place, feed] = await Promise.all([page.getByRole("group", { name: "Today's games", exact: true }).boundingBox(), strip.boundingBox(), page.getByRole("region", { name: "Feed", exact: true }).boundingBox()]);
  expect(place!.y).toBeGreaterThan(cards!.y + cards!.height - 1);
  expect(place!.y + place!.height).toBeLessThan(feed!.y + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await line.click();
  await expect(page).toHaveURL(/\/friends\?board=substrings$/);
  const card = page.getByRole("region", { name: "Friends leaderboard", exact: true });
  await expect(card.getByRole("radiogroup", { name: "Game", exact: true }).getByRole("radio", { name: SUBSTRINGS.name, exact: true })).toBeChecked();
  await expect(card.getByRole("radiogroup", { name: "Period", exact: true }).getByRole("radio", { name: "Today", exact: true })).toBeChecked();

  // Pressed again after the board was moved to another game, with Friends already visited: it opens on the line's game
  // again (20n-6b's review).
  await card.getByRole("radiogroup", { name: "Game", exact: true }).getByText(GAME.name, { exact: true }).click();
  await expect(card.getByRole("radiogroup", { name: "Game", exact: true }).getByRole("radio", { name: GAME.name, exact: true })).toBeChecked();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Today/ }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await strip.getByRole("link").click();
  await expect(page).toHaveURL(/\/friends\?board=substrings$/);
  await expect(page.getByRole("region", { name: "Friends leaderboard", exact: true }).filter({ visible: true }).getByRole("radiogroup", { name: "Game", exact: true }).getByRole("radio", { name: SUBSTRINGS.name, exact: true })).toBeChecked();
});
