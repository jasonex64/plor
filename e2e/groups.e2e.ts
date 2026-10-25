// Groups with two real browsers (docs/milestones/M10-groups.md, 10b to 10d; G7): one player creates a group on the
// Groups tab (docs/milestones/M14-14a-1-shell.md) and copies its invite link from the group's page; a second opens the link signed out,
// signs in, picks a username, joins, and lands on the group's page with both members listed and on its leaderboard.
// Once both have played, a comment in the group's thread reaches the other member's open group page live, and stays
// out of the friends thread.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
let puzzle: TodayPuzzle;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
});

test.afterAll(async () => {
  // Deleting the players deletes their memberships, runs and comments, and the last member's going deletes the group.
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

test("a group is made on the Groups tab and joined by its link", async ({ browser }) => {
  const creator = await (await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] })).newPage();
  await creator.goto("/groups");
  await signInAndPick(creator, "ga");
  const groups = creator.getByRole("region", { name: "Groups" });
  await expect(groups.getByText("No groups yet.")).toBeVisible();
  await groups.getByLabel("New group's name").fill("Book Club");
  await groups.getByRole("button", { name: "Create group" }).click();
  await expect(creator).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  const groupUrl = creator.url();
  await expect(creator.getByRole("heading", { name: "Book Club" })).toBeVisible();
  await creator.getByRole("button", { name: "Copy" }).click();
  await expect(creator.getByText("Copied.")).toBeVisible();
  const link = await creator.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/^http:\/\/localhost:3000\/groups\/join\/[A-Za-z0-9_-]{22}$/);

  const joiner = await (await browser.newContext()).newPage();
  await joiner.goto(link);
  await signInAndPick(joiner, "gb");
  await joiner.getByRole("button", { name: "Join group" }).click();
  await expect(joiner).toHaveURL(groupUrl);
  const members = joiner.getByRole("region", { name: "Group", exact: true }).getByRole("listitem");
  await expect(members).toHaveText([`ga${RUN} (creator)`, `gb${RUN}`]);
  // Neither has points this week: a tie, by name, with the viewer marked (10c).
  const board = joiner.getByRole("region", { name: "Group leaderboard" }).getByRole("region", { name: "This week" });
  await expect(board.getByRole("listitem")).toHaveText([`ga${RUN}: 0 points`, `gb${RUN} (you): 0 points`]);

  // The group is on the creator's Groups tab too.
  await creator.goto("/groups");
  await expect(creator.getByRole("region", { name: "Groups" }).getByRole("link", { name: "Book Club" })).toBeVisible();

  // Today's layout before playing (M11 H1, with the rest moved to their tabs, M14 14a-1): the game card first, with
  // Start and yesterday's standings, a chip per group (H7); then the feed, with nothing to read yet.
  await creator.goto("/");
  const sections = () => creator.locator("main > section").evaluateAll((all) => all.map((s) => s.getAttribute("aria-label")));
  await expect.poll(sections).toEqual(["Offbeat", "Feed"]);
  const card = creator.getByRole("region", { name: "Offbeat" });
  await expect(card.getByRole("button", { name: "Start today's puzzle" })).toBeVisible();
  await expect(card.getByRole("region", { name: "Yesterday" }).getByRole("button")).toHaveText(["Friends", "Book Club"]);
  const creatorFeed = creator.getByRole("region", { name: "Feed" });
  await expect(creatorFeed.getByText("No comments yet.")).toBeVisible();
  await expect(creatorFeed.getByText("Finish today's puzzle to read them and join in.")).toBeVisible();

  // Both are caught on question 1 (10d). The joiner's comment in the group's thread reaches the creator's open group
  // page without a reload (G5). A second reaches the creator's open home page, in the feed, labelled with the group
  // (M11 11b).
  for (const page of [creator, joiner]) {
    await page.goto("/");
    await page.getByRole("button", { name: "Start today's puzzle" }).click();
    await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
    await page.getByRole("button", { name: "Answer" }).click();
    await expect(page.getByText(/^You survived 0 of 7 questions/)).toBeVisible();
  }
  // After playing, the result is in the card, and the order is the same.
  await expect(card.getByText(/^You survived 0 of 7 questions/)).toBeVisible();
  await expect.poll(sections).toEqual(["Offbeat", "Feed"]);
  // Opens a page on the creator's side and waits until its board channel has joined (Realtime replies ok to the join);
  // returns the channel's socket.
  async function openLive(url: string) {
    const socket = creator.waitForEvent("websocket", (ws) => ws.url().includes("/realtime/v1"));
    await creator.goto(url);
    const ws = await socket;
    await ws.waitForEvent("framereceived", {
      predicate: (f) => String(f.payload).includes("phx_reply") && String(f.payload).includes('"status":"ok"') && String(f.payload).includes("board:"),
    });
    return ws;
  }
  await openLive(groupUrl);
  const creatorThread = creator.getByRole("region", { name: "Comments" });
  await expect(creatorThread.getByText("No comments yet.")).toBeVisible();

  const body = `group only ${RUN}`;
  await joiner.goto(groupUrl);
  await joiner.getByLabel("Comment", { exact: true }).fill(body);
  await joiner.getByRole("button", { name: "Post" }).click();
  await expect(joiner.getByRole("region", { name: "Comments" }).getByRole("listitem").filter({ hasText: body })).toBeVisible();
  await expect(creatorThread.getByRole("listitem").filter({ hasText: body })).toBeVisible();

  const ws = await openLive("/");
  const feed = creator.getByRole("region", { name: "Feed" });
  await expect(feed.getByRole("listitem").filter({ hasText: body })).toContainText("Book Club");
  // The page loads the feed a few times as it starts (mount, join, the run's state), so one of those could land after
  // the post. Only a request made after the group's nudge arrives shows the nudge reloads the feed.
  let nudged = false;
  ws.on("framereceived", (f) => {
    if (String(f.payload).includes("comments_changed")) nudged = true;
  });
  const refetch = creator.waitForRequest((r) => nudged && r.url().includes("/api/feed"));
  const second = `home too ${RUN}`;
  await joiner.getByLabel("Comment", { exact: true }).fill(second);
  await joiner.getByRole("button", { name: "Post" }).click();
  await refetch;
  await expect(feed.getByRole("listitem").filter({ hasText: second })).toContainText("Book Club");
});

// A group's page left open past midnight moves to the new day too (M11 H6): its board and thread start again, and the
// page asks for the time to the next reset. The browser's clock is moved past the reset, as Today's test does.
// Only the remount loads the board, and only the new day loads the group's details again.
test("the reset reloads a group's page", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.clock.install();
  await page.goto("/groups");
  await signInAndPick(page, "gr");
  await page.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Night Owls");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page.getByRole("region", { name: "Group leaderboard" }).getByRole("region", { name: "This week" })).toBeVisible();
  const reloads = ["/api/groups/detail", "/api/groups/leaderboard"].map((path) => page.waitForRequest((r) => new URL(r.url()).pathname === path));
  await page.clock.fastForward("25:00:00");
  await Promise.all(reloads);
});
