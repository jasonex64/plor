// M17 17b, finding a player and their profile on the screens (docs/milestones/M17-profiles-and-friend-requests.md,
// "17b design", Screens): two players in two browsers. One finds the other by username from the Friends page, sees the
// stranger's profile, and sends a request from it; the other accepts from the sender's profile; each then sees the
// friend's fuller profile, reached from the friends list too.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { befriend, RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });

// Today's Offbeat, for the run a fixture comment hangs on (the last test).
let puzzle: TodayPuzzle;
test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

const A = `pfa${RUN}`;
const B = `pfb${RUN}`;

const tab = (page: Page) => page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Friends/ });
const you = (page: Page) => page.getByRole("region", { name: "You and this player" });
async function find(page: Page, typed: string) {
  const card = page.getByRole("region", { name: "Find a player" });
  await card.getByLabel("Their exact username").fill(typed);
  await card.getByRole("button", { name: "Find" }).click();
}

test("a player is found by username, sent a request from their profile, and shows more once a friend", { tag: "@visual" }, async ({ page, browser }) => {
  test.slow();
  const other = await (await browser.newContext()).newPage();
  await page.goto("/friends");
  await signInAndPick(page, "pfa");
  await other.goto("/friends");
  await signInAndPick(other, "pfb");

  // A name nobody has: the page says so, and offers nothing.
  await find(page, `nobody${RUN}`);
  await expect(page.getByRole("main").getByText("There's no player with that username.")).toBeVisible();
  await expect(you(page)).toHaveCount(0);

  // B's name, typed with capitals and spaces: B's profile as a stranger sees it, under the Friends tab.
  await page.goto("/friends");
  await find(page, ` ${B.toUpperCase()} `);
  await expect(page).toHaveURL(new RegExp(`/u/${B}$`));
  await expect(page.getByRole("heading", { level: 2, name: B })).toBeVisible();
  await expect(tab(page)).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("region", { name: "All games" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Calendar" })).toHaveCount(0);
  await expect(page.getByText(/^Playing since /)).toHaveCount(0);

  // A adds B from the profile; B's tab counts it, and A's profile says who asked.
  await you(page).getByRole("button", { name: "Add friend" }).click();
  await expect(you(page)).toContainText("Friend request sent.");
  await expect(you(page).getByRole("button", { name: "Cancel request" })).toBeVisible();
  await other.reload();
  await expect(tab(other)).toHaveAccessibleName("Friends 1 friend request");
  await other.goto(`/u/${A}`);
  await expect(you(other)).toContainText(`${A} sent you a friend request.`);
  await you(other).getByRole("button", { name: "Accept" }).click();

  // Friends now: the calendar and the last days' chart show, and the tab's count is gone.
  await expect(you(other)).toContainText("You're friends.");
  await expect(other.getByRole("region", { name: "Calendar" })).toBeVisible();
  await expect(other.getByText("Points, last 7 days")).toBeVisible();
  await expect(other.getByText(/^Playing since /)).toBeVisible();
  await expect(tab(other)).toHaveAccessibleName("Friends");

  // A reaches B's profile from the friends list, and their own name opens with a way to Me.
  await page.goto("/friends");
  await page.getByRole("region", { name: "Your friends" }).getByRole("link", { name: B, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/u/${B}$`));
  await expect(you(page)).toContainText("You're friends.");
  await expect(page.getByRole("region", { name: "Calendar" })).toBeVisible();
  await page.goto(`/u/${A}`);
  await expect(you(page)).toContainText("This is you.");
  await expect(you(page).getByRole("link", { name: "Your Me page" })).toBeVisible();
});

// M20 20e (answers 81 and 82): a name opens its profile on the live board, the leaderboard, the feed and a group's
// members, with its avatar; your own name opens Me. Sets its own screen: Today has its board and leaderboard from 1200px.
test("a name opens its profile on the board, the leaderboard, the feed and a group's members; your own opens Me", async ({ browser }) => {
  test.slow(); // two sign-ins and a friendship made on the screens
  const SCREEN = { width: 1280, height: 900 };
  const page = await (await browser.newContext({ viewport: SCREEN })).newPage();
  await page.goto("/friends");
  await signInAndPick(page, "pfc");
  const other = await (await browser.newContext({ viewport: SCREEN })).newPage();
  await other.goto("/friends");
  await signInAndPick(other, "pfd");
  await befriend(page, "pfc", other, "pfd");
  const [me, friend] = [`pfc${RUN}`, `pfd${RUN}`];
  const idOf = async (name: string) => (await DB.query<{ user_id: string }>("select user_id from private.profile where username = $1", [name])).rows[0].user_id;
  const friendId = await idOf(friend);
  // Old enough for the leaderboard, as boards.e2e.ts makes its players.
  await DB.query("update private.profile set created_at = now() - interval '14 days' where username = any($1::text[])", [[me, friend]]);
  // The friend's comment in the friends' thread, written in the database with the run it hangs on: posting on the
  // screens needs a whole run played.
  await DB.query("insert into private.run (user_id, game_id, puzzle_date) values ($1, 'offbeat', private.today())", [friendId]);
  await DB.query("insert into private.comment (user_id, game_id, puzzle_date, body, group_id) values ($1, 'offbeat', private.today(), $2, null)", [friendId, `hello ${RUN}`]);
  const toProfile = (region: ReturnType<Page["getByRole"]>, name: string, href: string) => expect(region.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);

  await page.goto("/friends");
  await toProfile(page.getByRole("region", { name: "Friends today" }), friend, `/u/${friend}`);
  const board = page.getByRole("region", { name: "Friends leaderboard" });
  // Today's board waits for the viewer's own run; the week's doesn't.
  await board.getByRole("radiogroup", { name: "Period", exact: true }).getByText("This week", { exact: true }).click();
  await toProfile(board, friend, `/u/${friend}`);
  await toProfile(board, `${me} (you)`, "/me");
  // The avatar is part of the way in, and not a second stop for the keyboard or a screen reader.
  await expect(board.locator(`a[href="/u/${friend}"]`)).toHaveCount(2);
  await expect(board.locator(`a[href="/u/${friend}"][aria-hidden="true"][tabindex="-1"] [data-initial]`)).toHaveCount(1);
  // The initial isn't underlined as a link's text is.
  expect(await board.locator(`a[href="/u/${friend}"][aria-hidden="true"]`).evaluate((a) => getComputedStyle(a).textDecorationLine)).toBe("none");

  await toProfile(page.getByRole("region", { name: "Feed" }), friend, `/u/${friend}`);

  await page.goto("/groups");
  await page.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Name Club");
  await page.getByRole("region", { name: "Groups" }).getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  await DB.query("insert into private.group_member (group_id, user_id) values ($1, $2)", [page.url().split("/").pop(), friendId]);
  await page.reload();
  const members = page.getByRole("region", { name: "Members" });
  await toProfile(members, friend, `/u/${friend}`);
  await toProfile(members, me, "/me");

  await members.getByRole("link", { name: friend, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/u/${friend}$`));
  await page.goto("/friends");
  await board.getByRole("radiogroup", { name: "Period", exact: true }).getByText("This week", { exact: true }).click();
  await board.getByRole("link", { name: `${me} (you)`, exact: true }).click();
  await expect(page).toHaveURL(/\/me$/);
});
