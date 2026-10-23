// The account page (docs/milestones/M12-account.md, 12a; A1): reached from the home page, it shows the player's
// username and all-time points and holds the display name, friends and invite link, which the home page no longer
// does. Opened signed out, it asks for sign-in first.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

test("the account page holds the account, and the home page links to it", async ({ browser }) => {
  const signedOut = await (await browser.newContext()).newPage();
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

  // The username changes once, and the page says when it can change again (12b, A2).
  await reloaded.getByLabel("New username").fill(`ad${RUN}`);
  await reloaded.getByRole("button", { name: "Change username" }).click();
  await expect(reloaded.getByText(`Username: ad${RUN}`)).toBeVisible();
  await expect(reloaded.getByText(/^You can change it again on /)).toBeVisible();
});
