// The account page (docs/milestones/M12-account.md, 12a; A1): reached from the home page, it shows the player's
// username and all-time points and holds the display name, friends and invite link. Opened signed out, it asks for
// sign-in first. The home page has the invite link too, without Reset (docs/milestones/M12-12f-review-fixes.md, F1).
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick, forwardPlayerIp } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

test("the account page holds the account, and the home page links to it", async ({ browser }) => {
  const signedOut = await (await browser.newContext()).newPage();
  await forwardPlayerIp(signedOut, `${RUN}-typo@example.test`);
  await signedOut.goto("/account");
  await expect(signedOut.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
  // A mistyped email can be fixed from the code form (12b, A6).
  await signedOut.getByLabel("Email").fill(`${RUN}-typo@example.test`);
  await signedOut.getByRole("button", { name: "Email me a sign-in code" }).click();
  await signedOut.getByRole("button", { name: "Use a different email" }).click();
  await expect(signedOut.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();

  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "ac");
  // The home page offers the invite link (12f, F1); the next test makes and uses it.
  const invite = page.getByRole("region", { name: "Friends today" }).getByRole("region", { name: "Invite friends" });
  await expect(invite.getByRole("button", { name: "Make my invite link" })).toBeVisible();
  // The home page's Account section is the link and Sign out, nothing else.
  const home = page.getByRole("region", { name: "Account" });
  await expect(home.getByRole("link", { name: "Your account" })).toBeVisible();
  await expect(home.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.getByLabel(/Display name/)).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Friends", exact: true })).toHaveCount(0);

  await home.getByRole("link", { name: "Your account" }).click();
  await expect(page).toHaveURL(/\/account$/);
  const account = page.getByRole("region", { name: "Your account" });
  await expect(account.getByText(`Username: ac${RUN}`)).toBeVisible();
  await expect(account.getByText("All-time points: 0 points")).toBeVisible();
  await expect(account.getByRole("button", { name: "Make my invite link" })).toBeVisible();
  await account.getByLabel(/Display name/).fill("Ace");
  await account.getByRole("button", { name: "Save" }).click();
  await expect(account.getByRole("button", { name: "Clear" })).toBeVisible();
  // Reloaded, the page reads the saved name back.
  await page.reload();
  const reloaded = page.getByRole("region", { name: "Your account" });
  await expect(reloaded.getByLabel(/Display name/)).toHaveValue("Ace");

  // The username changes once, and the page says when it can change again (12b, A2). Typed in upper case, it's
  // lower-cased like sign-up's box (12f, F4).
  await reloaded.getByLabel("New username").fill(`AD${RUN.toUpperCase()}`);
  await reloaded.getByRole("button", { name: "Change username" }).click();
  await expect(reloaded.getByText(`Username: ad${RUN}`)).toBeVisible();
  await expect(reloaded.getByText(/^You can change it again on /)).toBeVisible();
});

// Deleting the account (12c, A4): the button waits for the player's own username, and deleting signs them out.
test("a player deletes their account from the account page", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  await signInAndPick(page, "dx");
  await page.goto("/account");
  const account = page.getByRole("region", { name: "Your account" });
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

// A friend added from the home page's invite link (12f, F1), and removing them asks first (F3).
test("a player invites a friend from the home page, and removing them asks first", async ({ browser }) => {
  const inviter = await (await browser.newContext()).newPage();
  await inviter.goto("/");
  await signInAndPick(inviter, "iv");
  const board = inviter.getByRole("region", { name: "Friends today" });
  await expect(board.getByText("Send a friend your invite link to see their runs here.")).toBeVisible();
  await board.getByRole("button", { name: "Make my invite link" }).click();
  const invite = board.getByRole("region", { name: "Invite friends" });
  const link = await invite.locator("code").innerText();
  // With a link shown, there's no Reset on the home page that would break a link already sent (F1).
  await expect(invite.getByRole("button", { name: "Share" })).toBeVisible();
  await expect(inviter.getByRole("button", { name: "Reset link" })).toHaveCount(0);

  const friend = await (await browser.newContext()).newPage();
  await friend.goto(new URL(link).pathname);
  await signInAndPick(friend, "if");
  await friend.getByRole("button", { name: "Add friend" }).click();
  await expect(friend.getByRole("heading", { name: `You and iv${RUN} are now friends.` })).toBeVisible();

  await inviter.goto("/account");
  const friends = inviter.getByRole("region", { name: "Friends", exact: true });
  const row = friends.getByRole("listitem").filter({ hasText: `if${RUN}` });
  await expect(row).toBeVisible();
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
