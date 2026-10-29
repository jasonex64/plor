// Groups with two real browsers (docs/milestones/M10-groups.md, 10b to 10d; G7): one player creates a group on the
// Groups tab (docs/milestones/M14-14a-1-shell.md) and copies its invite link from the group's page; a second opens the link signed out,
// signs in, picks a username, joins, and lands on the group's page with both members listed and on its leaderboard.
// Once both have played, a comment in the group's thread reaches the other member's open group page live, and stays
// out of the friends thread.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, sent, signInAndPick, sharedLink } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { GAME } from "../src/platform/game";

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
  // Two posts wait out their Undo windows before another player sees them (M14 14b-6b), past the default 30 s on a
  // cold dev server.
  test.slow();
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
  // Shared from a button, never shown (M14 14b-3, answer 9), on /g/ with a 10-character code.
  const link = await sharedLink(creator, creator.getByRole("button", { name: "Share group link" }));
  expect(link).toMatch(/^http:\/\/localhost:3000\/g\/[A-Za-z0-9_-]{10}$/);
  expect(await creator.locator("body").innerText()).not.toContain("/g/");
  // A group's page doesn't scroll sideways on a 320px phone (14b-3, criterion 7). Polled: measured the moment after a
  // resize, the page is still the old width while it lays out again (seen at 360 for a moment, then 320).
  await creator.setViewportSize({ width: 320, height: 640 });
  await expect.poll(() => creator.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await creator.setViewportSize({ width: 1280, height: 720 });

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

  // Today's layout before playing (docs/milestones/M14-14a-2a-today.md): Offbeat's banner with Play first, then the
  // feed, with nothing to read yet; at this desktop width (1280px) the live board and the leaderboard card, whose board
  // picker has Friends and each group (H7), are in the right column (docs/milestones/M14-14b-2b-1-shell.md).
  await creator.goto("/");
  const sections = (within: string) => () =>
    creator.locator(within).evaluateAll((all) => all.filter((s) => !s.parentElement?.closest("section")).map((s) => s.getAttribute("aria-label")));
  await expect.poll(sections("main section")).toEqual([GAME.name, "Feed"]);
  await expect.poll(sections("aside[aria-label='Your circle'] section")).toEqual(["Friends today", "Leaderboard"]);
  const card = creator.getByRole("region", { name: GAME.name });
  await expect(card.getByRole("link", { name: "Play", exact: true })).toBeVisible();
  await expect(creator.getByRole("region", { name: "Leaderboard" }).getByLabel("Board").locator("option")).toHaveText(["Friends", "Book Club"]);
  const creatorFeed = creator.getByRole("region", { name: "Feed" });
  await expect(creatorFeed.getByText("No comments yet.")).toBeVisible();
  await expect(creatorFeed.getByText("Finish today's game to join in.")).toBeVisible();

  // Both are tipped over at stop 1 (10d). The joiner's comment in the group's thread reaches the creator's open group
  // page without a reload (G5). A second reaches the creator's open home page, in the feed, labelled with the group
  // (M11 11b).
  for (const page of [creator, joiner]) {
    await page.goto("/");
    await play(page);
    await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
    await page.getByRole("button", { name: "Answer" }).click();
    await expect(page.getByText(/^You climbed 0 of 7 stops/)).toBeVisible();
  }
  // After playing, the score is in the card, and the order is the same.
  await creator.goto("/");
  // The banner's facts as chips since 14b-8b.
  await expect(card.getByText("0 points", { exact: true })).toBeVisible();
  await expect(card.getByText("tipped over at stop 1", { exact: true })).toBeVisible();
  await expect.poll(sections("main section")).toEqual([GAME.name, "Feed"]);
  await expect.poll(sections("aside[aria-label='Your circle'] section")).toEqual(["Friends today", "Leaderboard"]);
  // Opens a page on the creator's side and waits until its board channel has joined (Realtime replies ok to the join);
  // returns the channel's socket.
  async function openLive(url: string) {
    // Leave the page first, so the old page's channel can't be the one waited on (as live-board.e2e.ts's openBoard).
    await creator.goto("about:blank");
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
  // The group's own thread: from 1200px the friends feed beside it has a Post too (docs/milestones/M14-14b-2b-1-shell.md).
  const thread = joiner.getByRole("region", { name: "Comments" });
  await thread.getByLabel("Comment", { exact: true }).fill(body);
  await thread.getByRole("button", { name: "Post" }).click();
  await expect(joiner.getByRole("region", { name: "Comments" }).getByRole("listitem").filter({ hasText: body })).toBeVisible();
  await sent(joiner, "/api/comments");
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
  await thread.getByLabel("Comment", { exact: true }).fill(second);
  await thread.getByRole("button", { name: "Post" }).click();
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
