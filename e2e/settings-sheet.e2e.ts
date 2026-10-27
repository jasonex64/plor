// 14b-2c-2, the settings sheet's review items (docs/milestones/M14-14b-2c-review-items.md): only a press that starts
// and ends on the dimmed page closes it; the account's forms start again closed each time it opens; and a theme shows
// at once while it saves, its radio still enabled and focused, a refused one going back to the saved theme.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

async function player(browser: Browser, name: string, viewport: { width: number; height: number }): Promise<Page> {
  const page = await (await browser.newContext({ viewport, colorScheme: "light" })).newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  return page;
}

const sheetOf = (page: Page) => page.getByRole("dialog", { name: "Settings" });

// Item 26.
test("a text selection dragged onto the dimmed page, or a tap on the panel's border, leaves the sheet open", async ({ browser }) => {
  const page = await player(browser, "ya", { width: 360, height: 800 });
  await page.getByRole("banner").getByRole("button", { name: "Settings" }).click();
  const sheet = sheetOf(page);
  await sheet.getByRole("button", { name: "Set display name" }).click();
  const box = sheet.getByLabel(/^Display name/);
  await box.fill("a draft to keep");
  const at = (await box.boundingBox())!;
  await page.mouse.move(at.x + 10, at.y + at.height / 2);
  await page.mouse.down();
  await page.mouse.move(180, 28, { steps: 5 });
  await page.mouse.up();
  await expect(sheet).toBeVisible();
  await expect(box).toHaveValue("a draft to keep");

  // From 768px the panel's 1px left border is the dialog's own: a tap there is on the panel, not the page.
  await page.setViewportSize({ width: 1440, height: 900 });
  const panel = (await sheet.boundingBox())!;
  await page.mouse.click(panel.x + 0.5, 450);
  await expect(sheet).toBeVisible();
  await page.mouse.click(500, 450);
  await expect(sheet).toBeHidden();
});

// Item 27.
test("the account's forms are closed again, with no draft, when the sheet opens again", async ({ browser }) => {
  const page = await player(browser, "yb", { width: 360, height: 800 });
  const gear = page.getByRole("banner").getByRole("button", { name: "Settings" });
  await gear.click();
  const sheet = sheetOf(page);
  await sheet.getByRole("button", { name: "Delete…" }).click();
  await sheet.getByLabel("Type your username to confirm").fill("half typed");
  await sheet.getByRole("button", { name: "Change username" }).click();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await gear.click();
  await expect(sheet.getByLabel("Type your username to confirm")).toHaveCount(0);
  await expect(sheet.getByRole("button", { name: "Delete…" })).toBeVisible();
  await expect(sheet.getByLabel("New username")).toHaveCount(0);
});

// Item 33.
test("a picked theme shows at once while it saves, its radio enabled and focused, and a refused one goes back", async ({ browser }) => {
  const page = await player(browser, "yc", { width: 360, height: 800 });
  await page.getByRole("banner").getByRole("button", { name: "Settings" }).click();
  const group = sheetOf(page).getByRole("group", { name: "Theme" });
  const theme = () => page.evaluate(() => document.documentElement.getAttribute("data-theme"));

  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/profile/settings", async (route) => {
    await held;
    await route.continue();
  });
  const ink = group.getByRole("radio", { name: "Ink", exact: true });
  // A tile is the label around its radio; has: matches inside each label, so the radio is named from the page.
  const tile = (name: string) => group.locator("label", { has: page.getByRole("radio", { name, exact: true }) });
  await tile("Ink").click();
  // Still saving: the page is Ink already, and the radio is checked, enabled and keeps the focus.
  await expect.poll(theme).toBe("ink");
  await expect(ink).toBeChecked();
  await expect(ink).toBeEnabled();
  await expect(ink).toBeFocused();
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/profile/settings") && r.ok());
  release();
  await saved;
  await page.unroute("**/api/profile/settings");

  // A refused save shows its error, and the radio and the page go back to the saved theme.
  await page.route("**/api/profile/settings", (route) => route.fulfill({ status: 500, contentType: "application/json", body: '{"ok":false,"error":"internal"}' }));
  await tile("Sky").click();
  await expect(sheetOf(page).getByRole("alert")).toBeVisible();
  await expect(ink).toBeChecked();
  await expect.poll(theme).toBe("ink");
});

// Item 33, with two saves: another setting's reply landing while a theme waits to save doesn't put the page back (the
// 14b-2c-2 review). The saves go one after another, so the theme's is sent only once the switch's reply is in.
test("a switch's reply landing before a picked theme is saved leaves the page on the picked theme", async ({ browser }) => {
  const page = await player(browser, "yd", { width: 360, height: 800 });
  await page.getByRole("banner").getByRole("button", { name: "Settings" }).click();
  const sheet = sheetOf(page);
  const group = sheet.getByRole("group", { name: "Theme" });
  const theme = () => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const gates: (() => void)[] = [];
  await page.route("**/api/profile/settings", async (route) => {
    await new Promise<void>((resolve) => gates.push(resolve));
    await route.continue();
  });

  await sheet.getByRole("switch", { name: /Skip the game screen/ }).click();
  await expect.poll(() => gates.length).toBe(1);
  await group.locator("label", { has: page.getByRole("radio", { name: "Ink", exact: true }) }).click();
  await expect.poll(theme).toBe("ink");
  const switchSaved = page.waitForResponse((r) => r.url().endsWith("/api/profile/settings") && r.ok());
  gates[0]();
  await switchSaved;
  // The switch's reply is in (the theme's save is sent after it): the page is still Ink.
  await expect.poll(() => gates.length).toBe(2);
  expect(await theme()).toBe("ink");
  gates[1]();
  await expect(group.getByRole("radio", { name: "Ink", exact: true })).toBeChecked();
});
