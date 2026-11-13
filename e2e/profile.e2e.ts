// M17 17b, finding a player and their profile on the screens (docs/milestones/M17-profiles-and-friend-requests.md,
// "17b design", Screens): two players in two browsers. One finds the other by username from the Friends page, sees the
// stranger's profile, and sends a request from it; the other accepts from the sender's profile; each then sees the
// friend's fuller profile, reached from the friends list too.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
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

test("a player is found by username, sent a request from their profile, and shows more once a friend", async ({ page, browser }) => {
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
  await expect(page.getByRole("region", { name: "Rarest answers" })).toHaveCount(0);
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

  // Friends now: the calendar, the rarest answers and the last days' chart show, and the tab's count is gone.
  await expect(you(other)).toContainText("You're friends.");
  await expect(other.getByRole("region", { name: "Calendar" })).toBeVisible();
  await expect(other.getByRole("region", { name: "Rarest answers" })).toContainText("None yet.");
  await expect(other.getByText("Questions survived, last 7 days")).toBeVisible();
  await expect(other.getByText(/^Playing since /)).toBeVisible();
  await expect(tab(other)).toHaveAccessibleName("Friends");

  // A reaches B's profile from the friends list, and their own name opens with a way to Me.
  await page.goto("/friends");
  await page.getByRole("region", { name: "Your friends" }).getByRole("link", { name: `${B}'s profile` }).click();
  await expect(page).toHaveURL(new RegExp(`/u/${B}$`));
  await expect(you(page)).toContainText("You're friends.");
  await expect(page.getByRole("region", { name: "Calendar" })).toBeVisible();
  await page.goto(`/u/${A}`);
  await expect(you(page)).toContainText("This is you.");
  await expect(you(page).getByRole("link", { name: "Your Me page" })).toBeVisible();
});
