// The account (docs/milestones/M12-account.md, 12a; A1), in the settings sheet since M14 14a-3b
// (docs/milestones/M14-14a-3b-settings.md): reached from the gear, it holds the username, display name, Sign out and
// Delete account; Me shows the points. Opened signed out, a tab asks for sign-in first. The friends list is on the
// Friends tab.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick, forwardPlayerIp, befriend } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

test("the settings sheet holds the account, and the gear opens it", async ({ browser }) => {
  const signedOut = await (await browser.newContext()).newPage();
  await forwardPlayerIp(signedOut, `${RUN}-typo@example.test`);
  await signedOut.goto("/me");
  await expect(signedOut.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
  // A mistyped email can be fixed from the code form (12b, A6).
  await signedOut.getByLabel("Email").fill(`${RUN}-typo@example.test`);
  await signedOut.getByRole("button", { name: "Email me a sign-in code" }).click();
  await signedOut.getByRole("button", { name: "Use a different email" }).click();
  await expect(signedOut.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();

  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "ac");
  // No tab holds the account's fields or the sheet's buttons until the gear is used.
  await expect(page.getByLabel(/Display name/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeHidden();
  // Me shows the points (M14 14a-3a), and no account section.
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Me" }).click();
  await expect(page).toHaveURL(/\/me$/);
  await expect(page.getByRole("region", { name: "All games" }).getByRole("definition").first()).toHaveText("0");
  await expect(page.getByRole("region", { name: "Your account" })).toHaveCount(0);

  await page.getByRole("button", { name: "Settings" }).click();
  const sheet = page.getByRole("dialog", { name: "Settings" });
  await expect(sheet.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(sheet.getByRole("term").filter({ hasText: "Username" })).toBeVisible();
  await expect(sheet.getByText(`ac${RUN}`)).toBeVisible();
  await expect(sheet.getByText("Not set")).toBeVisible();
  await sheet.getByRole("button", { name: "Set display name" }).click();
  await sheet.getByLabel(/Display name/).fill("Ace");
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect(sheet.getByRole("button", { name: "Change display name" })).toBeVisible();
  await expect(sheet.getByText("Ace", { exact: true })).toBeVisible();
  // Reloaded, the sheet reads the saved name back, and Clear is offered.
  await page.reload();
  await page.getByRole("button", { name: "Settings" }).click();
  await sheet.getByRole("button", { name: "Change display name" }).click();
  await expect(sheet.getByLabel(/Display name/)).toHaveValue("Ace");
  await expect(sheet.getByRole("button", { name: "Clear" })).toBeVisible();
  await sheet.getByRole("button", { name: "Cancel" }).click();

  // The username changes once, and the sheet says when it can change again (12b, A2). Typed in upper case, it's
  // lower-cased like sign-up's box (12f, F4).
  await sheet.getByRole("button", { name: "Change username" }).click();
  await sheet.getByLabel("New username").fill(`AD${RUN.toUpperCase()}`);
  await sheet.getByRole("button", { name: "Change username" }).click();
  await expect(sheet.getByText(`ad${RUN}`, { exact: true })).toBeVisible();
  await expect(sheet.getByText(/^You can change it again on /)).toBeVisible();
});

// Deleting the account (12c, A4): "Delete…" opens the confirm form, whose button waits for the player's own username,
// and deleting signs them out.
test("a player deletes their account from the settings sheet", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "dx");
  await page.getByRole("button", { name: "Settings" }).click();
  const account = page.getByRole("dialog", { name: "Settings" }).getByRole("region", { name: "Delete account" });
  await account.getByRole("button", { name: "Delete…" }).click();
  const button = account.getByRole("button", { name: "Delete my account" });
  await expect(button).toBeDisabled();
  await account.getByLabel(/Type your username/).fill(`other${RUN}`);
  await expect(button).toBeDisabled();
  await account.getByLabel(/Type your username/).fill(`dx${RUN}`);
  await expect(button).toBeEnabled();
  await button.click();

  // Signed out, the front page offers its small Sign in link (docs/milestones/M18-guest-play.md, answer 32).
  const signIn = page.getByRole("link", { name: "Sign in", exact: true });
  await expect(signIn).toBeVisible();
  await page.goto("/");
  await expect(signIn).toBeVisible();
  const { rows } = await DB.query("select from auth.users where email = $1", [`${RUN}-dx@example.test`]);
  expect(rows).toHaveLength(0);
});

// The Friends tab's friends list, where removing a friend asks first (F3). With no friends, the list points to Find a
// player, nothing stands where the invite link was, and an old invite link's address is not found
// (docs/milestones/M17-profiles-and-friend-requests.md, 17c, answer 34).
test("nothing offers an invite link, an old one is not found, and removing a friend asks first", async ({ browser }) => {
  const inviter = await (await browser.newContext()).newPage();
  await inviter.goto("/friends");
  await signInAndPick(inviter, "iv");
  const board = inviter.getByRole("region", { name: "Friends today" });
  // With no friends, the board says L31's friendlier line (docs/milestones/M14-14a-3a-me.md, criterion 7).
  await expect(board.getByRole("heading", { name: "Plor is better with friends" })).toBeVisible();
  await expect(inviter.getByRole("region", { name: "Find a player" })).toBeVisible();
  const friends = inviter.getByRole("region", { name: "Your friends" });
  await expect(friends.getByText("No friends yet. Find a player by their username, above.")).toBeVisible();
  // Nothing on the tab offers an invite link any more.
  await expect(inviter.getByRole("button", { name: /Invite|Reset link/ })).toHaveCount(0);
  // Today's board, from 768px, has nothing where the Invite button was.
  const wide = await (await inviter.context().browser()!.newContext({ viewport: { width: 1440, height: 900 }, storageState: await inviter.context().storageState() })).newPage();
  await wide.goto("/");
  await expect(wide.getByRole("region", { name: "Friends today" }).getByRole("heading", { name: "Friends today" })).toBeVisible();
  await expect(wide.getByRole("region", { name: "Leaderboard" })).toBeVisible();
  await expect(wide.getByRole("main").getByRole("button", { name: /Invite|Reset link/ })).toHaveCount(0);
  await expect(wide.getByRole("main").getByRole("link", { name: "Find a player" })).toHaveCount(0);
  // A friend invite link's address answers 404, whatever its code (the criterion "Invite links removed"), as the older
  // /invite/ address does (M14 14b-3, criterion 5).
  expect((await wide.goto("/i/abcdefgh-_"))!.status()).toBe(404);
  expect((await wide.goto("/invite/abcdefgh-_"))!.status()).toBe(404);
  await wide.context().close();

  const friend = await (await browser.newContext()).newPage();
  await friend.goto("/friends");
  await signInAndPick(friend, "if");
  await befriend(friend, "if", inviter, "iv");

  await inviter.goto("/friends");
  const row = friends.getByRole("listitem").filter({ hasText: `if${RUN}` });
  await expect(row).toBeVisible();
  // The moved list carries the avatar slots (L37).
  await expect(row.locator("[data-initial]")).toHaveAttribute("data-initial", "I");
  // Cancelled, nothing changes. The question is recorded, so a Remove that didn't ask fails here.
  let asked = "";
  inviter.once("dialog", (dialog) => {
    asked = dialog.message();
    void dialog.dismiss();
  });
  await row.getByRole("button", { name: "Remove" }).click();
  expect(asked).toBe(`Remove if${RUN} as a friend? To be friends again, one of you sends a friend request.`);
  await inviter.reload();
  await expect(row).toBeVisible();
  inviter.once("dialog", (d) => void d.accept());
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(friends.getByText("No friends yet. Find a player by their username, above.")).toBeVisible();
});
