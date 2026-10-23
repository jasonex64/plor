// Groups with two real browsers (docs/milestones/M10-groups.md, 10b to 10d; G7): one player creates a group in the
// home page's Groups section and copies its invite link from the group's page; a second opens the link signed out,
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

test("a group is made on the home page and joined by its link", async ({ browser }) => {
  const creator = await (await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] })).newPage();
  await creator.goto("/");
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
  const members = joiner.getByRole("region", { name: "Group" }).getByRole("listitem");
  await expect(members).toHaveText([`ga${RUN} (creator)`, `gb${RUN}`]);
  // Neither has points this week: a tie, by name, with the viewer marked (10c).
  const board = joiner.getByRole("region", { name: "Group leaderboard" }).getByRole("region", { name: "This week" });
  await expect(board.getByRole("listitem")).toHaveText([`ga${RUN}: 0 points`, `gb${RUN} (you): 0 points`]);

  // The group is on the creator's home page too.
  await creator.goto("/");
  await expect(creator.getByRole("region", { name: "Groups" }).getByRole("link", { name: "Book Club" })).toBeVisible();

  // Both are caught on question 1 (10d). The joiner's comment in the group's thread reaches the creator's open group
  // page without a reload (G5), and the joiner's friends thread on the home page doesn't have it (G4).
  for (const page of [creator, joiner]) {
    await page.goto("/");
    await page.getByRole("button", { name: "Start today's puzzle" }).click();
    await page.getByLabel("Your answer").fill(puzzle.hostAnswer);
    await page.getByRole("button", { name: "Answer" }).click();
    await expect(page.getByText(/^You survived 0 of 7 questions/)).toBeVisible();
  }
  const joined = creator.waitForEvent("websocket", (ws) => ws.url().includes("/realtime/v1")).then((ws) =>
    ws.waitForEvent("framereceived", { predicate: (f) => String(f.payload).includes("phx_reply") && String(f.payload).includes('"status":"ok"') && String(f.payload).includes("board:") }),
  );
  await creator.goto(groupUrl);
  await joined;
  const creatorThread = creator.getByRole("region", { name: "Comments" });
  await expect(creatorThread.getByText("No comments yet.")).toBeVisible();

  const body = `group only ${RUN}`;
  await joiner.goto(groupUrl);
  await joiner.getByLabel("Comment", { exact: true }).fill(body);
  await joiner.getByRole("button", { name: "Post" }).click();
  await expect(joiner.getByRole("region", { name: "Comments" }).getByRole("listitem").filter({ hasText: body })).toBeVisible();
  await expect(creatorThread.getByRole("listitem").filter({ hasText: body })).toBeVisible();

  await joiner.goto("/");
  await expect(joiner.getByRole("region", { name: "Comments" }).getByText("No comments yet.")).toBeVisible();
});
