// M17 17a, friend requests and blocks on the screens (docs/milestones/M17-profiles-and-friend-requests.md, 17a, D7):
// two players in two browsers. Sending has no screen until 17b's search, so each send is the player's own request to
// the route, from their signed-in page; everything after it is done on the screens: the Friends tab's count, Accept,
// Cancel's list, Block on a friend, Decline and block, and Settings' blocked list with Unblock.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { PROTOCOL_VERSION } from "../src/lib/protocol";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

const A = `qa${RUN}`;
const B = `qb${RUN}`;

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
  await signInAndPick(page, "qa");
  await other.goto("/friends");
  await signInAndPick(other, "qb");
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

  // A blocks B from the friends list, after the question: the friendship ends for both.
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain(`Block ${B}?`);
    void dialog.accept();
  });
  await friends(page).getByRole("button", { name: "Block" }).click();
  await expect(friends(page).getByText("No friends yet.")).toBeVisible();
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
  await signInAndPick(page, "qc");
  await other.goto("/friends");
  await signInAndPick(other, "qd");
  await send(other, `qc${RUN}`);
  await page.reload();
  await expect(tab(page)).toHaveAccessibleName("Friends 1 friend request");
  page.once("dialog", (dialog) => void dialog.accept());
  await requests(page).getByRole("button", { name: "Decline and block" }).click();
  await expect(requests(page)).toHaveCount(0);
  await expect(tab(page)).toHaveAccessibleName("Friends");
  await expect((await blockedList(page)).getByRole("listitem")).toContainText([`qd${RUN}`]);
  // The blocked sender's page reads as if nothing happened.
  await other.reload();
  await expect(requests(other).getByRole("list", { name: "Requests you sent" }).getByRole("listitem")).toContainText([`qc${RUN}`]);
  await other.context().close();
});
