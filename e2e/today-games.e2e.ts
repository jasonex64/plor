// Today's game cards (docs/milestones/M16-16f-the-shared-pieces.md, 16f-2): Fragments' card before, during and after a
// run, and the cards as a carousel on phones (the card left to play in front, arrows and keyboard, one card a day when
// only one game has a day) and side by side from 768px. Fragments' day and words are this file's own, as the real list
// isn't in git (as play2.e2e.ts); its runs are put in their states in the database, as each state's screens are other
// files' (play2.e2e.ts plays a whole day).
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { Pool } from "pg";
import { PERCENTILE_MIN_PLAYERS, SUBSTRING_ROUNDS } from "../src/config/tunables";
import { GAME, SUBSTRINGS } from "../src/platform/game";
import { asked, caughtToCards } from "./game";
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
// Runs of players who never played are written with the round rules off, which needs the local superuser.
const ADMIN = new Pool({ connectionString: "postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres", max: 1 });
const PHONE = { width: 390, height: 844 };
// The app's tablet width (src/app/min-width.ts, used by src/app/today-cards.tsx).
const TABLET = { width: 768, height: 1024 };
// Wide enough that the cards' own row, beside the 280px sidebar, is at least 768px.
const ROOMY = { width: 1100, height: 900 };
const ROUNDS = ["qk", "qm", "qnp", "qrs", "qtv", "qwx", "qyz"];
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

// Each test leaves nothing the next depends on: its pages are closed, so none is still fetching, and its players' runs
// of Fragments go (their rows cascade), so the next test can take the day away.
const contexts: BrowserContext[] = [];
test.afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.close()));
  await DB.query("delete from private.run where game_id = 'substrings' and user_id in (select id from auth.users where email like $1)", [`${RUN}-gc%@example.test`]);
});

async function player(browser: Browser, name: string, viewport = PHONE) {
  const context = await browser.newContext({ viewport });
  contexts.push(context);
  const page = await context.newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  return page;
}

const idOf = async (name: string) => (await DB.query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${name}@example.test`])).rows[0].id;

const offbeat = (page: Page) => page.getByRole("region", { name: GAME.name, exact: true });
const fragments = (page: Page) => page.getByRole("region", { name: SUBSTRINGS.name, exact: true });
const previous = (page: Page) => page.getByRole("button", { name: "Previous game", exact: true });
const next = (page: Page) => page.getByRole("button", { name: "Next game", exact: true });
const place = (page: Page, text: string) => page.getByText(text, { exact: true });
const carousel = (page: Page) => page.getByRole("group", { name: "Today's games", exact: true });
const noArrows = async (page: Page) => {
  await expect(previous(page)).toHaveCount(0);
  await expect(next(page)).toHaveCount(0);
  // The carousel's own place, not every "N of M" on the page (the board and the leaderboard have theirs from 768px).
  for (const text of ["1 of 2", "2 of 2"]) await expect(place(page, text)).toHaveCount(0);
  await expect(carousel(page)).toHaveCount(0);
};

// Plays Offbeat's run to a caught first answer, from Today's card, and leaves the player on Today.
async function finishOffbeat(page: Page) {
  await offbeat(page).getByRole("link", { name: "Play", exact: true }).click();
  await expect(page).toHaveURL(/\/play$/);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await asked(page, "Name an animal");
  await caughtToCards(page, puzzle.hostAnswer);
  await page.goto("/");
}

// A player who never signs in, as play2.e2e.ts makes a friend: written with the rules off, which the local superuser may.
async function otherPlayer(email: string): Promise<string> {
  const client = await ADMIN.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    const { rows } = await client.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [email]);
    await client.query("commit");
    return rows[0].id;
  } finally {
    client.release();
  }
}

// A finished run of Fragments, written as play2.e2e.ts writes a friend's: round 7 opened an hour ago, with no word.
async function finishFragments(userId: string) {
  const client = await ADMIN.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    await client.query("delete from private.question_open where user_id = $1 and game_id = 'substrings' and puzzle_date = $2::date", [userId, today]);
    await client.query("delete from private.run where user_id = $1 and game_id = 'substrings' and puzzle_date = $2::date", [userId, today]);
    await client.query("insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'substrings', $2::date, now() - interval '1 hour')", [userId, today]);
    await client.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx, opened_at) values ($1, 'substrings', $2::date, 6, now() - interval '1 hour')", [userId, today]);
    await client.query("commit");
  } finally {
    client.release();
  }
}

test("on a phone Today opens on the game left to play, 82% of the row, with the next beside it", async ({ browser }) => {
  await addDay();
  const page = await player(browser, "gca");
  await expect(place(page, "1 of 2")).toBeVisible();
  await expect(offbeat(page).getByRole("link", { name: "Play", exact: true })).toBeInViewport();
  // The front card is 82% of the row (human, 2026-11-14: "B. Medium, front card 82%"); the next shows beside it.
  const [slide, row] = await Promise.all([page.getByRole("group", { name: "1 of 2", exact: true }).boundingBox(), carousel(page).boundingBox()]);
  expect(slide!.width / row!.width).toBeCloseTo(0.82, 2);
  await expect(fragments(page)).toBeInViewport();
  await expect(fragments(page)).not.toBeInViewport({ ratio: 0.5 });

  // Offbeat over, Fragments left to play: Fragments is in front, and Offbeat's Result is out of view.
  await finishOffbeat(page);
  await expect(place(page, "2 of 2")).toBeVisible();
  await expect(fragments(page).getByRole("link", { name: "Play", exact: true })).toBeInViewport();
  await expect(offbeat(page).getByRole("link", { name: "Result", exact: true })).not.toBeInViewport();
  await expect(next(page)).toHaveAttribute("aria-disabled", "true");

  // The arrows move between the cards, and so does the keyboard on them.
  await previous(page).click();
  await expect(place(page, "1 of 2")).toBeVisible();
  await expect(offbeat(page).getByRole("link", { name: "Result", exact: true })).toBeInViewport();
  await expect(previous(page)).toHaveAttribute("aria-disabled", "true");
  await next(page).click();
  await expect(place(page, "2 of 2")).toBeVisible();
  await previous(page).focus();
  await page.keyboard.press("Enter");
  await expect(place(page, "1 of 2")).toBeVisible();
  await next(page).focus();
  await page.keyboard.press("Space");
  await expect(place(page, "2 of 2")).toBeVisible();
  // A swipe is a scroll: the place follows it.
  await carousel(page).locator("> div").last().evaluate((el) => el.scrollTo({ left: 0, behavior: "instant" }));
  await expect(place(page, "1 of 2")).toBeVisible();

  // Both over, Offbeat is in front again.
  await finishFragments(await idOf("gca"));
  await page.goto("/");
  await expect(place(page, "1 of 2")).toBeVisible();
});

test("the two cards sit side by side, with no arrows, once their row is 768px wide; a tablet keeps the carousel", async ({ browser }) => {
  await addDay();
  // At 768px the sidebar leaves the row too narrow for two cards (human, 2026-11-14: "Side by side only with room").
  const tablet = await player(browser, "gcb", TABLET);
  await expect(place(tablet, "1 of 2")).toBeVisible();
  await expect(next(tablet)).toBeVisible();
  const name = await fragments(tablet).getByRole("heading").boundingBox();
  expect(name!.height).toBeLessThan(60);
  const page = tablet;
  await page.setViewportSize(ROOMY);
  await expect(offbeat(page)).toBeInViewport({ ratio: 1 });
  await expect(fragments(page)).toBeInViewport({ ratio: 1 });
  const [left, right] = await Promise.all([offbeat(page).boundingBox(), fragments(page).boundingBox()]);
  expect(right!.x).toBeGreaterThan(left!.x + left!.width - 1);
  expect(right!.y).toBeCloseTo(left!.y, 0);
  await noArrows(page);
});

test("a day with an approved day in only one game shows that card and no arrows", async ({ browser }) => {
  await removeDay();
  const page = await player(browser, "gcc");
  await expect(offbeat(page)).toBeVisible();
  await expect(fragments(page)).toHaveCount(0);
  await noArrows(page);
});

test("Fragments' card has Play before the run, Continue during it, and the score and its place after", async ({ browser }) => {
  await addDay();
  const page = await player(browser, "gcd", TABLET);
  const card = fragments(page);
  // Fragments' own colour, #5A2F5E, whatever the theme.
  const block = card.getByRole("heading", { name: SUBSTRINGS.name }).locator("..");
  expect(await block.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(90, 47, 94)");
  await expect(card.getByText(`${SUBSTRING_ROUNDS.length} rounds`, { exact: true })).toBeVisible();
  await expect(card.getByText("20 seconds each", { exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "How to play" })).toBeVisible();
  await expect(card.getByRole("link", { name: "Play", exact: true })).toHaveAttribute("href", SUBSTRINGS.path);

  await card.getByRole("link", { name: "Play", exact: true }).click();
  await expect(page).toHaveURL(/\/play2$/);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByText("Round 1 of 7")).toBeVisible();
  await page.goto("/");
  await expect(card.getByText("Your run is still going", { exact: true })).toBeVisible();
  await expect(card.getByRole("link", { name: "Continue", exact: true })).toHaveAttribute("href", SUBSTRINGS.path);

  // Over, with too few players to place the run: the score, and no percent.
  await finishFragments(await idOf("gcd"));
  await page.goto("/");
  await expect(card.getByText("0 points", { exact: true })).toBeVisible();
  await expect(card.getByText(/better than/)).toHaveCount(0);
  await expect(card.getByRole("link", { name: "Result", exact: true })).toHaveAttribute("href", SUBSTRINGS.path);

  // With enough finished players the card adds where the run stands, the percent the result screen shows.
  for (let i = 0; i < PERCENTILE_MIN_PLAYERS; i++) {
    await finishFragments(await otherPlayer(`${RUN}-gcdo${i}@example.test`));
  }
  await page.goto("/");
  await expect(card.getByText(/^better than \d+(\.\d+)?% of players$/)).toBeVisible();
});
