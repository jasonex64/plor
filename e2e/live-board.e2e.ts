// The live board with two real browsers (docs/milestones/M07-friends-and-live-board.md, 7c): two players sign in
// with emailed codes, become friends through an invite link, and one sees the other start without reloading, and
// nothing more until their own run is over (M12 12d).
// Reactions (M08 8b), reports (8c) and comments and reactions arriving live (8d) are checked once both have played.
// The board is on the Friends tab and the game and the feed on Today (docs/milestones/M14-14a-1-shell.md), so the
// players move between them. A second test restarts Realtime and checks that the page refetches the board with
// reason=reconnect.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { execSync } from "node:child_process";
import { RUN, play, sent, signInAndPick, sharedLink } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";
import { gotPastText } from "../src/game/words";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
let puzzle: TodayPuzzle;
let hostAnswer = "";
let safeAnswer = "";

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
  ({ hostAnswer, safeAnswer } = puzzle);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

// Opens a page, the Friends tab unless another is named, and waits until its board channel has joined (Realtime
// replies ok to the join). Today joins the channel too, for the feed.
async function openBoard(page: Page, path = "/friends"): Promise<void> {
  // Leave the page first, so a channel the old page was still opening can't be the one waited on: it closes with the
  // page, and its join never comes (seen in M14 14a-1, once signing in waits for the username to save).
  await page.goto("about:blank");
  // The dev server's hot-reload socket opens too; only Realtime's counts.
  const joined = page.waitForEvent("websocket", (ws) => ws.url().includes("/realtime/v1")).then((ws) =>
    ws.waitForEvent("framereceived", { predicate: (f) => String(f.payload).includes("phx_reply") && String(f.payload).includes('"status":"ok"') && String(f.payload).includes("board:") }),
  );
  await page.goto(path);
  await joined;
}

test("a friend's run shows up live, with no spoiler", async ({ browser }) => {
  // Two players moving between Today and the Friends tab, each move waiting for the channel to join: near Playwright's
  // default 30 seconds since M14 14a-1, so it gets Playwright's own allowance for slow tests (three times the default).
  test.slow();
  const watcher = await (await browser.newContext()).newPage();
  const player = await (await browser.newContext()).newPage();
  // Every frame each page receives from Realtime, to check what a payload holds (M08 8d) and what reaches the
  // watcher before they've finished (12d).
  const framesOf = new Map<Page, string[]>([
    [watcher, []],
    [player, []],
  ]);
  for (const [page, frames] of framesOf) {
    page.on("websocket", (ws) => {
      if (ws.url().includes("/realtime/v1")) ws.on("framereceived", (f) => void frames.push(String(f.payload)));
    });
  }
  const watcherName = `w${RUN}`;
  const playerName = `p${RUN}`;

  await watcher.goto("/friends");
  await signInAndPick(watcher, "w");
  // The invite link is on the Friends tab, with the friends list (M14 14a-3b).
  const invite = watcher.getByRole("region", { name: "Your friends" }).getByRole("region", { name: "Invite friends" });
  const link = await sharedLink(watcher, invite.getByRole("button", { name: "Invite a friend" }));

  await player.goto(new URL(link!).pathname);
  await signInAndPick(player, "p");
  await expect(player.getByRole("heading", { name: `Add ${watcherName} as a friend?` })).toBeVisible();
  await player.getByRole("button", { name: "Add friend" }).click();
  await expect(player.getByRole("heading", { name: `You and ${watcherName} are now friends.` })).toBeVisible();

  await openBoard(watcher);
  // The plain list of friends, not the lists inside "where everyone ended".
  const row = watcher.getByRole("region", { name: "Friends today" }).locator(":scope > ul > li").filter({ hasText: playerName });
  await expect(row).toHaveText(`${playerName}: hasn't played yet`);

  // The player starts and is tipped over at stop 1; the watcher's page shows the start without a reload, and the
  // watcher, who hasn't played, sees nothing more: not the question, not that the run is over (12d).
  const started = `${playerName}: started (you'll see how it's going once you finish)`;
  await player.goto("/");
  await play(player);
  await expect(row).toHaveText(started);
  await player.getByLabel("Your answer").fill(hostAnswer);
  await player.getByRole("button", { name: "Answer" }).click();
  await expect(player.getByText("You climbed 0 of 7 stops")).toBeVisible();
  // The board as the server gives it, and every frame that reached the watcher: by now the catch has been sent
  // wherever it goes, and the watcher's frames hold only the start.
  await openBoard(watcher);
  await expect(row).toHaveText(started);
  const statuses = framesOf.get(watcher)!.filter((f) => f.includes("friend_status") && f.includes(playerName));
  expect(statuses).toHaveLength(1);
  expect(statuses[0]).toMatch(/"state": ?"started"/);

  // Once the watcher is caught too, the friend's ending shows, and both are in one place of "where everyone ended"
  // (7d): the watcher first, then the friend, with the full list behind the row.
  await watcher.goto("/");
  await play(watcher);
  await watcher.getByLabel("Your answer").fill(hostAnswer);
  await watcher.getByRole("button", { name: "Answer" }).click();
  // Tipped over at stop 1: no stops climbed, so no rarity bonus and no bonus line (M09 9a; 14b-2c answer 7).
  await expect(watcher.getByText("You climbed 0 of 7 stops and scored 0 points.")).toBeVisible();
  // Beside the one answer, its share: two players answered at stop 1, under the minimum of 5 (H5).
  await expect(watcher.getByText(/· too few players yet$/)).toBeVisible();
  // The streak's pill: today is the watcher's first day (M11 H4), the first rank's
  // (docs/milestones/M14-14b-2a-streak-ranks.md).
  await watcher.goto("/");
  await expect(watcher.getByRole("link", { name: "1 day streak, Daisy" })).toBeVisible();
  // Yesterday's standings, friends by default (H7), in the leaderboard card (M14 14a-2a): neither played yesterday.
  const leaderboard = watcher.getByRole("region", { name: "Leaderboard" });
  await expect(leaderboard.getByRole("radio", { name: "Yesterday" })).toBeChecked();
  await expect(leaderboard.getByLabel("Board")).toHaveValue("");
  const yesterday = leaderboard.getByRole("region", { name: "Yesterday" });
  await expect(yesterday.getByRole("listitem")).toHaveText([`${playerName}: 0 points`, `${watcherName} (you): 0 points`]);
  await openBoard(watcher);
  // The friends leaderboard (M09 9b; weekly since M10 10a) lists both with no points yet this week, since today's
  // count once the day is over (D9). Tied on 0, they go by name: the player's "p…" before the watcher's "w…".
  await expect(watcher.getByRole("region", { name: "Friends leaderboard" }).getByRole("region", { name: "This week" }).getByRole("listitem")).toHaveText([
    `${playerName}: 0 points`,
    `${watcherName} (you): 0 points`,
  ]);
  // The row ends with its ⋯ for reacting (M08 8b; 14b-13), which appears only now that the watcher has finished.
  const more = row.getByRole("button", { name: `React to ${playerName}'s run` });
  await expect(row).toHaveText(`${playerName}: tipped over at stop 1 by "${hostAnswer}"`);
  await expect(more).toBeVisible();
  // On a phone the ⋯ sits beside the name and how the run stands, not over them (reactions did: 14b-8's critique;
  // docs/milestones/M14-14b-8-the-new-look.md, 14b-8e).
  await watcher.setViewportSize({ width: 390, height: 844 });
  const dots = (await more.boundingBox())!;
  for (const words of [row.locator("b"), row.getByText(/^tipped over/)]) {
    const box = (await words.boundingBox())!;
    expect(dots.x).toBeGreaterThanOrEqual(box.x + box.width);
  }
  await watcher.setViewportSize({ width: 1280, height: 720 });
  const place = watcher.getByRole("region", { name: "Where everyone ended" }).locator("details");
  await expect(place).toHaveCount(1);
  await expect(place.locator("summary")).toHaveText(`Tipped over at stop 1: You, ${playerName}`);
  await place.locator("summary").click();
  await expect(place.getByRole("listitem")).toHaveText(["You", playerName]);

  // The watcher reacts to the friend's run by tapping (M08 8b): another emoji replaces the first, and the same one
  // again removes it. The player's open board shows each change without a reload (8d).
  await openBoard(player);
  // Each pick is from the run's ⋯ (14b-13), whose popover shows the watcher's own pressed; the counts are in the row's
  // summary.
  const pick = async (emoji: string) => {
    await more.click();
    await row.getByRole("button", { name: emoji }).click();
  };
  await pick("👍");
  await expect(row.getByText(/^👍 1/)).toHaveText("👍 1, yours");
  await pick("❤️");
  await expect(row.getByText(/^❤️ 1/)).toHaveText("❤️ 1, yours");
  await expect(row.getByText(/^👍/)).toHaveCount(0);
  await more.click();
  await expect(row.getByRole("button", { name: "❤️" })).toHaveAttribute("aria-pressed", "true");
  await expect(row.getByRole("button", { name: "👍" })).toHaveAttribute("aria-pressed", "false");
  await watcher.keyboard.press("Escape");
  // Two taps on one row are one held action: only the last is sent (docs/milestones/M14-14b-6-feel-and-polish.md, P2).
  await sent(watcher, "/api/reactions");
  await expect(player.getByText("Reactions on your run: ❤️ 1")).toBeVisible();
  await pick("❤️");
  await expect(row.getByText(/^❤️/)).toHaveCount(0);
  await sent(watcher, "/api/reactions");
  await expect(player.getByText("Reactions on your run")).toHaveCount(0);

  // The player comments, and it reaches the watcher's open page; the watcher's reaction on it reaches the player's
  // (8d). Then the watcher reports it and a second one, and they're gone for the watcher at once (8c, D5). Made an
  // admin, the watcher finds them on the reported-comments page, keeps the second (M14 14b-2b-2b), which stays for the
  // player and hidden for the watcher, and deletes the first, which the player's open page loses too.
  await openBoard(player, "/");
  await openBoard(watcher, "/");
  const body = `report me ${RUN}`;
  await player.getByLabel("Comment to your friends").fill(body);
  await player.getByRole("button", { name: "Post" }).click();
  const playerComment = player.getByRole("region", { name: "Feed" }).getByRole("listitem").filter({ hasText: body });
  await expect(playerComment).toBeVisible();
  await sent(player, "/api/comments");
  const watcherComment = watcher.getByRole("region", { name: "Feed" }).getByRole("listitem").filter({ hasText: body });
  await expect(watcherComment).toBeVisible();
  await watcherComment.getByRole("button", { name: /^Actions for / }).click();
  await watcherComment.getByRole("button", { name: "😂" }).click();
  await sent(watcher, "/api/reactions");
  await expect(playerComment.getByText(/^😂 1/)).toHaveText("😂 1");
  const kept = `keep me ${RUN}`;
  await player.getByLabel("Comment to your friends").fill(kept);
  await player.getByRole("button", { name: "Post" }).click();
  await sent(player, "/api/comments");
  const watcherKept = watcher.getByRole("region", { name: "Feed" }).getByRole("listitem").filter({ hasText: kept });
  for (const c of [watcherComment, watcherKept]) {
    await c.getByRole("button", { name: /^Actions for / }).click();
    await c.getByRole("button", { name: "Report" }).click();
  }
  await expect(watcher.getByRole("region", { name: "Feed" }).getByText("No comments yet.")).toBeVisible();
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-w@example.test`]);
  await watcher.goto("/admin/reports");
  const reported = watcher.getByRole("region", { name: "Reported comments" }).getByRole("listitem").filter({ hasText: body });
  await expect(reported).toContainText(`${playerName} (${playerName}) · on `);
  await expect(reported).toContainText("1 report, first");
  const reportedKept = watcher.getByRole("region", { name: "Reported comments" }).getByRole("listitem").filter({ hasText: kept });
  await reportedKept.getByRole("button", { name: "Keep comment" }).click();
  await expect(reportedKept).toHaveCount(0);
  await expect(watcher.getByRole("region", { name: "Decisions" }).getByRole("row").filter({ hasText: kept })).toContainText("Kept");
  // Delete asks inline before it deletes for everyone (docs/milestones/M14-14b-2b-2-admin-build.md, criterion 6).
  // The keyboard's focus follows the swap: to Cancel when it asks, back to Delete… on Cancel (14b-2c-3, item 41).
  await reported.getByRole("button", { name: "Delete…" }).click();
  await expect(reported.getByRole("button", { name: "Cancel" })).toBeFocused();
  await reported.getByRole("button", { name: "Cancel" }).click();
  await expect(reported.getByRole("button", { name: "Delete…" })).toBeFocused();
  await reported.getByRole("button", { name: "Delete…" }).click();
  await reported.getByRole("group", { name: "Confirm delete" }).getByRole("button", { name: "Delete", exact: true }).click();
  await expect(watcher.getByText("No reported comments.")).toBeVisible();
  // The deletion's record, with the admin and the author (M12 12d), in the decisions log.
  const record = watcher.getByRole("region", { name: "Decisions" }).getByRole("row").filter({ hasText: body });
  await expect(record).toContainText("Deleted");
  await expect(record.getByRole("cell").nth(2)).toHaveText(watcherName);
  await expect(record.getByRole("cell").nth(3)).toHaveText(playerName);
  await expect(playerComment).toHaveCount(0);
  await expect(player.getByRole("region", { name: "Feed" }).getByRole("listitem").filter({ hasText: kept })).toBeVisible();
  await watcher.goto("/");
  await expect(watcher.getByRole("region", { name: "Feed" }).getByText("No comments yet.")).toBeVisible();

  // Every change came over Realtime as a nudge, and no frame either page received holds a comment's text.
  const received = [...framesOf.values()].flat().join("\n");
  expect(received).toContain("comments_changed");
  expect(received).toContain("run_reactions_changed");
  expect(received).not.toContain(body);
  expect(received).not.toContain(kept);
});

// After a safe answer, the reveal shows the points it earned and its estimated rarity bonus (M09 9a). The number
// itself is the route test's (src/game/runs.db.test.ts); this checks the reveal shows it.
test("the reveal shows a safe answer's estimated rarity bonus", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "s");
  await play(page);
  await page.getByLabel("Your answer").fill(safeAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.getByRole("heading", { name: gotPastText(1) })).toBeVisible();
  await expect(page.getByText(/^\+25 points, rarity bonus \+\d+ \(estimate\) · 25 points so far$/)).toBeVisible();
});

// Browser offline emulation left the Realtime socket open (tried twice, 2026-10-22), so the server end is restarted
// instead, as a Realtime restart or deploy would do to players. The local container restarts in about 2 s.
test("a reconnect refetches the board", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "r");
  await openBoard(page);
  const refetch = page.waitForRequest((r) => r.url().includes("/api/board?reason=reconnect"));
  execSync("docker restart supabase_realtime_plor", { stdio: "ignore" });
  // While the channel is down, the page says so (M11 H6), and stops saying so once it's back.
  const paused = page.getByRole("region", { name: "Friends today" }).getByText("Live updates paused, reconnecting…");
  await expect(paused).toBeVisible();
  await refetch;
  await expect(paused).toBeHidden();
});

// At midnight Pacific every section of an open page starts again from the server's new day (M11 H6), not only the
// game: Today's card and feed, and the Friends tab's board and leaderboard (docs/milestones/M14-14a-1-shell.md). The
// browser's clock is moved past the reset, at most 25 hours away (a day with a time change), so the page's reset timer
// fires; each section then loads again.
// Today's own subscription, for the feed's nudges: on a phone the board isn't on Today, so it's the page's only
// listener. While the channel is down the feed says so, and once it's back the feed is fetched again (M11 H6;
// docs/milestones/M14-14b-2c-review-items.md, item 7).
test("a reconnect on Today shows the pause in the feed and fetches it again", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 360, height: 800 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "rt");
  await openBoard(page, "/");
  execSync("docker restart supabase_realtime_plor", { stdio: "ignore" });
  const paused = page.getByRole("region", { name: "Feed" }).locator("xpath=..").getByText("Live updates paused, reconnecting…");
  await expect(paused).toBeVisible();
  // Waited for only once the channel is down, so the feed's loads as the page starts can't count (the 14b-2c-4 review).
  const refetch = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/feed");
  await refetch;
  await expect(paused).toBeHidden();
});

// One Realtime socket per page, however many parts listen (docs/milestones/M14-14b-2b-1-shell.md): from 1200px Today
// has its own subscription and the board's, and still opens one (14b-2c-4, item 35).
test("Today opens one Realtime socket from 1200px", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "rs");
  const sockets: string[] = [];
  page.on("websocket", (ws) => void (ws.url().includes("/realtime/v1") && sockets.push(ws.url())));
  await openBoard(page, "/");
  await expect(page.getByRole("region", { name: "Friends today" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(sockets).toHaveLength(1);
});

test("the reset reloads every section of Today", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.clock.install();
  await page.goto("/");
  await signInAndPick(page, "m");
  await openBoard(page, "/");
  await expect(page.getByRole("region", { name: "Feed" }).getByText("No comments yet.")).toBeVisible();
  const reloads = ["/api/run", "/api/feed", "/api/leaderboard/yesterday"].map((path) =>
    page.waitForRequest((r) => new URL(r.url()).pathname === path),
  );
  await page.clock.fastForward("25:00:00");
  await Promise.all(reloads);
});

test("the reset reloads the Friends tab", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.clock.install();
  await page.goto("/friends");
  await signInAndPick(page, "n");
  // The page sets its reset timer once the run's state says how long is left, so the clock moves only after that.
  const timed = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/run");
  await openBoard(page);
  await timed;
  await expect(page.getByRole("region", { name: "Friends leaderboard" })).toBeVisible();
  // Three parts of the page read the run (the clock bar, the feed's column and the tab), so the first answer isn't
  // necessarily the tab's: the clock moves only once every first load is answered (14b-6a, where the frame's parts
  // started asking first).
  await page.waitForLoadState("networkidle");
  const reloads = ["/api/run", "/api/board", "/api/leaderboard"].map((path) => page.waitForRequest((r) => new URL(r.url()).pathname === path));
  await page.clock.fastForward("25:00:00");
  await Promise.all(reloads);
});

// A question in play at midnight isn't interrupted (M11 H6; M04 G13): the run goes on to its end, so what the player
// has typed stays, while the rest of the page moves to the new day.
test("the reset leaves a question in play alone", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.clock.install();
  await page.goto("/");
  await signInAndPick(page, "q");
  await openBoard(page, "/updraft");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByLabel("Your answer").fill("half typ");
  // Past the reset. While the run is in progress the game screen shows only the game (M14 14b-6c, answer 23), so
  // nothing else on it moves to the new day until the run ends; this used to wait for the stats card's reload as
  // the sign the reset had fired, and that card is now hidden. fastForward runs every timer due, the reset's among
  // them; "the reset reloads every section of Today" checks the reset's own reloads.
  await page.clock.fastForward("25:00:00");
  await expect(page.getByLabel("Your answer")).toHaveValue("half typ");
});
