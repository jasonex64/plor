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
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

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
  // The invite link is on the Friends tab's board (M12 12f, F1) as well as the Me tab (12a).
  const invite = watcher.getByRole("region", { name: "Friends today" }).getByRole("region", { name: "Invite friends" });
  await invite.getByRole("button", { name: "Make my invite link" }).click();
  const link = await invite.locator("code").textContent();

  await player.goto(new URL(link!).pathname);
  await signInAndPick(player, "p");
  await expect(player.getByRole("heading", { name: `Add ${watcherName} as a friend?` })).toBeVisible();
  await player.getByRole("button", { name: "Add friend" }).click();
  await expect(player.getByRole("heading", { name: `You and ${watcherName} are now friends.` })).toBeVisible();

  await openBoard(watcher);
  // The plain list of friends, not the lists inside "where everyone ended".
  const row = watcher.getByRole("region", { name: "Friends today" }).locator(":scope > ul > li").filter({ hasText: playerName });
  await expect(row).toHaveText(`${playerName}: hasn't played yet`);

  // The player starts and is caught on question 1; the watcher's page shows the start without a reload, and the
  // watcher, who hasn't played, sees nothing more: not the question, not that the run is over (12d).
  const started = `${playerName}: started (you'll see how it's going once you finish)`;
  await player.goto("/");
  await player.getByRole("button", { name: "Start today's puzzle" }).click();
  await expect(row).toHaveText(started);
  await player.getByLabel("Your answer").fill(hostAnswer);
  await player.getByRole("button", { name: "Answer" }).click();
  await expect(player.getByText("You survived 0 of 7 questions")).toBeVisible();
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
  await watcher.getByRole("button", { name: "Start today's puzzle" }).click();
  await watcher.getByLabel("Your answer").fill(hostAnswer);
  await watcher.getByRole("button", { name: "Answer" }).click();
  // Caught on question 1: no survived answers, so no rarity bonus yet (M09 9a's result line).
  await expect(watcher.getByText("You survived 0 of 7 questions and scored 0 points, plus a rarity bonus of about 0.")).toBeVisible();
  // Above the game, the streak: today is the watcher's first day (M11 H4). Beside the one answer, its share: two players
  // answered question 1, under the minimum of 5 (H5).
  await expect(watcher.getByText("Streak: 1 day played in a row")).toBeVisible();
  await expect(watcher.getByText(/· too few players yet$/)).toBeVisible();
  // Yesterday's standings, friends by default (H7): neither played yesterday.
  const yesterday = watcher.getByRole("region", { name: "Yesterday" });
  await expect(yesterday.getByRole("button", { name: "Friends" })).toHaveAttribute("aria-pressed", "true");
  await expect(yesterday.getByRole("listitem")).toHaveText([`${playerName}: 0 points`, `${watcherName} (you): 0 points`]);
  await openBoard(watcher);
  // The friends leaderboard (M09 9b; weekly since M10 10a) lists both with no points yet this week, since today's
  // count once the day is over (D9). Tied on 0, they go by name: the player's "p…" before the watcher's "w…".
  await expect(watcher.getByRole("region", { name: "Friends leaderboard" }).getByRole("region", { name: "This week" }).getByRole("listitem")).toHaveText([
    `${playerName}: 0 points`,
    `${watcherName} (you): 0 points`,
  ]);
  // The row ends with the reaction buttons (M08 8b), which appear only now that the watcher has finished.
  await expect(row).toHaveText(`${playerName}: caught on question 1 by "${hostAnswer}" 👍😂😮😢❤️`);
  const place = watcher.getByRole("region", { name: "Where everyone ended" }).locator("details");
  await expect(place).toHaveCount(1);
  await expect(place.locator("summary")).toHaveText(`Caught on question 1: You, ${playerName}`);
  await place.locator("summary").click();
  await expect(place.getByRole("listitem")).toHaveText(["You", playerName]);

  // The watcher reacts to the friend's run by tapping (M08 8b): another emoji replaces the first, and the same one
  // again removes it. The player's open board shows each change without a reload (8d).
  await openBoard(player);
  const thumbs = row.getByRole("button", { name: "👍" });
  const heart = row.getByRole("button", { name: "❤️" });
  await thumbs.click();
  await expect(thumbs).toHaveAttribute("aria-pressed", "true");
  await expect(thumbs).toHaveText("👍 1");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(heart).toHaveText("❤️ 1");
  await expect(thumbs).toHaveAttribute("aria-pressed", "false");
  await expect(thumbs).toHaveText("👍");
  await expect(player.getByText("Reactions on your run: ❤️ 1")).toBeVisible();
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect(heart).toHaveText("❤️");
  await expect(player.getByText("Reactions on your run")).toHaveCount(0);

  // The player comments, and it reaches the watcher's open page; the watcher's reaction on it reaches the player's
  // (8d). Then the watcher reports it, and it's gone for the watcher at once (8c, D5). Made an admin, the watcher
  // finds it on the reported-comments page and deletes it, and the player's open page loses it too.
  await openBoard(player, "/");
  await openBoard(watcher, "/");
  const body = `report me ${RUN}`;
  await player.getByLabel("Comment to your friends").fill(body);
  await player.getByRole("button", { name: "Post" }).click();
  const playerComment = player.getByRole("region", { name: "Feed" }).getByRole("listitem").filter({ hasText: body });
  await expect(playerComment).toBeVisible();
  const watcherComment = watcher.getByRole("region", { name: "Feed" }).getByRole("listitem").filter({ hasText: body });
  await expect(watcherComment).toBeVisible();
  await watcherComment.getByRole("button", { name: "😂" }).click();
  await expect(playerComment.getByRole("button", { name: "😂" })).toHaveText("😂 1");
  await watcherComment.getByRole("button", { name: "Report" }).click();
  await expect(watcher.getByRole("region", { name: "Feed" }).getByText("No comments yet.")).toBeVisible();
  await DB.query("insert into private.admin (user_id) select id from auth.users where email = $1", [`${RUN}-w@example.test`]);
  await watcher.goto("/admin/reports");
  const reported = watcher.getByRole("region", { name: "Reported comments" }).getByRole("listitem").filter({ hasText: body });
  await expect(reported).toContainText(`${playerName} (${playerName}) on `);
  await expect(reported).toContainText("1 report, first");
  await reported.getByRole("button", { name: "Delete comment" }).click();
  await expect(watcher.getByText("No reported comments.")).toBeVisible();
  // The deletion's record, with the admin and the author (M12 12d).
  const record = watcher.getByRole("region", { name: "Deleted comments" }).getByRole("listitem").filter({ hasText: body });
  await expect(record).toContainText(`: ${watcherName} deleted ${playerName}'s comment`);
  await expect(player.getByRole("region", { name: "Feed" }).getByText("No comments yet.")).toBeVisible();

  // Every change came over Realtime as a nudge, and no frame either page received holds the comment's text.
  const received = [...framesOf.values()].flat().join("\n");
  expect(received).toContain("comments_changed");
  expect(received).toContain("run_reactions_changed");
  expect(received).not.toContain(body);
});

// After a safe answer, the reveal shows the points it earned and its estimated rarity bonus (M09 9a). The number
// itself is the route test's (src/game/runs.db.test.ts); this checks the reveal shows it.
test("the reveal shows a safe answer's estimated rarity bonus", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "s");
  await page.getByRole("button", { name: "Start today's puzzle" }).click();
  await page.getByLabel("Your answer").fill(safeAnswer);
  await page.getByRole("button", { name: "Answer" }).click();
  await expect(page.getByRole("heading", { name: "Safe!" })).toBeVisible();
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
  await openBoard(page, "/");
  await page.getByRole("button", { name: "Start today's puzzle" }).click();
  await page.getByLabel("Your answer").fill("half typ");
  // Only the reset loads yesterday's standings again, so once that answers, the page has moved to the new day.
  const moved = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/leaderboard/yesterday");
  await page.clock.fastForward("25:00:00");
  await moved;
  await expect(page.getByRole("region", { name: "Yesterday" }).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByLabel("Your answer")).toHaveValue("half typ");
});
