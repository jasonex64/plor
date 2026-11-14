// 14b-22, settings and invites (docs/milestones/M14-14b-22-settings-and-invites.md): the settings sheet doesn't close
// on a keyboard click, a switch doesn't flick back, a late refusal shows. Its tests of the friend invite link went
// with the link (docs/milestones/M17-profiles-and-friend-requests.md, 17c).
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";

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
  const toggle = sheetOf(page).getByRole("switch", { name: /Skip the game screen/ });
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
