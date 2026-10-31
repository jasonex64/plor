// 14b-16, a proper 404 page (docs/milestones/M14-14b-16-not-found.md): an address that isn't a page answers 404 and
// shows "Page not found" in one kit card inside Plor's own shell, signed in or out, in the player's theme and font,
// with a button to Today and no tab marked current.
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

const fontOf = (page: import("@playwright/test").Page, selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontFamily);

test("signed out, an unknown address answers 404 with Plor's page, in its theme and font, and a button to Today", async ({ browser }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme })).newPage();
    await page.goto("/");
    const font = await fontOf(page, "h1");
    const response = await page.goto("/nope");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("Page not found");

    // The shell's main, its h1, and one card under it.
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: "Plor" })).toBeVisible();
    const card = main.getByRole("heading", { level: 2, name: "Page not found" }).locator("xpath=..");
    await expect(card).toContainText("There's nothing at this address.");
    expect(await card.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("2px");
    // The theme: the device's, Paper or Night (globals.css).
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(colorScheme === "light" ? "rgb(250, 250, 248)" : "rgb(18, 18, 18)");
    expect(await fontOf(page, "h2")).toBe(font);
    // Not the sign-in step.
    await expect(page.getByRole("button", { name: "Email me a sign-in code" })).toHaveCount(0);

    const home = main.getByRole("link", { name: "Go to Today" });
    await expect(home).toHaveAttribute("href", "/");
    expect((await home.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await home.click();
    await expect(page).toHaveURL("http://localhost:3000/");
    await page.context().close();
  }
});

test("signed in, the old /offbeat address shows the page inside the sidebar shell, with no tab current", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "nf");
  const response = await page.goto("/offbeat");
  expect(response?.status()).toBe(404);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Today" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("heading", { level: 2, name: "Page not found" })).toBeVisible();
  await expect(nav.locator("[aria-current]")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

// An unknown address under a tab's own path is still no tab's page: no tab, nor Admin, is marked current (14b-16 review).
test("signed in on a phone, unknown addresses under a tab's path mark no tab current", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "ng");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const path of ["/friends/nope", "/me/nope", "/updraft/nope"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole("main").getByRole("heading", { level: 2, name: "Page not found" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Today" })).toBeVisible();
    await expect(nav.locator("[aria-current]"), path).toHaveCount(0);
  }
});
