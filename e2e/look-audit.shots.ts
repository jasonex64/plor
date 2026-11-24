// The look audit's pictures (docs/milestones/M20-design-rules-and-clean-up.md, "The look audit", 20l): a fixture scene on the
// local stack, then a full-page PNG of every screen a player can reach, at a phone's and a desktop's size, in each of the
// five themes, named <screen>--<width>--<theme>.png in the folder LOOK_AUDIT_OUT names. Run with
// `npm run look-audit` (playwright.look-audit.config.ts), which builds and starts the app on this slot's port as the e2e
// suite does. Not part of CI: its file name isn't `*.e2e.ts`.
//
// The scene: the viewer has played both games (a real run of each); one friend finished both, one is partway, one hasn't
// played; a friend request waits; a group has comments and reactions; last week's points fill the boards. A second
// player, who hasn't played, is put back to the start for each size and theme and plays the first steps of each game
// (the card states, the mid-round screens, How to play); an admin takes the kit's sample page. A screen that doesn't load
// is listed and fails the run at the end, after the rest are taken.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { Pool } from "pg";
import { GAME, OVERALL, SUBSTRINGS } from "../src/platform/game";
import { THEME_KEY } from "../src/app/theme";
import { RUN, signInAndPick } from "./players";
import { answer, asked, caughtToCards, next, safe } from "./game";
import { fixtureId } from "../src/test/answer-fixture";
import { todayPuzzle, removePuzzle, type TodayPuzzle } from "./puzzle";
import { localStack } from "../scripts/slot.ts";

const OUT = process.env.LOOK_AUDIT_OUT ?? "";
if (!OUT) throw new Error("Set LOOK_AUDIT_OUT to the folder the PNG files go in (npm run look-audit).");

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
// Rows for players who never signed in are written with the rules off, which needs the local superuser.
const ADMIN = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 1 });

// The ticket's two sizes (CLAUDE.md, Testing: phone 390 × 844, desktop 1280 × 720) and the app's five themes (src/app/settings.tsx).
const SIZES = [
  { width: 390, height: 844 },
  { width: 1280, height: 720 },
] as const;
const THEMES = ["paper", "night", "sky", "moonlit", "ink"] as const;

// The day's rounds and words are this file's own, as play2.e2e.ts's are: the real list isn't in git.
const ROUNDS = ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"];
const WORDS = ["aqkb", "aqkqmb", "aqmb", "aqmjb"];
// Points on each day, Monday first (e2e/leaderboard-graph.e2e.ts's), so the boards have a week behind them.
const LAST: Record<string, number[]> = {
  Ana: [5, 6, 3, 4, 6, 7, 5],
  Ben: [6, 5, 2, 3, 4, 3, 2],
  Cleo: [2, 3, 4, 0, 5, 4, 3],
  you: [4, 3, 6, 5, 4, 6, 7],
};
const THIS: Record<string, number[]> = {
  Ana: [6, 4, 7, 5, 3, 6],
  Ben: [5, 2, 3, 4, 6, 5],
  Cleo: [0, 4, 2, 6, 5, 4],
  you: [3, 6, 5, 6, 7, 5],
};

let puzzle: TodayPuzzle;
let today = "";
let addedDay = false;
let lastMonday = "";
let thisOver = 0;

// The Monday of a date's week, and a day of that week (as e2e/leaderboard-graph.e2e.ts does).
const weekStart = (date: string) => day(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
const day = (from: string, i: number) => {
  const d = new Date(`${from}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
};

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
  today = (await DB.query<{ d: string }>("select private.today()::text as d")).rows[0].d;
  lastMonday = day(weekStart(today), -7);
  thisOver = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${weekStart(today)}T00:00:00Z`)) / 86_400_000;
  const { rowCount } = await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('substrings', $1::date, $2) on conflict do nothing", [
    today,
    { format: 1, game_id: "substrings", date: today, rounds: ROUNDS, bonus_letter: "j" },
  ]);
  addedDay = rowCount === 1;
  await DB.query("insert into private.dictionary_word (word_key, spelling, plain, everyday) select w, w, w, true from unnest($1::text[]) as w on conflict do nothing", [WORDS]);
});

test.afterAll(async () => {
  // Deleting the players deletes their runs, ledger rows, comments, reactions and memberships (and the group, with its last member).
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  if (addedDay) await DB.query("delete from private.puzzle where game_id = 'substrings' and puzzle_date = $1::date", [today]);
  await DB.query("delete from private.dictionary_word where word_key = any($1)", [WORDS]);
  await removePuzzle(DB, puzzle);
  await DB.end();
  await ADMIN.end();
});

// ---- The scene ------------------------------------------------------------------------------------------------------

type Query = (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

// Writes with the rules off: runs, ledger rows, comments and reactions as the app would have written them by a time.
async function seed(write: (q: Query) => Promise<void>) {
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

const idOf = async (name: string) => (await DB.query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${name}@example.test`])).rows[0].id;

// A week's points, a run and a ledger row a day, from Monday `from`.
async function points(q: Query, userId: string, days: number[], from: string) {
  for (const [i, p] of days.entries()) {
    const date = day(from, i);
    await q("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'offbeat', $2::date, ($2::date + time '12:00') at time zone 'America/Los_Angeles')", [userId, date]);
    await q("insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, 'offbeat', $2::date, $3, 0)", [userId, date, p]);
  }
}

// A player who never signs in, with a display name and a profile a fortnight old; a friend of the viewer's when viewerId is given.
async function player(name: string, display: string, viewerId: string | null): Promise<string> {
  const id = randomUUID();
  await seed(async (q) => {
    await q("insert into auth.users (id, email) values ($1, $2)", [id, `${RUN}-${name}@example.test`]);
    await q("insert into private.profile (user_id, username, display_name, created_at) values ($1, $2, $3, now() - interval '14 days')", [id, `${name}${RUN}`, display]);
    if (viewerId) await q("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [id, viewerId]);
  });
  return id;
}

// Offbeat caught on question 1, and Fragments with a word in its last round, written as e2e/feed.e2e.ts writes them.
const offbeatCaught = (q: Query, userId: string) =>
  q("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'offbeat', private.today(), now() - interval '1 hour')", [userId]).then(() =>
    q(
      `insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched, created_at)
       select $1, 'offbeat', private.today(), 0, content #>> '{questions,0,host_answers,0}', true, now() - interval '30 minutes'
       from private.puzzle where game_id = 'offbeat' and puzzle_date = private.today()`,
      [userId],
    ),
  );
async function fragmentsDone(q: Query, userId: string) {
  await q("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'substrings', private.today(), now() - interval '1 hour')", [userId]);
  await q("insert into private.question_open (user_id, game_id, puzzle_date, question_idx, opened_at) values ($1, 'substrings', private.today(), 6, now() - interval '50 minutes')", [userId]);
  await q("insert into private.round_word (user_id, game_id, puzzle_date, round_idx, word_key, word, created_at) values ($1, 'substrings', private.today(), 6, 'qyzx', 'qyzx', now() - interval '45 minutes')", [userId]);
}

// A comment `ago` minutes old, in the friends' thread or a group's, and the emoji reactions on it.
async function comment(q: Query, userId: string, game: string, body: string, ago: number, groupId: string | null, reactions: [string, string][]) {
  const { rows } = await q(
    "insert into private.comment (user_id, game_id, puzzle_date, body, created_at, group_id) values ($1, $2, private.today(), $3, now() - make_interval(mins => $4::int), $5) returning id",
    [userId, game, body, ago, groupId],
  );
  for (const [reactor, emoji] of reactions) {
    await q("insert into private.reaction (user_id, game_id, puzzle_date, comment_id, emoji) values ($1, $2, private.today(), $3, $4)", [reactor, game, rows[0].id, emoji]);
  }
}

// The viewer's real runs, played on the screens: Offbeat safe twice and caught on the third question, Fragments two words and
// five rounds run out (their clocks moved on in the database, as e2e/play2.e2e.ts does).
async function playBoth(page: Page, viewerId: string) {
  await page.goto("/play");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await asked(page, "Name an animal");
  await safe(page, puzzle.safeAnswer);
  await next(page, "Name a fruit");
  await safe(page, "banana");
  await next(page, "Name a color");
  await caughtToCards(page, "red");

  await page.goto(SUBSTRINGS.path);
  const game = page.getByRole("region", { name: SUBSTRINGS.name, exact: true });
  const box = page.getByLabel("Your word");
  const sentence = (text: string) => game.locator("p:not([role='status'])", { hasText: text });
  await game.getByRole("button", { name: "Start", exact: true }).click();
  await box.fill("aqkqmb");
  await box.press("Enter");
  await expect(sentence("You played aqkqmb: 40 points.")).toBeVisible();
  await game.getByRole("button", { name: "Next", exact: true }).click();
  await box.fill("aqmjb");
  await box.press("Enter");
  await expect(sentence("You played aqmjb: 30 points, and 120 for the bonus letter.")).toBeVisible();
  await game.getByRole("button", { name: "Next", exact: true }).click();
  for (let round = 2; round < ROUNDS.length; round++) {
    // The round is open in the database once its letters show.
    await expect(page.getByText(ROUNDS[round], { exact: true })).toBeVisible();
    await DB.query("update private.run set started_at = started_at - interval '21 seconds' where user_id = $1 and game_id = 'substrings'", [viewerId]);
    await DB.query("update private.question_open set opened_at = opened_at - interval '21 seconds' where user_id = $1 and game_id = 'substrings'", [viewerId]);
    await box.fill("aqmb");
    await box.press("Enter");
    await expect(sentence("Time's up.")).toBeVisible();
    const last = round === ROUNDS.length - 1;
    await game.getByRole("button", { name: last ? "See results" : "Next", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Your score" })).toBeVisible();
}

// ---- The pictures ---------------------------------------------------------------------------------------------------

const failures: string[] = [];
const taken: string[] = [];

// theme names the file's theme. picked: the theme is the player's pick, held in their account, and the page must carry it. A
// signed-out page clears any pick (src/app/home.tsx, accountTheme), so it follows the device: Paper in a light one, Night in a dark one.
type Look = { width: number; height: number; theme: string; picked: boolean };

// One picture: the screen is opened by `open`, which waits for what makes it loaded; then the theme is on the page, no
// section is still a skeleton, the fonts are in, and the whole page is taken.
async function shoot(page: Page, look: Look, name: string, open: () => Promise<void>) {
  const file = `${name}--${look.width}--${look.theme}.png`;
  try {
    await open();
    if (look.picked) await expect(page.locator("html")).toHaveAttribute("data-theme", look.theme);
    await expect(page.locator("[data-loading]")).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(OUT, file), fullPage: true, animations: "disabled" });
    taken.push(file);
    console.log(`taken ${file}`);
  } catch (error) {
    const why = (error as Error).message.split("\n").slice(0, 3).join(" ");
    failures.push(`${file}: ${why}`);
    console.log(`FAILED ${file}: ${why}`);
  }
}

// A page that answers `status` (200 unless said), then waits for the screen's own mark.
const visit = (page: Page, path: string, ready: () => Promise<void>, status = 200) => async () => {
  const response = await page.goto(path);
  expect(response?.status()).toBe(status);
  await ready();
};
const seen = (locator: Locator) => () => expect(locator.first()).toBeVisible();

// A browser at the size and theme: a picked theme as this browser's copy, which the page's own script reads (src/app/theme.ts),
// else the device's scheme; and a signed-in player's session when a saved state is given. Reduced motion, so the count-ups
// show their numbers.
async function newPage(browser: Browser, contexts: BrowserContext[], look: Look, storageState?: Awaited<ReturnType<BrowserContext["storageState"]>>) {
  const colorScheme = !look.picked && look.theme === "night" ? "dark" : "light";
  const context = await browser.newContext({ viewport: { width: look.width, height: look.height }, colorScheme, reducedMotion: "reduce", storageState });
  if (look.picked) await context.addInitScript(([key, theme]) => window.localStorage.setItem(key, theme), [THEME_KEY, look.theme]);
  contexts.push(context);
  return context.newPage();
}

// A board's views, one picture each: the periods and the List / Graph switch, in the order a player meets them.
async function boardShots(page: Page, look: Look, title: string, prefix: string, views: [string, "This week" | "Last week", boolean][]) {
  const board = page.getByRole("region", { name: title, exact: true });
  for (const [name, period, graph] of views) {
    await shoot(page, look, `${prefix}-${name}`, async () => {
      await board.getByRole("radiogroup", { name: "Period" }).getByRole("radio", { name: period, exact: true }).check();
      await board.getByRole("radiogroup", { name: "View" }).getByText(graph ? "Graph" : "List", { exact: true }).click();
      await expect(board.getByRole("alert")).toHaveCount(0);
    });
  }
}

test("the look audit: every screen, at both sizes, in each theme", async ({ browser }) => {
  mkdirSync(OUT, { recursive: true });
  const contexts: BrowserContext[] = [];
  const first = await newPage(browser, contexts, { ...SIZES[1], theme: "paper", picked: false });

  // The viewer, the friends, the request and the real runs.
  await first.goto("/");
  await signInAndPick(first, "lv");
  const viewer = await idOf("lv");
  await DB.query("update private.profile set created_at = now() - interval '14 days' where user_id = $1", [viewer]);
  const [ana, ben, dee] = [await player("ana", "Ana", viewer), await player("ben", "Ben", viewer), await player("dee", "Dee", null)];
  // Cleo hasn't played today: a friend with last week's points and no run.
  const cleo = await player("cleo", "Cleo", viewer);
  await seed(async (q) => {
    for (const [id, name] of [[ana, "Ana"], [ben, "Ben"], [cleo, "Cleo"]]) {
      await points(q, id, LAST[name], lastMonday);
      await points(q, id, THIS[name].slice(0, thisOver), weekStart(today));
    }
    await points(q, viewer, LAST.you, lastMonday);
    await points(q, viewer, THIS.you.slice(0, thisOver), weekStart(today));
    await offbeatCaught(q, ana);
    await fragmentsDone(q, ana);
    // Ben is partway: Offbeat begun five minutes ago, safe on question 1 and waiting on its reveal (which has no deadline).
    await q("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'offbeat', private.today(), now() - interval '5 minutes')", [ben]);
    await q("insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched, created_at) values ($1, 'offbeat', private.today(), 0, $2, false, now() - interval '4 minutes')", [ben, fixtureId(0, "dog")]);
    await q("insert into private.friend_request (sender, receiver) values ($1, $2)", [dee, viewer]);
  });
  await playBoth(first, viewer);

  // The group: made on the screen by the viewer, joined by Ana and Ben, with a thread.
  await first.goto("/groups");
  await first.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Book Club");
  await first.getByRole("region", { name: "Groups" }).getByRole("button", { name: "Create group" }).click();
  await expect(first).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  const groupId = first.url().split("/").pop()!;
  const inviteCode = (await DB.query<{ invite_code: string }>("select invite_code from private.player_group where id = $1", [groupId])).rows[0].invite_code;
  await seed(async (q) => {
    for (const member of [ana, ben]) await q("insert into private.group_member (group_id, user_id) values ($1, $2)", [groupId, member]);
    // The friends' thread, then the group's own.
    await comment(q, ana, "offbeat", "Caught on the first one. Bear, obviously.", 25, null, [[viewer, "😂"], [ben, "👍"]]);
    await comment(q, ana, "substrings", "qyzx saved my last round", 20, null, [[viewer, "❤️"]]);
    await comment(q, viewer, "offbeat", "Dog was safe for me, then a fruit, then red got me.", 12, null, [[ana, "😮"]]);
    await comment(q, ben, "offbeat", "Still on question 1, no spoilers please", 4, null, []);
    await comment(q, ana, "offbeat", "Book Club: who got furthest?", 15, groupId, [[viewer, "👍"], [ben, "😂"]]);
    await comment(q, viewer, "offbeat", "Three questions, then red.", 8, groupId, [[ana, "❤️"]]);
    await q("insert into private.reaction (user_id, game_id, puzzle_date, run_user_id, emoji) values ($1, 'offbeat', private.today(), $2, '😮')", [viewer, ana]);
  });
  const viewerState = await first.context().storageState();

  // The second player, who hasn't played, and the admin.
  const second = await newPage(browser, contexts, { ...SIZES[1], theme: "paper", picked: false });
  await second.goto("/");
  await signInAndPick(second, "lu");
  const fresh = await idOf("lu");
  const secondState = await second.context().storageState();
  const third = await newPage(browser, contexts, { ...SIZES[1], theme: "paper", picked: false });
  await third.goto("/");
  await signInAndPick(third, "la");
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-la@example.test`]);
  const adminState = await third.context().storageState();
  for (const context of contexts.splice(0)) await context.close();

  for (const size of SIZES) {
    // The admin's sample page, once a size, in the theme a new account has.
    const adminLook: Look = { ...size, theme: "default", picked: false };
    const admin = await newPage(browser, contexts, adminLook, adminState);
    await shoot(admin, adminLook, "admin-kit", visit(admin, "/admin/kit", seen(admin.getByRole("main"))));

    for (const theme of THEMES) {
      const look: Look = { ...size, theme, picked: true };
      await DB.query("update private.profile set theme = $1 where user_id = any($2::uuid[])", [theme, [viewer, fresh]]);

      // Signed out, which has only the device's two looks, Paper and Night: the front page, sign-in, each game as a guest, the
      // invite, About, Privacy and a missing page.
      const guestLook: Look = { ...size, theme, picked: false };
      const guest = await newPage(browser, contexts, guestLook);
      const startButton = (page: Page) => page.getByRole("button", { name: "Start", exact: true });
      if (theme === "paper" || theme === "night") {
        await shoot(guest, guestLook, "front", visit(guest, "/", seen(guest.getByRole("link", { name: "Sign in", exact: true }))));
        await shoot(guest, guestLook, "sign-in", visit(guest, "/?sign-in", seen(guest.getByLabel("Email"))));
        await shoot(guest, guestLook, "guest-offbeat", visit(guest, GAME.path, seen(startButton(guest))));
        await shoot(guest, guestLook, "guest-fragments", visit(guest, SUBSTRINGS.path, seen(startButton(guest))));
        await shoot(guest, guestLook, "group-invite-signed-out", visit(guest, `/g/${inviteCode}`, seen(guest.getByRole("heading", { name: "Sign in", exact: true }))));
        await shoot(guest, guestLook, "about", visit(guest, "/about", seen(guest.getByRole("heading", { name: "About Plor" }))));
        await shoot(guest, guestLook, "privacy", visit(guest, "/privacy", seen(guest.getByRole("heading", { level: 1 }))));
        await shoot(guest, guestLook, "not-found", visit(guest, "/nope", seen(guest.getByRole("heading", { name: "Page not found" })), 404));
      }

      // The viewer: Today and the tabs, a profile, the boards, a group, Settings and both result screens.
      const page = await newPage(browser, contexts, look, viewerState);
      await shoot(page, look, "today", visit(page, "/", seen(page.getByRole("region", { name: GAME.name, exact: true }))));
      await shoot(page, look, "friends", visit(page, "/friends", seen(page.getByRole("region", { name: "Friends leaderboard", exact: true }))));
      await boardShots(page, look, "Friends leaderboard", "friends-board", [
        ["offbeat-this-week-list", "This week", false],
        ["offbeat-this-week-graph", "This week", true],
        ["offbeat-last-week-list", "Last week", false],
        ["offbeat-last-week-graph", "Last week", true],
      ]);
      const friendsBoard = page.getByRole("region", { name: "Friends leaderboard", exact: true });
      // The other two boards, Fragments' today and the overall one by last week.
      await shoot(page, look, "friends-board-fragments-today", async () => {
        await friendsBoard.getByRole("radiogroup", { name: "Game" }).getByText(SUBSTRINGS.name, { exact: true }).click();
        await friendsBoard.getByRole("radiogroup", { name: "Period" }).getByRole("radio", { name: "Today", exact: true }).check();
        await expect(friendsBoard.getByRole("alert")).toHaveCount(0);
      });
      await shoot(page, look, "friends-board-overall-last-week", async () => {
        await friendsBoard.getByRole("radiogroup", { name: "Game" }).getByText(OVERALL.name, { exact: true }).click();
        await friendsBoard.getByRole("radiogroup", { name: "Period" }).getByRole("radio", { name: "Last week", exact: true }).check();
        await expect(friendsBoard.getByRole("alert")).toHaveCount(0);
      });
      await shoot(page, look, "groups", visit(page, "/groups", seen(page.getByRole("region", { name: "Groups", exact: true }))));
      await shoot(page, look, "group", visit(page, `/groups/${groupId}`, seen(page.getByRole("heading", { name: "Book Club" }))));
      await boardShots(page, look, "Group leaderboard", "group-board", [
        ["last-week-list", "Last week", false],
        ["last-week-graph", "Last week", true],
      ]);
      await shoot(page, look, "me", visit(page, "/me", seen(page.getByRole("heading", { name: `lv${RUN}` }))));
      await shoot(page, look, "streak", visit(page, "/streak", seen(page.getByRole("main"))));
      await shoot(page, look, "profile", visit(page, `/u/ana${RUN}`, seen(page.getByRole("region", { name: "You and this player" }))));
      await shoot(page, look, "settings", async () => {
        await page.goto("/");
        await page.getByRole("button", { name: "Settings" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
      });
      await shoot(page, look, "offbeat-result", visit(page, GAME.path, seen(page.locator("#result"))));
      await shoot(page, look, "fragments-result", visit(page, SUBSTRINGS.path, seen(page.getByRole("heading", { name: "Your score" }))));

      // The player who hasn't played, put back to the start: the cards, How to play, and each game's first steps.
      await DB.query("delete from private.run where user_id = $1", [fresh]);
      const rookie = await newPage(browser, contexts, look, secondState);
      await shoot(rookie, look, "today-not-played", visit(rookie, "/", seen(rookie.getByRole("region", { name: GAME.name, exact: true }))));
      for (const [name, game] of [["offbeat", GAME.name], ["fragments", SUBSTRINGS.name]] as const) {
        const howTo = async (steps: number) => {
          await rookie.goto("/");
          await rookie.getByRole("region", { name: game, exact: true }).getByRole("button", { name: "How to play" }).click();
          const dialog = rookie.getByRole("dialog");
          await expect(dialog).toBeVisible();
          for (let i = 1; i < steps; i++) await dialog.getByRole("button", { name: "Next", exact: true }).click();
        };
        await shoot(rookie, look, `how-to-play-${name}-1`, () => howTo(1));
        await shoot(rookie, look, `how-to-play-${name}-4`, () => howTo(4));
      }
      await shoot(rookie, look, "group-invite", visit(rookie, `/g/${inviteCode}`, seen(rookie.getByRole("button", { name: "Join group" }))));
      await shoot(rookie, look, "offbeat-start", visit(rookie, GAME.path, seen(rookie.getByRole("button", { name: "Start", exact: true }))));
      await shoot(rookie, look, "offbeat-question", async () => {
        await rookie.getByRole("button", { name: "Start", exact: true }).click();
        await asked(rookie, "Name an animal");
      });
      await shoot(rookie, look, "offbeat-reveal", async () => {
        await answer(rookie, puzzle.safeAnswer);
        await expect(rookie.getByRole("heading", { name: "Safe!", exact: true })).toBeVisible();
      });
      await shoot(rookie, look, "today-offbeat-started", visit(rookie, "/", seen(rookie.getByRole("region", { name: GAME.name, exact: true }))));
      await shoot(rookie, look, "fragments-start", visit(rookie, SUBSTRINGS.path, seen(rookie.getByRole("button", { name: "Start", exact: true }))));
      await shoot(rookie, look, "fragments-round", async () => {
        await rookie.getByRole("button", { name: "Start", exact: true }).click();
        await expect(rookie.getByLabel("Your word")).toBeVisible();
      });
      await shoot(rookie, look, "fragments-word", async () => {
        await rookie.getByLabel("Your word").fill("aqkqmb");
        await rookie.getByLabel("Your word").press("Enter");
        await expect(rookie.getByRole("region", { name: SUBSTRINGS.name, exact: true }).locator("p:not([role='status'])", { hasText: "You played aqkqmb: 40 points." })).toBeVisible();
      });
      await shoot(rookie, look, "today-both-started", visit(rookie, "/", seen(rookie.getByRole("region", { name: SUBSTRINGS.name, exact: true }))));

      for (const context of contexts.splice(0)) await context.close();
    }
  }

  console.log(`${taken.length} pictures in ${OUT}, ${failures.length} failed`);
  // Nothing is asserted about how a screen looks: a screen that didn't load fails the run, after the rest were taken.
  expect(failures).toEqual([]);
});
