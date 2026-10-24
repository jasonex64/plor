// Signing players in on a page, shared by the e2e tests: an emailed code read from the local Mailpit inbox, then a
// username. Every player's email starts with RUN, so each file's afterAll can delete its players.
import { createHash } from "node:crypto";
import { expect, type Page } from "@playwright/test";

const MAILPIT = "http://127.0.0.1:54324";
export const RUN = Date.now().toString(36);

async function emailedCode(email: string): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(async () => {
      const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json();
      if (!list.messages?.length) return false;
      const message = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json();
      code = /<strong>(\d+)<\/strong>/.exec(message.HTML)?.[1];
      return Boolean(code);
    })
    .toBe(true);
  return code!;
}

// Gives the page's sign-in requests a player IP of their own, as Vercel would forward it, so the sign-in limits
// (docs/milestones/M12-12e-sign-in-limits.md) count each test player apart. 10.0.0.0/8 is private: no real player has one.
export async function forwardPlayerIp(page: Page, email: string): Promise<void> {
  const [a, b, c] = createHash("sha256").update(email).digest();
  await page.route("**/api/auth/email**", (route) =>
    route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": `10.${a}.${b}.${c}` } }),
  );
}

// Signs in on the page it's on (home or an invite link) and picks a username.
export async function signInAndPick(page: Page, name: string): Promise<void> {
  const email = `${RUN}-${name}@example.test`;
  await forwardPlayerIp(page, email);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await page.getByLabel("Code").fill(await emailedCode(email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Username").fill(`${name}${RUN}`);
  await page.getByRole("button", { name: "Save" }).click();
}
