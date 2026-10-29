// The new look (docs/milestones/M14-14b-8-the-new-look.md; mockup 3, "Nearly square (5px)"), read from computed styles
// on real elements. 14b-8a: buttons, links drawn as buttons and fields take the ink border, corners and hard shadow in
// each theme's ink (its text colour), buttons press down unless the player asks for less motion, and the shell's tab
// bar and sidebar take the ink rules (criterion 1).
import { expect, test, type Locator, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await DB.end();
});

// The theme's text colour as the browser computes it, which is the ink.
const ink = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--text)";
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });

const look = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    return { border: `${s.borderTopWidth} ${s.borderTopColor}`, corners: s.borderTopLeftRadius, shadow: s.boxShadow };
  });

test("buttons, button links and fields take the ink border, corners and shadow, in each theme", async ({ browser }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    const page = await (await browser.newContext({ colorScheme })).newPage();
    await page.goto("/");
    const color = await ink(page);
    expect(await look(page.getByRole("button", { name: "Email me a sign-in code" }))).toEqual({
      border: `2px ${color}`,
      corners: "5px",
      shadow: `${color} 0px 4px 0px 0px`,
    });
    expect(await look(page.getByRole("link", { name: "About Plor" }))).toEqual({
      border: `2px ${color}`,
      corners: "5px",
      shadow: `${color} 0px 4px 0px 0px`,
    });
    expect(await look(page.getByLabel("Email"))).toEqual({ border: `2px ${color}`, corners: "4px", shadow: "none" });
  }
});

test("a button presses down onto its shadow, and doesn't move under reduced motion", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const page = await (await browser.newContext({ reducedMotion })).newPage();
    await page.goto("/");
    const button = page.getByRole("button", { name: "Email me a sign-in code" });
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    const pressed = () => button.evaluate((el) => getComputedStyle(el).transform);
    if (reducedMotion === "reduce") expect(await pressed()).toBe("none");
    else await expect.poll(pressed).toBe("matrix(1, 0, 0, 1, 0, 4)");
    await page.mouse.up();
  }
});

test("the tab bar and the sidebar's current item take the ink rules", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.goto("/");
  await signInAndPick(page, "lk");
  const color = await ink(page);
  const nav = page.getByRole("navigation", { name: "Main" });
  expect(await nav.evaluate((el) => `${getComputedStyle(el).borderTopWidth} ${getComputedStyle(el).borderTopColor}`)).toBe(`2px ${color}`);

  // The gear is an icon, not one of the kit's buttons: held down, it neither moves nor gains a shadow (14b-8a review).
  const gear = page.getByRole("button", { name: "Settings" });
  const box = (await gear.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  expect(await gear.evaluate((el) => [getComputedStyle(el).transform, getComputedStyle(el).boxShadow])).toEqual(["none", "none"]);
  await page.mouse.up();
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await nav.evaluate((el) => `${getComputedStyle(el).borderRightWidth} ${getComputedStyle(el).borderRightColor}`)).toBe(`2px ${color}`);
  expect(await look(nav.getByRole("link", { name: "Today" }))).toEqual({ border: `2px ${color}`, corners: "4px", shadow: `${color} 3px 3px 0px 0px` });
});
