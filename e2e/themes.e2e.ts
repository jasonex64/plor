// Themes and the About page (docs/milestones/M14-14b-1-themes.md): the settings sheet's six themes, saved on the
// account and painted from this browser's copy before the profile loads; Follow device; sign-out clearing the copy;
// and /about, linked from every footer and the sheet.
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

const background = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const attribute = (page: Page) => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
const copy = (page: Page) => page.evaluate(() => window.localStorage.getItem("plor.theme"));

async function pick(page: Page, theme: string) {
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/profile/settings") && r.ok());
  // The radio is hidden inside its tile, so a player taps the tile.
  const sheet = page.getByRole("dialog", { name: "Settings" });
  await sheet.locator("label", { has: page.getByRole("radio", { name: theme, exact: true }) }).click();
  await saved;
}

// Criteria 2, 3 and 4. One player, its name this file's alone (every file in a run shares RUN).
test("a player picks a theme, which paints before the profile loads, and Follow device and signing out clear it", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 360, height: 800 }, colorScheme: "light" })).newPage();
  await page.goto("/");
  await signInAndPick(page, "thm");
  await page.getByRole("button", { name: "Settings" }).click();
  const sheet = page.getByRole("dialog", { name: "Settings" });
  const group = sheet.getByRole("group", { name: "Theme" });
  await expect(group.getByRole("radio")).toHaveCount(6);
  await expect(group.getByRole("radio", { name: "Follow device" })).toBeChecked();
  // Each tile wears its own theme: Sky's background, whatever the page's (round 8).
  const sky = group.locator("label", { has: page.getByRole("radio", { name: "Sky", exact: true }) });
  expect(await sky.locator("[data-theme='sky']").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(238, 243, 250)");

  await pick(page, "Ink");
  await expect(group.getByRole("radio", { name: "Ink" })).toBeChecked();
  expect([await attribute(page), await copy(page), await background(page)]).toEqual(["ink", "ink", "rgb(0, 0, 0)"]);
  // The chosen one outlined thick in the text colour, the others in the control outline (L47).
  const ink = group.locator("label", { has: page.getByRole("radio", { name: "Ink", exact: true }) });
  expect(await ink.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("3px");
  // Chrome snaps the 1.5px outline to whole device pixels (1px here), so: thinner, and in Ink's outline colour.
  const other = await sky.evaluate((el) => [parseFloat(getComputedStyle(el).borderTopWidth), getComputedStyle(el).borderTopColor]);
  expect(other[0]).toBeLessThan(3);
  expect(other[1]).toBe("rgb(96, 96, 96)");

  // A reload paints Ink while the profile request is held back: the <head> script, from this browser's copy.
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/profile", async (route) => {
    await held;
    await route.continue();
  });
  await page.reload();
  expect(await background(page)).toBe("rgb(0, 0, 0)");
  release();
  await page.unroute("**/api/profile");
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  expect(await attribute(page)).toBe("ink");

  // Follow device: no attribute and no copy, so the device's dark mode gives Night.
  await page.getByRole("button", { name: "Settings" }).click();
  await pick(page, "Follow device");
  expect([await attribute(page), await copy(page)]).toEqual([null, null]);
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await background(page)).toBe("rgb(18, 18, 18)");
  await page.emulateMedia({ colorScheme: "light" });

  // Signing out clears the copy, so the next visitor on this browser gets the device's theme.
  await pick(page, "Moonlit");
  expect(await copy(page)).toBe("moonlit");
  await expect(sheet.getByRole("link", { name: "About Plor" })).toHaveAttribute("href", "/about");
  await sheet.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toBeVisible();
  expect([await attribute(page), await copy(page), await background(page)]).toEqual([null, null, "rgb(250, 250, 248)"]);
});

// Criterion 5: from a signed-out page's footer.
test("every footer links to About, which says what Plor is, who makes it, its credits and its use of AI", async ({ page }) => {
  await page.goto("/");
  await page.locator("footer").getByRole("link", { name: "About Plor" }).click();
  await expect(page).toHaveURL("http://localhost:3000/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Plor");
  for (const heading of ["Who makes it", "Credits", "AI"]) await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  await expect(page.getByText("Plor is made by Jason.")).toBeVisible();
  await expect(page.getByRole("link", { name: "privacy@plor.app" })).toHaveAttribute("href", "mailto:privacy@plor.app");
  await expect(page.getByRole("link", { name: "Rosé Pine" })).toHaveAttribute("href", "https://rosepinetheme.com/");
  await expect(page.getByRole("link", { name: "monkeytype" })).toHaveAttribute("href", "https://monkeytype.com/");
  await expect(page.getByText("Plor is built with help from AI.")).toBeVisible();
});
