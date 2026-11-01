// 14b-17, readable lines and text size (docs/milestones/M14-14b-17-lines-and-text-size.md): a paragraph, and on a
// reading page a list item, stops at 55ch (about 70 letters in Baloo 2, answer 8); a reading page's h2 sits 40px under
// what's above it and 10px over what follows; and font sizes follow the browser's default text size (here doubled to
// 32px, WCAG 2.2 1.4.4's 200%).
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { RUN, play, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
let puzzle: TodayPuzzle | null = null;

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  if (puzzle) await removePuzzle(DB, puzzle);
  await DB.end();
});

// The browser's default text size, as a player sets it in their settings.
async function textSize(page: Page, px: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", { fontSizes: { standard: px } });
}

// How wide 55 of the font's "0"s are in this paragraph's or list item's own font: CSS's 55ch.
const measure = (page: Page, nth: number) =>
  page.locator("main p, main li").nth(nth).evaluate((p) => {
    const probe = document.createElement("span");
    probe.style.font = getComputedStyle(p).font;
    probe.style.whiteSpace = "pre";
    probe.textContent = "0".repeat(55);
    document.body.append(probe);
    const room = probe.getBoundingClientRect().width;
    probe.remove();
    return { width: p.getBoundingClientRect().width, room };
  });

test("on a desktop, Privacy's paragraphs and list items stop at 55ch and its headings start what follows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/privacy");
  const count = await page.locator("main p, main li").count();
  for (let i = 0; i < count; i++) {
    const { width, room } = await measure(page, i);
    expect(width, `paragraph ${i}`).toBeLessThanOrEqual(room + 0.5);
  }
  const h2 = page.getByRole("heading", { level: 2, name: "What we keep" });
  expect(await h2.evaluate((el) => [getComputedStyle(el).marginTop, getComputedStyle(el).marginBottom])).toEqual(["40px", "10px"]);
});

test("signed-out Today's headings are spaced the same, and a card's heading is not", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const h2 = page.getByRole("heading", { level: 2, name: /^Today's game/ });
  expect(await h2.evaluate((el) => [getComputedStyle(el).marginTop, getComputedStyle(el).marginBottom])).toEqual(["40px", "10px"]);
  await page.goto("/nope");
  const card = page.getByRole("heading", { level: 2, name: "Page not found" });
  expect(await card.evaluate((el) => getComputedStyle(el).marginTop)).toBe("0px");
});

test("font sizes double when the browser's text size doubles", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/nope");
  const sizes = () =>
    page.evaluate(() =>
      ["h1", "main h2", "main p", "main a"].map((s) => parseFloat(getComputedStyle(document.querySelector(s)!).fontSize)),
    );
  const before = await sizes();
  await textSize(page, 32);
  await page.reload();
  const after = await sizes();
  expect(after).toEqual(before.map((px) => px * 2));
});

// A <p> that's a row, not running text, keeps its card's width: the question card's head, its points chip at the
// card's right edge (14b-17 review).
test("on a desktop, the question card's head stays as wide as its card", async ({ page }) => {
  puzzle = await todayPuzzle(DB);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await signInAndPick(page, "ts");
  await play(page);
  const head = page.getByText(/^Stop 1 of /).locator("xpath=..");
  await expect(head).toBeVisible();
  const [row, card] = await head.evaluate((el) => {
    const box = el.parentElement!;
    const s = getComputedStyle(box);
    return [el.getBoundingClientRect().width, box.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)];
  });
  expect(Math.abs(row - card)).toBeLessThan(1);
});
