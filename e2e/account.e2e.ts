// The account (docs/milestones/M12-account.md, 12a; A1), in the settings sheet since M14 14a-3b
// (docs/milestones/M14-14a-3b-settings.md): reached from the gear, it holds the username, display name, Sign out and
// Delete account; Me shows the points. Opened signed out, a tab asks for sign-in first. The friends list and the invite
// link with Reset are on the Friends tab; Today's board has the invite link too, without Reset (M12 12f, F1).
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick, forwardPlayerIp } from "./players";

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

  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
  const { rows } = await DB.query("select from auth.users where email = $1", [`${RUN}-dx@example.test`]);
  expect(rows).toHaveLength(0);
});

// A friend added from the invite link on the Friends tab, which holds the friends list with the link and its Reset
// (M14 14a-3b, criterion 7), and removing them asks first (F3). Today's board, from 768px, has the link without Reset
// (12f, F1).
test("a player invites a friend from the Friends tab, and removing them asks first", async ({ browser }) => {
  const inviter = await (await browser.newContext()).newPage();
  await inviter.goto("/friends");
  await signInAndPick(inviter, "iv");
  const board = inviter.getByRole("region", { name: "Friends today" });
  // With no friends, the board says L31's friendlier line (docs/milestones/M14-14a-3a-me.md, criterion 7).
  await expect(board.getByRole("heading", { name: "Plor is better with friends" })).toBeVisible();
  // The link shows once on this tab: in the friends list, not on the board.
  await expect(board.getByRole("region", { name: "Invite friends" })).toHaveCount(0);
  const friends = inviter.getByRole("region", { name: "Your friends" });
  await expect(friends.getByText("No friends yet. Send someone your invite link.")).toBeVisible();
  await friends.getByRole("button", { name: "Make my invite link" }).click();
  const invite = friends.getByRole("region", { name: "Invite friends" });
  const link = await invite.locator("code").innerText();
  await expect(invite.getByRole("button", { name: "Share" })).toBeVisible();
  await expect(invite.getByRole("button", { name: "Reset link" })).toBeVisible();
  // Today's board, from 768px, has the same link and no Reset that would break a link already sent (F1).
  const wide = await (await inviter.context().browser()!.newContext({ viewport: { width: 1440, height: 900 }, storageState: await inviter.context().storageState() })).newPage();
  await wide.goto("/");
  const todayInvite = wide.getByRole("region", { name: "Friends today" }).getByRole("region", { name: "Invite friends" });
  await expect(todayInvite.locator("code")).toHaveText(link);
  await expect(wide.getByRole("button", { name: "Reset link" })).toHaveCount(0);

  const friend = await (await browser.newContext()).newPage();
  await friend.goto(new URL(link).pathname);
  await signInAndPick(friend, "if");
  await friend.getByRole("button", { name: "Add friend" }).click();
  await expect(friend.getByRole("heading", { name: `You and iv${RUN} are now friends.` })).toBeVisible();

  await inviter.reload();
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
  expect(asked).toContain(`Remove if${RUN} as a friend?`);
  await inviter.reload();
  await expect(row).toBeVisible();
  inviter.once("dialog", (d) => void d.accept());
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(friends.getByText("No friends yet. Send someone your invite link.")).toBeVisible();
});
