// 14b-14, the leaderboard's graph view (docs/milestones/M14-14b-14-leaderboard-graph.md): the Friends leaderboard's
// List / Graph switch, each week's race, picking a player by a tap or Find a player (WAI-ARIA APG Combobox), Show
// table (WAI Complex Images), and a day the viewer is still playing (answer 28). The friends and their points are
// written straight into the database, last week's on every day and this week's on the days that are over.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { Pool, type PoolClient } from "pg";
import { fixtureDay, loadFixtureBase } from "../src/test/answer-fixture";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
const PHONE = { width: 390, height: 844 };
const ACCENT = "rgb(36, 87, 214)";
const EDGE = "rgb(138, 138, 132)";
const TEXT = "rgb(26, 26, 24)";
// Points on each day, Monday first: the mockup's Last week, and This week's cut to the days that are over.
const LAST: Record<string, number[]> = {
  Ana: [5, 6, 3, 4, 6, 7, 5],
  Bea: [1, 1, 2, 2, 3, 1, 2],
  Ben: [6, 5, 2, 3, 4, 3, 2],
  Cleo: [2, 3, 4, 0, 5, 4, 3],
  you: [4, 3, 6, 5, 4, 6, 7],
};
const THIS: Record<string, number[]> = {
  Ana: [6, 4, 7, 5, 3, 6],
  Bea: [1, 2, 2, 3, 2, 1],
  Ben: [5, 2, 3, 4, 6, 5],
  Cleo: [0, 4, 2, 6, 5, 4],
  you: [3, 6, 5, 6, 7, 5],
};
let today = "";
let lastMonday = "";
let thisOver = 0;
let createdPuzzle: string | null = null;

// The Monday of a date's week (as src/friends/leaderboard.ts reckons it, which this file can't import: it brings in
// next/server).
const weekStart = (date: string) => day(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
const day = (monday: string, i: number) => {
  const d = new Date(`${monday}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
};

test.beforeAll(async () => {
  today = (await DB.query<{ today: string }>("select private.today()::text as today")).rows[0].today;
  lastMonday = day(weekStart(today), -7);
  thisOver = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${weekStart(today)}T00:00:00Z`)) / 86_400_000;
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  if (createdPuzzle) await DB.query("delete from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [createdPuzzle]);
  await DB.end();
});

// Writes as postgres with triggers off, as me.e2e.ts does: runs on past days with no puzzle, and their ledger rows.
async function written(work: (client: PoolClient) => Promise<void>) {
  const client = await DB.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    await work(client);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

async function points(client: PoolClient, userId: string, days: number[], monday: string) {
  for (const [i, p] of days.entries()) {
    const date = day(monday, i);
    await client.query(
      "insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, 'offbeat', $2::date, ($2::date + time '12:00') at time zone 'America/Los_Angeles')",
      [userId, date],
    );
    await client.query("insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus) values ($1, 'offbeat', $2::date, $3, 0)", [userId, date, p]);
  }
}

// The viewer, signed in on the page, and four friends with display names and points.
async function withFriends(page: Page, tag: string): Promise<string> {
  await page.goto("/friends");
  await signInAndPick(page, tag);
  const viewer = (await DB.query<{ id: string }>("select id from auth.users where email = $1", [`${RUN}-${tag}@example.test`])).rows[0].id;
  await written(async (client) => {
    await points(client, viewer, LAST.you, lastMonday);
    await points(client, viewer, THIS.you.slice(0, thisOver), weekStart(today));
    for (const name of ["Ana", "Bea", "Ben", "Cleo"]) {
      const { rows } = await client.query<{ id: string }>("insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id", [
        `${RUN}-${tag}${name.toLowerCase()}@example.test`,
      ]);
      const id = rows[0].id;
      await client.query("insert into private.profile (user_id, username, display_name) values ($1, $2, $3)", [id, `${tag}${name.toLowerCase()}${RUN}`, name]);
      await client.query("insert into private.friendship (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [id, viewer]);
      await points(client, id, LAST[name], lastMonday);
      await points(client, id, THIS[name].slice(0, thisOver), weekStart(today));
    }
  });
  await page.reload();
  return viewer;
}

const board = (page: Page) => page.getByRole("region", { name: "Friends leaderboard" });
const week = (page: Page, name: "This week" | "Last week") => board(page).getByRole("region", { name });
const texts = (graph: Locator) => graph.locator("text").allTextContents();
// Each line's stroke colour and width, as drawn.
const lines = (graph: Locator) =>
  graph.locator("polyline").evaluateAll((all) => all.map((l) => [getComputedStyle(l).stroke, getComputedStyle(l).strokeWidth]));
// Drawn at the size it shows, so its 12px text is 12px (criterion 5).
const unscaled = (graph: Locator) =>
  graph.evaluate((svg) => Math.abs((svg as SVGSVGElement).viewBox.baseVal.width - svg.getBoundingClientRect().width) < 0.5);
const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test("the Friends leaderboard switches to each week's race; a tap or Find picks a player; Show table lists it", async ({ browser }) => {
  test.slow();
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await withFriends(page, "gv");

  // List on load; Graph beside it (answer 3).
  const view = board(page).getByRole("radiogroup", { name: "View" });
  await expect(view.getByRole("radio", { name: "List" })).toBeChecked();
  await expect(week(page, "Last week").getByRole("listitem").first()).toContainText("Ana");
  await view.getByText("Graph", { exact: true }).click();
  await expect(view.getByRole("radio", { name: "Graph" })).toBeChecked();

  // Last week's race: named for screen readers, you and the leader labelled with their totals, a tick back to the
  // dot for the label pushed off it, the leader's "1" badge, your line in the accent, a found one none yet.
  const last = week(page, "Last week").getByRole("img");
  await expect(last).toHaveAccessibleName(`Last week, day by day: Ana leads with 36; you have 35.`);
  expect(await texts(last)).toEqual(expect.arrayContaining(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su", "1", "Ana 36", "You 35"]));
  expect(await last.locator("line").count()).toBeGreaterThan(5);
  const drawn = await lines(last);
  expect(drawn.filter(([c, w]) => c === ACCENT && w === "3px")).toHaveLength(1);
  expect(drawn.filter(([c, w]) => c === EDGE && w === "2px")).toHaveLength(4);
  expect(await unscaled(last)).toBe(true);
  expect(await noSidewaysScroll(page)).toBe(true);

  // This week: today marked, or on a Monday the first points' note (answer 5).
  if (thisOver > 0) {
    expect(await texts(week(page, "This week").getByRole("img"))).toContain("Today");
  } else {
    await expect(week(page, "This week")).toContainText("The first points arrive Tuesday, once Monday is over.");
  }

  // A tap anywhere picks the nearest line on that day's column: just above Ben's Sunday point (answer 24).
  const ben = await last.locator("polyline").evaluateAll((all, edge) => {
    const ends = all.filter((l) => getComputedStyle(l).stroke === edge).map((l) => (l as SVGPolylineElement).points);
    const at = ends.map((p) => p.getItem(6)).sort((a, b) => a.y - b.y);
    // Sunday's grey ends from the top: Ana 36, Ben 25, Cleo 21, Bea 12.
    return { x: at[1].x, y: at[1].y };
  }, EDGE);
  // Below the fold on a phone: a click at its box would land off the screen.
  await last.scrollIntoViewIfNeeded();
  const box = (await last.boundingBox())!;
  await page.mouse.click(box.x + ben.x, box.y + ben.y - 3);
  const find = board(page).getByRole("combobox", { name: "Find a player" });
  await expect(find).toHaveValue("Ben");
  expect(await texts(last)).toContain("Ben 25");
  expect((await lines(last)).filter(([c, w]) => c === TEXT && w === "2px")).toHaveLength(1);
  // Picking them again clears them.
  await page.mouse.click(box.x + ben.x, box.y + ben.y - 3);
  await expect(find).toHaveValue("");

  // Find a player (APG Combobox, list autocomplete with automatic selection): the first suggestion selected, Down and
  // Up wrap, Enter takes it.
  await find.fill("b");
  const list = board(page).getByRole("listbox", { name: "Players" });
  await expect(list.getByRole("option")).toHaveText(["Bea", "Ben"]);
  await expect(find).toHaveAttribute("aria-expanded", "true");
  await expect(list.getByRole("option", { name: "Bea" })).toHaveAttribute("aria-selected", "true");
  await expect(find).toHaveAttribute("aria-activedescendant", (await list.getByRole("option", { name: "Bea" }).getAttribute("id"))!);
  await find.press("ArrowDown");
  await expect(list.getByRole("option", { name: "Ben" })).toHaveAttribute("aria-selected", "true");
  await find.press("ArrowDown");
  await expect(list.getByRole("option", { name: "Bea" })).toHaveAttribute("aria-selected", "true");
  await find.press("ArrowUp");
  await find.press("Enter");
  await expect(find).toHaveValue("Ben");
  await expect(find).toHaveAttribute("aria-expanded", "false");
  expect(await texts(last)).toContain("Ben 25");
  // Escape closes the list, then clears the field.
  await find.fill("c");
  await expect(list.getByRole("option")).toHaveText(["Cleo"]);
  await find.press("Escape");
  await expect(list).toHaveCount(0);
  await expect(find).toHaveValue("c");
  await find.press("Escape");
  await expect(find).toHaveValue("");
  // Leaving the field takes the selected suggestion; a name nobody has says so; ✕ clears.
  await find.fill("cl");
  await find.press("Tab");
  await expect(find).toHaveValue("Cleo");
  expect(await texts(last)).toContain("Cleo 21");
  await find.fill("zz");
  await expect(board(page)).toContainText("No player called “zz” here.");
  await board(page).getByRole("button", { name: "Clear" }).click();
  await expect(find).toHaveValue("");
  await expect(find).toBeFocused();

  // Show table: beside the date chip, 44px, a real table of running totals by place, scrolling inside its own box.
  const show = week(page, "Last week").getByRole("button", { name: "Show table" });
  await expect(show).toHaveAttribute("aria-expanded", "false");
  expect((await show.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await show.click();
  await expect(week(page, "Last week").getByRole("button", { name: "Hide table" })).toHaveAttribute("aria-expanded", "true");
  const table = week(page, "Last week").getByRole("table");
  await expect(table.getByRole("columnheader")).toHaveText(["Player", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  await expect(table.getByRole("row").nth(1)).toHaveText(["Ana", "5", "11", "14", "18", "24", "31", "36"].join(""));
  await expect(table.getByRole("row").nth(2)).toHaveText(["You", "4", "7", "13", "18", "22", "28", "35"].join(""));
  expect(await table.getByRole("rowheader").first().evaluate((th) => getComputedStyle(th).position)).toBe("sticky");
  expect(await table.evaluate((t) => t.parentElement!.scrollWidth > t.parentElement!.clientWidth)).toBe(true);
  expect(await noSidewaysScroll(page)).toBe(true);
  // The graph is redrawn at the new width once its resize observer reports it, a frame later.
  await page.setViewportSize({ width: 320, height: 700 });
  await expect.poll(() => noSidewaysScroll(page)).toBe(true);

  // From 768px, the days' longer names, still drawn at the size shown.
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => texts(last)).toEqual(expect.arrayContaining(["Mon", "Sun"]));
  expect(await unscaled(last)).toBe(true);

  // Today's leaderboard card has no graph (answer 2).
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Leaderboard" }).getByRole("radio", { name: "Yesterday" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Leaderboard" }).getByRole("radio", { name: "Graph" })).toHaveCount(0);
});

test("a day the viewer is still playing is flat, struck through and noted, and '–' in the table (answer 28)", async ({ browser }) => {
  test.slow();
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  const viewer = await withFriends(page, "gh");
  // Last Wednesday's run: the viewer's points come out of the ledger and its question 1 is answered, so it waits at
  // the reveal, in progress (DECISIONS.md, Game 1: Timer). A run in progress needs its day's puzzle.
  const wednesday = day(lastMonday, 2);
  if ((await DB.query("select 1 from private.puzzle where game_id = 'offbeat' and puzzle_date = $1::date", [wednesday])).rowCount === 0) {
    await DB.query("insert into private.puzzle (game_id, puzzle_date, content) values ('offbeat', $1::date, $2)", [wednesday, fixtureDay(wednesday, await loadFixtureBase(DB))]);
    createdPuzzle = wednesday;
  }
  await written(async (client) => {
    await client.query("delete from private.points_ledger where user_id = $1 and puzzle_date = $2::date", [viewer, wednesday]);
    await client.query(
      "insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched) values ($1, 'offbeat', $2::date, 0, 'fixture', false)",
      [viewer, wednesday],
    );
  });
  await page.reload();
  await board(page).getByRole("radiogroup", { name: "View" }).getByText("Graph", { exact: true }).click();

  // Wednesday adds nothing for anyone: Ana 33 (36 less 3), you 29 (35 less 6).
  const last = week(page, "Last week").getByRole("img");
  await expect(last).toHaveAccessibleName("Last week, day by day: Ana leads with 33; you have 29.");
  const we = last.locator("text", { hasText: /^We$/ });
  expect(await we.evaluate((t) => getComputedStyle(t).textDecorationLine)).toBe("line-through");
  await expect(week(page, "Last week")).toContainText("Wednesday's points are hidden until you finish that run.");
  await week(page, "Last week").getByRole("button", { name: "Show table" }).click();
  await expect(week(page, "Last week").getByRole("table").getByRole("row").nth(1)).toHaveText(["Ana", "5", "11", "–", "15", "21", "28", "33"].join(""));
});
