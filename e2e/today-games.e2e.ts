// Today's game cards (docs/milestones/M16-16f-the-shared-pieces.md, 16f-2): Fragments' card before, during and after a
// run, and the cards as a carousel on phones (the card left to play in front, arrows and keyboard, one card a day when
// only one game has a day) and side by side once their row is 560px wide. Fragments' day and words are this file's own, as the real list
// isn't in git (as play2.e2e.ts); its runs are put in their states in the database, as each state's screens are other
// files' (play2.e2e.ts plays a whole day).
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { Pool } from "pg";
import { PERCENTILE_MIN_PLAYERS, SUBSTRING_ROUNDS } from "../src/config/tunables";
import { GAME, SUBSTRINGS } from "../src/platform/game";
import { asked, caughtToCards, next as nextQuestion, safe } from "./game";
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
// Runs of players who never played are written with the round rules off, which needs the local superuser.
const ADMIN = new Pool({ connectionString: localStack().adminDatabaseUrl, max: 1 });
const PHONE = { width: 390, height: 844 };
// The app's tablet width (src/app/min-width.ts, used by src/app/today-cards.tsx).
const TABLET = { width: 768, height: 1024 };
// Wide enough that the cards' own row, beside the 280px sidebar, is far past the 560px it needs.
const ROOMY = { width: 1100, height: 900 };
// The desktop size every @visual test runs at (CLAUDE.md, Testing): the right column leaves the row 592px.
const DESKTOP = { width: 1280, height: 720 };
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

test("the two cards sit side by side, with no arrows, once their row is 560px wide; a tablet keeps the carousel", async ({ browser }) => {
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
  // M20 20n-2 (the second look audit's finding 4; answer 78, "560px"): at 1280 x 720 the right column leaves the row
  // 592px, and the two cards still sit side by side, each with its name on one line.
  await page.setViewportSize(DESKTOP);
  await noArrows(page);
  const [l, r] = await Promise.all([offbeat(page).boundingBox(), fragments(page).boundingBox()]);
  expect(r!.x).toBeGreaterThan(l!.x + l!.width - 1);
  expect(r!.y).toBeCloseTo(l!.y, 0);
  for (const card of [offbeat(page), fragments(page)]) expect((await card.getByRole("heading").boundingBox())!.height).toBeLessThan(60);
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

// Inbox #246 (human, 2026-11-17: "you should just have the same content"): side by side, the two cards are one height
// in each state, and a finished Fragments card holds the next-puzzle line a finished Offbeat card does.
test("side by side the cards are the same height before and after the runs, both with the next-puzzle line once over", async ({ browser }) => {
  await addDay();
  const page = await player(browser, "gce", ROOMY);
  const heights = async () => {
    const [a, b] = await Promise.all([offbeat(page).boundingBox(), fragments(page).boundingBox()]);
    return [a!.height, b!.height];
  };
  await expect(fragments(page).getByRole("link", { name: "Play", exact: true })).toBeVisible();
  const before = await heights();
  expect(before[1]).toBeCloseTo(before[0], 0);

  await finishOffbeat(page);
  await finishFragments(await idOf("gce"));
  await page.goto("/");
  await expect(fragments(page).getByRole("link", { name: "Result", exact: true })).toBeVisible();
  await expect(offbeat(page).getByRole("timer")).toContainText("Next puzzle in");
  await expect(fragments(page).getByRole("timer")).toContainText("Next puzzle in");
  const after = await heights();
  expect(after[1]).toBeCloseTo(after[0], 0);
});

// M20 20k-3 (docs/milestones/M20-design-rules-and-clean-up.md, answers 54, 55 and 57): each game's card is a white card
// with a band in its game's colour holding its name and date; once played its score is the big number (30px), popping in
// over 300ms. The top of each game's own screen, once its run is over, is the same card.
test("each game's card is a white card with its game's band, and once played the score is big and pops in", async ({ browser }) => {
  test.slow();
  await addDay();
  const page = await player(browser, "gck", ROOMY);
  const slot = (name: string) =>
    page.evaluate((name) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${name})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    }, name);
  const cardOf = (region: Locator) => region.locator("[class*='banner']").first();
  const band = (region: Locator) => region.getByRole("heading", { level: 2, name: /^(Offbeat|Fragments)$/ }).locator("..");
  const score = (region: Locator) => region.locator("[class*='score']").first();
  const fill = (el: Locator) => el.evaluate((e) => getComputedStyle(e).backgroundColor);
  // Before playing: white cards, each with its band.
  for (const [region, game] of [[offbeat(page), "--offbeat"], [fragments(page), "--fragments"]] as const) {
    await expect(band(region)).toBeVisible();
    expect(await fill(cardOf(region))).toBe(await slot("--surface"));
    expect(await fill(band(region))).toBe(await slot(game));
    // 20n-7 (answers 100 to 103): the game's emblem is in the band before its name, 24px, and hidden from screen readers.
    const emblem = band(region).locator("svg[data-emblem]");
    await expect(emblem).toHaveAttribute("aria-hidden", "true");
    const [mark, name] = [(await emblem.boundingBox())!, (await band(region).getByRole("heading", { level: 2 }).boundingBox())!];
    expect([mark.width, mark.height]).toEqual([24, 24]);
    expect(mark.x + mark.width).toBeLessThanOrEqual(name.x);
  }
  // Once played: the score big and popping in, on Today's card and at the top of the game's own screen.
  await finishOffbeat(page);
  await finishFragments(await idOf("gck"));
  await page.goto("/");
  for (const region of [offbeat(page), fragments(page)]) {
    await expect(score(region)).toBeVisible();
    expect(await score(region).evaluate((e) => [getComputedStyle(e).fontSize, /pop/.test(getComputedStyle(e).animationName), getComputedStyle(e).animationDuration])).toEqual(["30px", true, "0.3s"]);
  }
  for (const [path, region, game] of [[GAME.path, offbeat(page), "--offbeat"], [SUBSTRINGS.path, fragments(page), "--fragments"]] as const) {
    await page.goto(path);
    await expect(score(region)).toBeVisible();
    expect(await fill(band(region))).toBe(await slot(game));
    expect(await score(region).evaluate((e) => getComputedStyle(e).fontSize)).toBe("30px");
  }
});

// M20 20n-4 (the second look audit's findings 6 and 8; answers 83 and 84): each game's start screen has Back to Today
// above one card that holds the game's band, the rules, Start and How to play, with Today marked; each result is one
// card, the band and the score over the details, with no Result button leading to where the player already is.
test("each game's start is Back to Today and one card with its band, the rules, Start and How to play; each result is one card", { tag: "@visual" }, async ({ page }) => {
  test.slow();
  await addDay();
  await page.goto("/");
  await signInAndPick(page, "gcs");
  const main = page.getByRole("main");
  const tab = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Today/ }).filter({ visible: true });
  // The card an element is in: its band's heading, whether the band has the day, and the card's buttons on show (How to
  // play's closed dialog is in the card too).
  // The kit's card: a class that ends in "_card", as the build names kit.module.css's .card.
  const CARD = "[class$='_card'], [class*='_card ']";
  const cardOf = (el: Locator) =>
    el.evaluate((node, CARD) => {
      const card = node.closest(CARD);
      const band = card?.querySelector("h2");
      if (!card || !band) return { band: null, day: false, buttons: [] };
      return { band: band.textContent, day: band.parentElement!.querySelector("p") !== null, buttons: [...card.querySelectorAll("button")].filter((b) => b.checkVisibility()).map((b) => b.textContent) };
    }, CARD);
  for (const game of [GAME, SUBSTRINGS]) {
    await page.goto(game.path);
    const start = main.getByRole("button", { name: "Start", exact: true }).filter({ visible: true });
    await expect(start).toBeVisible();
    await expect(main.getByRole("link", { name: "Today", exact: true }).filter({ visible: true })).toHaveAttribute("href", "/");
    await expect(tab).toHaveAttribute("aria-current", "true");
    expect(await cardOf(start), game.name).toEqual({ band: game.name, day: true, buttons: ["Start", "How to play"] });
    // The emblems are on Today's cards and the front page, not on the game's own screen (20n-7, answer 100).
    await expect(main.locator("svg[data-emblem]")).toHaveCount(0);
    // The rules are in the card too, above Start.
    expect(await start.evaluate((b, CARD) => /\d+ (questions|rounds)/.test(b.closest(CARD)!.textContent!), CARD), game.name).toBe(true);
  }

  await page.goto("/");
  await finishOffbeat(page);
  await finishFragments(await idOf("gcs"));
  for (const [game, detail] of [[GAME, "You survived 0 of 7 questions"], [SUBSTRINGS, "Your score"]] as const) {
    await page.goto(game.path);
    const words = main.getByText(detail).filter({ visible: true });
    await expect(words).toBeVisible();
    expect((await cardOf(words)).band, game.name).toBe(game.name);
    await expect(main.getByRole("link", { name: "Result", exact: true }).filter({ visible: true })).toHaveCount(0);
    await expect(main.getByRole("link", { name: "Today", exact: true }).filter({ visible: true })).toHaveAttribute("href", "/");
  }
});

// M20 20n-5 (the second look audit's finding 7; answer 88): a question's row in Offbeat's result is stacked, not a
// sentence: the question in bold with a Safe or Caught chip in that colour, "You: … · Host: …" under it, then the points
// and how many players gave the answer, and Search answers after them.
test("Offbeat's result rows are stacked: the question in bold with a Safe or Caught chip, then You and Host, then Search answers", { tag: "@visual" }, async ({ page }) => {
  test.slow();
  await page.goto("/");
  await signInAndPick(page, "gcr");
  await offbeat(page).getByRole("link", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await asked(page, "Name an animal");
  await safe(page, puzzle.safeAnswer);
  await nextQuestion(page, "Name a fruit");
  await caughtToCards(page, "apple");

  const result = page.locator("#result");
  await expect(result).not.toContainText("you said");
  const rows = result.getByRole("listitem");
  await expect(rows).toHaveCount(2);
  const read = (row: Locator) =>
    row.evaluate((li) => {
      const [question, chip, search] = [li.querySelector("strong")!, li.querySelector("[class*='_chip']")!, [...li.querySelectorAll("button")].find((b) => b.textContent === "Search answers")!];
      const style = getComputedStyle(chip);
      return {
        question: question.textContent,
        bold: Number(getComputedStyle(question).fontWeight) >= 700,
        chip: chip.textContent,
        colours: `${style.color} on ${style.backgroundColor}`,
        // On the question's line, at its right; Search answers after everything the row says.
        chipOnLine: Math.abs(chip.getBoundingClientRect().top - question.getBoundingClientRect().top) < 12 && chip.getBoundingClientRect().left > question.getBoundingClientRect().right,
        searchLast: search.getBoundingClientRect().top > question.getBoundingClientRect().bottom,
      };
    });
  const [first, second] = [await read(rows.nth(0)), await read(rows.nth(1))];
  expect(first).toMatchObject({ question: "Name an animal", bold: true, chip: "Safe", chipOnLine: true, searchLast: true });
  expect(second).toMatchObject({ question: "Name a fruit", bold: true, chip: "Caught", chipOnLine: true, searchLast: true });
  expect(first.colours).not.toBe(second.colours);
  await expect(rows.nth(0)).toContainText(`You: ${puzzle.safeAnswer} · Host: ${puzzle.hostAnswer}`);
  await expect(rows.nth(0)).toContainText("+25 points, bonus +0");
  await expect(rows.nth(1)).toContainText("You: apple · Host: apple");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Opened, the search is the row's width, not a narrow box at its left (20n-5's review).
  await rows.nth(0).getByRole("button", { name: "Search answers", exact: true }).click();
  const [box, row] = await Promise.all([rows.nth(0).getByRole("searchbox").or(rows.nth(0).getByRole("textbox")).boundingBox(), rows.nth(0).boundingBox()]);
  expect(box!.width).toBeGreaterThan(row!.width * 0.6);
});
