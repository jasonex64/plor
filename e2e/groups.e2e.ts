// Groups with two real browsers (docs/milestones/M10-groups.md, 10b and 10c; G7): one player creates a group in the
// home page's Groups section and copies its invite link from the group's page; a second opens the link signed out,
// signs in, picks a username, joins, and lands on the group's page with both members listed and on its leaderboard.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

test.afterAll(async () => {
  // Deleting the players deletes their memberships, and the last member's going deletes the group.
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
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
});
