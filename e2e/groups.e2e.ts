// Groups with two real browsers (docs/milestones/M10-groups.md, 10b to 10d; G7): one player creates a group on the
// Groups tab (docs/milestones/M14-14a-1-shell.md) and copies its invite link from the group's page; a second opens the link signed out,
// signs in, picks a username, joins, and lands on the group's page with both members listed and on its leaderboard.
// Once both have played, a comment in the group's thread reaches the other member's open group page live, and stays
// out of the friends thread.
import { devices, expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { GAME } from "../src/platform/game";
import { localStack } from "../scripts/slot.ts";
import { RUN, sent, signInAndPick, sharedLink, playToEnd } from "./players";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });
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
  // How old it is, from the Pacific day it was made (inbox #233: "Started Nov 2").
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
  await expect(creator.getByText(`Started ${today}`, { exact: true })).toBeVisible();
  // Shared from a button, never shown (M14 14b-3, answer 9), on /g/ with a 10-character code.
  const link = await sharedLink(creator, creator.getByRole("button", { name: "Share group link" }));
  expect(link).toMatch(new RegExp(`^${localStack().appUrl}/g/[A-Za-z0-9_-]{10}$`));
  expect(await creator.locator("body").innerText()).not.toContain("/g/");
  // A group's page doesn't scroll sideways on a 320px phone (14b-3, criterion 7). Polled: measured the moment after a
  // resize, the page is still the old width while it lays out again (seen at 360 for a moment, then 320).
  await creator.setViewportSize({ width: 320, height: 640 });
  await expect.poll(() => creator.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await creator.setViewportSize({ width: 1280, height: 720 });

  const joiner = await (await browser.newContext()).newPage();
  await joiner.goto(link);
  // Signed out, the invite asks for sign-in first, with a way to play today's game as a guest under it, on the front page
  // (docs/milestones/M18-guest-play.md, answer 10).
  await expect(joiner.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  const asGuest = joiner.getByRole("link", { name: "Play today's game as a guest", exact: true });
  await expect(asGuest).toHaveAttribute("href", "/");
  expect((await joiner.getByLabel("Email").boundingBox())!.y).toBeLessThan((await asGuest.boundingBox())!.y);
  await signInAndPick(joiner, "gb");
  await joiner.getByRole("button", { name: "Join group" }).click();
  await expect(joiner).toHaveURL(groupUrl);
  const members = joiner.getByRole("region", { name: "Members", exact: true }).getByRole("listitem");
  await expect(members).toHaveText([`ga${RUN} (creator)`, `gb${RUN}`]);
  // The page's order is the board, then the comments, then the members (inbox #247; human, 2026-11-17: "Board, comments, members").
  const top = async (name: string) => (await joiner.getByRole("heading", { name, exact: true }).boundingBox())!.y;
  const [boardY, commentsY, membersY] = [await top("Group leaderboard"), await top("Comments"), await top("Members")];
  expect(boardY).toBeLessThan(commentsY);
  expect(commentsY).toBeLessThan(membersY);
  // Neither has points this week: a tie, by name, with the viewer marked (10c). One period shows at a time, Today on
  // load (docs/milestones/M20-design-rules-and-clean-up.md, 20i).
  await joiner.getByRole("region", { name: "Group leaderboard" }).getByRole("radio", { name: "This week", exact: true }).check();
  const board = joiner.getByRole("region", { name: "Group leaderboard" }).getByRole("region", { name: "This week" });
  await expect(board.getByRole("listitem")).toHaveText([`ga${RUN}: 0 points`, `gb${RUN} (you): 0 points`]);

  // The creator's Groups tab opens the group itself (M24 24b): their only one, so the first they joined.
  await creator.goto("/groups");
  await expect(creator.getByRole("heading", { name: "Book Club" })).toBeVisible();
  await expect(creator.getByRole("region", { name: "Group leaderboard" })).toBeVisible();

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

  // Both play a run with no answer (10d). The joiner's comment in the group's thread reaches the creator's open group
  // page without a reload (G5). A second reaches the creator's open home page, in the feed, labelled with the group
  // (M11 11b).
  for (const page of [creator, joiner]) {
    await page.goto("/");
    await playToEnd(page);
    await expect(page.getByText("0 points", { exact: true })).toBeVisible();
  }
  // After playing, the score is in the card, and the order is the same.
  await creator.goto("/");
  // The banner's facts as chips since 14b-8b.
  await expect(card.getByText("0 points", { exact: true })).toBeVisible();
  await expect(card.getByText("0 answers", { exact: true })).toBeVisible();
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
  await expect(feed.getByRole("article").filter({ hasText: body })).toContainText("Book Club");
  // The page loads the feed a few times as it starts (mount, join, the run's state), so one of those could land after
  // the post. Only a request made after the group's nudge arrives shows the nudge reloads the feed.
  let nudged = false;
  ws.on("framereceived", (f) => {
    if (String(f.payload).includes("comments_changed")) nudged = true;
  });
  const refetch = creator.waitForRequest((r) => nudged && r.url().includes("/api/feed/items"));
  const second = `home too ${RUN}`;
  await thread.getByLabel("Comment", { exact: true }).fill(second);
  await thread.getByRole("button", { name: "Post" }).click();
  await refetch;
  await expect(feed.getByRole("article").filter({ hasText: second })).toContainText("Book Club");
});

// The Groups tab opens a group at once (docs/milestones/M24-groups-tab-and-favourites.md, 24b; answers 9 to 11, 14, 15,
// 17 and 18): the starred one, or with no star the first joined. The group's name is a dropdown of the player's groups
// that ends with "New group…", and the star beside it makes the group the default, on the account.
test("the Groups tab opens the starred group, its name a dropdown that switches groups and starts one", { tag: "@visual" }, async ({ page, browser }) => {
  // The name of the phone run's player differs from the desktop run's, which can run at the same moment.
  const who = page.viewportSize()!.width < 768 ? "gsp" : "gsd";
  await page.goto("/groups");
  await signInAndPick(page, who);
  // In no group, the tab is the Create box.
  const none = page.getByRole("region", { name: "Groups" });
  await expect(none.getByText("No groups yet.")).toBeVisible();
  await none.getByLabel("New group's name").fill("Alpha");
  await none.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  const alphaUrl = page.url();

  // The name is a dropdown: the player's groups, then "New group…", which opens the name box.
  const card = page.getByRole("region", { name: "Group", exact: true });
  // The card's one dropdown: a label's text includes its options', so it has no exact label to find it by.
  const switcher = card.getByRole("combobox");
  await expect(switcher.locator("option")).toHaveText(["Alpha", "New group…"]);
  await switcher.selectOption({ label: "New group…" });
  await card.getByLabel("New group's name").fill("Beta");
  await card.getByRole("button", { name: "Create group" }).click();
  await expect(page).not.toHaveURL(alphaUrl);
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  const betaUrl = page.url();
  await expect(page.getByRole("heading", { name: "Beta" })).toBeVisible();
  await expect(switcher.locator("option")).toHaveText(["Alpha", "Beta", "New group…"]);

  // No star yet: the tab opens the first group joined, with its board, and no list to tap through.
  await page.goto("/groups");
  await expect(page.getByRole("heading", { name: "Alpha" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Group leaderboard" })).toBeVisible();
  await expect(switcher).toHaveValue(alphaUrl.split("/").pop()!);
  // The name and the star sit on one line, inside the card, at phone width too.
  const star = card.getByRole("button", { name: "Open this group first", exact: true });
  const [nameBox, starBox, cardBox] = [await switcher.boundingBox(), await star.boundingBox(), await card.boundingBox()];
  expect(Math.abs(nameBox!.y + nameBox!.height / 2 - (starBox!.y + starBox!.height / 2))).toBeLessThan(2);
  expect(starBox!.x + starBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width);
  // At least WCAG 2.2's 24px target (2.5.8).
  expect(Math.min(starBox!.width, starBox!.height)).toBeGreaterThanOrEqual(24);

  // Choosing a group shows it.
  await switcher.selectOption({ label: "Beta" });
  await expect(page).toHaveURL(betaUrl);
  await expect(page.getByRole("heading", { name: "Beta" })).toBeVisible();

  // The star makes Beta the default: after a reload, on the tab, and in a second browser signed in as the same player.
  await star.click();
  const filled = card.getByRole("button", { name: "Opens first", exact: true });
  await expect(filled).toBeVisible();
  await expect(switcher.locator("option")).toHaveText(["Alpha", "Beta ★", "New group…"]);
  await page.reload();
  await expect(filled).toBeVisible();
  await page.goto("/groups");
  await expect(page.getByRole("heading", { name: "Beta" })).toBeVisible();
  const second = await (await browser.newContext({ storageState: await page.context().storageState(), viewport: page.viewportSize() })).newPage();
  await second.goto("/groups");
  await expect(second.getByRole("heading", { name: "Beta" })).toBeVisible();
  await expect(second.getByRole("button", { name: "Opens first", exact: true })).toBeVisible();
  await second.close();

  // Tapping the filled star clears it (answer 17), and the tab is back to the first group joined.
  await filled.click();
  await expect(star).toBeVisible();
  await page.goto("/groups");
  await expect(page.getByRole("heading", { name: "Alpha" })).toBeVisible();
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
  // Today on load (20i).
  await expect(page.getByRole("region", { name: "Group leaderboard" }).getByRole("region", { name: "Today" })).toBeVisible();
  const reloads = ["/api/groups/detail", "/api/groups/leaderboard"].map((path) => page.waitForRequest((r) => new URL(r.url()).pathname === path));
  await page.clock.fastForward("25:00:00");
  await Promise.all(reloads);
});

// Share opens the system share menu only on a phone or tablet (inbox #230, the human 2026-11-16: "I don't want it to open
// something else on my computer"; answer: "Copy on computers only"). Chrome on Windows has navigator.share, so the stub
// stands in for it: a computer copies and never calls it; a touch device (Playwright's Pixel 7) still gets the sheet.
test("Share copies on a computer and opens the share sheet on a phone", async ({ browser }) => {
  const stubShare = () => {
    (window as unknown as { sheet: ShareData[] }).sheet = [];
    navigator.share = async (data?: ShareData) => {
      (window as unknown as { sheet: ShareData[] }).sheet.push(data!);
    };
  };
  const sheet = (page: Page) => page.evaluate(() => (window as unknown as { sheet: ShareData[] }).sheet);

  const computer = await (await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] })).newPage();
  await computer.addInitScript(stubShare);
  await computer.goto("/groups");
  await signInAndPick(computer, "shc");
  await computer.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Desk Set");
  await computer.getByRole("button", { name: "Create group" }).click();
  const link = await sharedLink(computer, computer.getByRole("button", { name: "Share group link" }));
  expect(link).toMatch(/\/g\/[A-Za-z0-9_-]{10}$/);
  expect(await sheet(computer)).toEqual([]);

  const phone = await (await browser.newContext({ ...devices["Pixel 7"] })).newPage();
  await phone.addInitScript(stubShare);
  await phone.goto("/groups");
  await signInAndPick(phone, "shp");
  await phone.getByRole("region", { name: "Groups" }).getByLabel("New group's name").fill("Pocket Set");
  await phone.getByRole("button", { name: "Create group" }).click();
  await phone.getByRole("button", { name: "Share group link" }).click();
  await expect.poll(() => sheet(phone)).toEqual([{ text: "Join Pocket Set on Plor", url: expect.stringMatching(/\/g\/[A-Za-z0-9_-]{10}$/) }]);
  await expect(phone.getByText("Copied.")).toHaveCount(0);
});
