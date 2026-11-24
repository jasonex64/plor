// M17 17a, friend requests and blocks on the screens (docs/milestones/M17-profiles-and-friend-requests.md, 17a, D7):
// two players in two browsers. Sending has no screen until 17b's search, so each send is the player's own request to
// the route, from their signed-in page; everything after it is done on the screens: the Friends tab's count, Accept,
// Cancel's list, Block on a friend, Decline and block, and Settings' blocked list with Unblock.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { PROTOCOL_VERSION } from "../src/lib/protocol";
import { befriend, RUN, signInAndPick } from "./players";
import { localStack } from "../scripts/slot.ts";

const DB = new Pool({ connectionString: localStack().databaseUrl, max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

const A = `fra${RUN}`;
const B = `frb${RUN}`;

async function send(page: Page, username: string) {
  const response = await page.request.post("/api/friends/requests", { data: { username }, headers: { "x-protocol": String(PROTOCOL_VERSION) } });
  expect(await response.json()).toEqual({ ok: true, state: "sent" });
}
const tab = (page: Page) => page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Friends/ });
const requests = (page: Page) => page.getByRole("region", { name: "Friend requests" });
const friends = (page: Page) => page.getByRole("region", { name: "Your friends" });
async function blockedList(page: Page) {
  await page.getByRole("button", { name: "Settings" }).filter({ visible: true }).click();
  return page.getByRole("dialog", { name: "Settings" }).getByRole("region", { name: "Blocked players" });
}

test("a request shows on the Friends tab and its page, is accepted, and a block ends the friendship until Unblock", async ({ page, browser }) => {
  test.slow();
  const other = await (await browser.newContext()).newPage();
  await page.goto("/friends");
  await signInAndPick(page, "fra");
  await other.goto("/friends");
  await signInAndPick(other, "frb");
  await expect(requests(other)).toHaveCount(0);
  await expect(tab(other)).toHaveAccessibleName("Friends");

  // A sends; B sees the count on the tab and the request on the page when it next loads, A their sent list.
  await send(page, B);
  await other.reload();
  await expect(tab(other)).toHaveAccessibleName("Friends 1 friend request");
  await expect(tab(other)).toContainText("Friends (1)");
  await expect(requests(other).getByRole("list", { name: "Requests to you" }).getByRole("listitem")).toHaveText([new RegExp(`^${A}`)]);
  await page.reload();
  const sentList = requests(page).getByRole("list", { name: "Requests you sent" });
  await expect(sentList.getByRole("listitem")).toContainText([B]);
  await expect(sentList.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(tab(page)).toHaveAccessibleName("Friends");

  // B accepts: the request and the count go, and each is in the other's friends.
  await requests(other).getByRole("button", { name: "Accept" }).click();
  await expect(friends(other).getByRole("listitem")).toContainText([A]);
  await expect(requests(other)).toHaveCount(0);
  await expect(tab(other)).toHaveAccessibleName("Friends");
  await page.reload();
  await expect(friends(page).getByRole("listitem")).toContainText([B]);
  await expect(requests(page)).toHaveCount(0);

  // A blocks B from the friends list, after the question: the friendship ends for both, and B leaves A's live board at
  // once, with no reload (D5).
  const board = page.getByRole("region", { name: "Friends today" });
  await expect(board).toContainText(B);
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain(`Block ${B}?`);
    void dialog.accept();
  });
  await friends(page).getByRole("button", { name: /^Actions for / }).click();
  await friends(page).getByRole("button", { name: "Block" }).click();
  await expect(friends(page).getByText("No friends yet.")).toBeVisible();
  await expect(board).not.toContainText(B);
  await other.reload();
  await expect(friends(other).getByText("No friends yet.")).toBeVisible();

  // Settings lists B as blocked; Unblock empties the list and brings back no friendship.
  const blocked = await blockedList(page);
  await expect(blocked.getByRole("listitem")).toContainText([B]);
  await blocked.getByRole("button", { name: "Unblock" }).click();
  await expect(blocked.getByText("You haven't blocked anyone.")).toBeVisible();
  await page.reload();
  await expect(friends(page).getByText("No friends yet.")).toBeVisible();
  await other.context().close();
});

test("Decline and block takes the request off the blocker's page, and the sender still sees it waiting", async ({ page, browser }) => {
  test.slow();
  const other = await (await browser.newContext()).newPage();
  await page.goto("/friends");
  await signInAndPick(page, "frc");
  await other.goto("/friends");
  await signInAndPick(other, "frd");
  await send(other, `frc${RUN}`);
  await page.reload();
  await expect(tab(page)).toHaveAccessibleName("Friends 1 friend request");
  page.once("dialog", (dialog) => void dialog.accept());
  await requests(page).getByRole("button", { name: "Decline and block" }).click();
  await expect(requests(page)).toHaveCount(0);
  await expect(tab(page)).toHaveAccessibleName("Friends");
  await expect((await blockedList(page)).getByRole("listitem")).toContainText([`frd${RUN}`]);
  // The blocked sender's page reads as if nothing happened.
  await other.reload();
  await expect(requests(other).getByRole("list", { name: "Requests you sent" }).getByRole("listitem")).toContainText([`frc${RUN}`]);
  await other.context().close();
});

// M20 20n-3 (the second look audit's finding 2; answers 79 and 80): on a phone a friend's row is the avatar and name, one
// line, as the link to their profile, and a ⋯ that holds Remove and Block; no Profile button. Sets its own phone size.
test("on a phone a friend's row is their name on one line, the link to their profile, with Remove and Block behind its ⋯", async ({ browser }) => {
  test.slow(); // two sign-ins and a friendship made on the screens, as the test above
  const PHONE = { width: 390, height: 844 };
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await page.goto("/friends");
  await signInAndPick(page, "fre");
  const other = await (await browser.newContext({ viewport: PHONE })).newPage();
  await other.goto("/friends");
  await signInAndPick(other, "frf");
  await befriend(page, "fre", other, "frf");
  const name = "Bartholomew Fitzwilliams";
  await DB.query("update private.profile set display_name = $2 where username = $1", [`frf${RUN}`, name]);
  await page.goto("/friends");

  const row = friends(page).getByRole("listitem");
  const link = row.getByRole("link", { name, exact: true });
  await expect(link).toHaveAttribute("href", `/u/frf${RUN}`);
  // One line: the row is the controls' 44px and its borders and padding, not a name broken a letter a line.
  expect((await row.boundingBox())!.height).toBeLessThan(70);
  expect((await link.getByText(name).boundingBox())!.height).toBeLessThan(30);
  await expect(page.getByRole("link", { name: /profile/i })).toHaveCount(0);
  await expect(row.getByRole("button", { name: "Remove" })).toHaveCount(0);
  await expect(row.getByRole("button", { name: "Block" })).toHaveCount(0);

  const more = row.getByRole("button", { name: `Actions for ${name}`, exact: true });
  await more.click();
  await expect(row.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
  await expect(row.getByRole("button", { name: "Block", exact: true })).toBeVisible();
  // The open menu stays on the screen, with no sideways scroll.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.keyboard.press("Escape");

  await link.click();
  await expect(page).toHaveURL(new RegExp(`/u/frf${RUN}$`));
});
