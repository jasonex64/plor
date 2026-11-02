// 14b-22, settings and invites (docs/milestones/M14-14b-22-settings-and-invites.md): the invite link is made before
// the first tap wherever Invite shows, every Invite button shares the same live link, a refused share sheet shows the
// link to copy; the settings sheet doesn't close on a keyboard click, a switch doesn't flick back, a late refusal
// shows; your own invite link never says a friend invited you.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, emailedCode, forwardPlayerIp, sharedLink, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

const sheetOf = (page: Page) => page.getByRole("dialog", { name: "Settings" });
async function openSheet(page: Page) {
  await page.getByRole("button", { name: "Settings" }).filter({ visible: true }).click();
  await expect(sheetOf(page)).toBeVisible();
}

test("the invite link is made before the first tap, which shares it at once", async ({ page }) => {
  const made: number[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname === "/api/friends/invite") made.push(Date.now());
  });
  await page.goto("/friends");
  await signInAndPick(page, "ja");
  const button = page.getByRole("region", { name: "Invite friends" }).getByRole("button", { name: "Invite a friend" });
  await expect(button).toBeEnabled();
  await expect.poll(() => made.length).toBe(1);
  const link = await sharedLink(page, button);
  expect(link).toMatch(/\/i\/[A-Za-z0-9_-]{10}$/);
  // The tap made nothing.
  expect(made.length).toBe(1);
});

test("every Invite button shares the same live link, after a Reset too", async ({ page }) => {
  test.slow();
  // Today's invite card is on phones (src/app/board.tsx, FriendsInviteCard).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await signInAndPick(page, "jb");
  const card = page.getByRole("region", { name: "Plor is better with friends" });
  await expect(card).toBeVisible();
  const first = await sharedLink(page, card.getByRole("button", { name: "Invite a friend" }));
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Friends" }).click();
  // The friends list's, the one with Reset.
  const list = page.getByRole("region", { name: "Invite friends" }).filter({ has: page.getByRole("button", { name: "Reset link" }) });
  expect(await sharedLink(page, list.getByRole("button", { name: "Invite a friend" }))).toBe(first);
  await list.getByRole("button", { name: "Reset link" }).click();
  await expect(page.getByText("New link made. The old one no longer works.")).toBeVisible();
  const reset = await sharedLink(page, list.getByRole("button", { name: "Invite a friend" }));
  expect(reset).not.toBe(first);
  // Back on Today, kept in the page from before, its card shares the new link (the clipboard emptied first, so the
  // link read back is the card's).
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Today" }).click();
  await page.evaluate(() => navigator.clipboard.writeText(""));
  expect(await sharedLink(page, card.getByRole("button", { name: "Invite a friend" }))).toBe(reset);
});

test("a refused share sheet shows the link to copy", async ({ page }) => {
  // Safari's refusal when the tap's activation is spent (MDN, Navigator.share: NotAllowedError).
  await page.addInitScript(() => {
    navigator.share = () => Promise.reject(new DOMException("The request is not allowed.", "NotAllowedError"));
  });
  await page.goto("/friends");
  await signInAndPick(page, "jc");
  await page.getByRole("region", { name: "Invite friends" }).getByRole("button", { name: "Invite a friend" }).click();
  await expect(page.getByLabel("Copy it from here")).toHaveValue(/\/i\/[A-Za-z0-9_-]{10}$/);
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
});

// The two guards on the dimmed page's close, each on its own (14b-22 review), with the plain tap that does close first.
// Events dispatched on the dialog at a point outside the sheet's box, as the browser sends them.
const onDimmed = (page: Page, events: { type: string; detail?: number }[]) =>
  sheetOf(page).evaluate((dialog, events) => {
    const at = { clientX: 2, clientY: 2, bubbles: true, pointerId: 1, pointerType: "touch" };
    for (const e of events)
      dialog.dispatchEvent(e.type === "click" ? new MouseEvent("click", { ...at, detail: e.detail ?? 1 }) : new PointerEvent(e.type, at));
  }, events);

test("a tap on the dimmed page closes the sheet, but not a press that became a scroll", async ({ page }) => {
  await page.goto("/me");
  await signInAndPick(page, "jd");
  await openSheet(page);
  await onDimmed(page, [{ type: "pointerdown" }, { type: "click" }]);
  await expect(sheetOf(page)).toBeHidden();
  await openSheet(page);
  await onDimmed(page, [{ type: "pointerdown" }, { type: "pointercancel" }, { type: "click" }]);
  await expect(sheetOf(page)).toBeVisible();
});

test("a keyboard click, with no count, never closes the sheet", async ({ page }) => {
  await page.goto("/me");
  await signInAndPick(page, "jj");
  await openSheet(page);
  await onDimmed(page, [{ type: "pointerdown" }, { type: "click", detail: 0 }]);
  await expect(sheetOf(page)).toBeVisible();
});

test("a switch toggled on, off, on stays on while the answers land", async ({ page }) => {
  await page.goto("/me");
  await signInAndPick(page, "je");
  const gates: (() => void)[] = [];
  await page.route("**/api/profile/settings", async (route) => {
    await new Promise<void>((r) => gates.push(r));
    await route.continue();
  });
  await openSheet(page);
  const toggle = sheetOf(page).getByRole("switch", { name: /Numbers on the calendar/ });
  const start = await toggle.isChecked();
  await toggle.click();
  await toggle.click();
  await toggle.click();
  const last = !start;
  await expect(toggle).toBeChecked({ checked: last });
  // The saves go one after another: each is let through, its answer lands, and the switch stays on the last pick.
  for (let i = 0; i < 3; i++) {
    await expect.poll(() => gates.length).toBeGreaterThanOrEqual(i + 1);
    gates[i]();
    await page.waitForTimeout(300);
    await expect(toggle).toBeChecked({ checked: last });
  }
});

test("a username refused after the sheet closed shows its reason", async ({ browser }) => {
  test.slow();
  const other = await (await browser.newContext()).newPage();
  await other.goto("/");
  await signInAndPick(other, "jf");
  const page = await (await browser.newContext()).newPage();
  await page.goto("/me");
  await signInAndPick(page, "jg");
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/api/profile/username", async (route) => {
    await held;
    await route.continue();
  });
  await openSheet(page);
  const sheet = sheetOf(page);
  await sheet.getByRole("button", { name: "Change username" }).click();
  await sheet.getByLabel("New username").fill(`jf${RUN}`);
  await sheet.getByRole("button", { name: "Change username" }).click();
  await sheet.getByRole("button", { name: "Close settings" }).click();
  await expect(sheet).toBeHidden();
  release();
  const alert = page.getByRole("alert").filter({ hasText: "That username is taken" });
  await expect(alert).toBeVisible();
  await alert.getByRole("button", { name: "Close" }).click();
  await expect(alert).toHaveCount(0);

  // With the sheet still open, the refusal is the form's own.
  await page.unroute("**/api/profile/username");
  await openSheet(page);
  await sheet.getByRole("button", { name: "Change username" }).click();
  await sheet.getByLabel("New username").fill(`jf${RUN}`);
  await sheet.getByRole("button", { name: "Change username" }).click();
  await expect(sheet.getByText("That username is taken")).toBeVisible();
});

test("signing out and in again on the same tab, the Invite button works again", async ({ page }) => {
  test.slow();
  await page.goto("/friends");
  await signInAndPick(page, "jk");
  const button = page.getByRole("region", { name: "Invite friends" }).getByRole("button", { name: "Invite a friend" });
  await expect(button).toBeEnabled();
  await openSheet(page);
  await sheetOf(page).getByRole("button", { name: "Sign out" }).click();
  const email = `${RUN}-jk@example.test`;
  // The first sign-in's email is still in the inbox: wait for the second before reading the newest code.
  const mails = async () =>
    (await (await fetch(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json()).messages.length as number;
  const before = await mails();
  await forwardPlayerIp(page, email);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await expect.poll(mails).toBeGreaterThan(before);
  await page.getByLabel("Code").fill(await emailedCode(email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(button).toBeEnabled();
});

test("your own invite link never shows the friend-invited line; a friend's does once known", async ({ browser }) => {
  const owner = await (await browser.newContext()).newPage();
  await owner.goto("/friends");
  await signInAndPick(owner, "jh");
  const link = new URL(await sharedLink(owner, owner.getByRole("button", { name: "Invite a friend" }))).pathname;
  const line = (p: Page) => p.getByText("A friend invited you");
  // The preview held back: the owner never sees the line, even before the page knows the link is theirs.
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  await owner.route("**/api/friends/preview**", async (route) => {
    await held;
    await route.continue();
  });
  await owner.goto(link);
  await expect(owner.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(line(owner)).toBeHidden();
  release();
  await expect(owner.getByText("Send it to a friend.")).toBeVisible();
  await expect(line(owner)).toBeHidden();

  const friend = await (await browser.newContext()).newPage();
  await friend.goto(link);
  await expect(line(friend)).toBeVisible();
  await signInAndPick(friend, "ji");
  await expect(friend.getByRole("button", { name: "Add friend" })).toBeVisible();
  await expect(line(friend)).toBeVisible();
});
