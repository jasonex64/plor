// The streak's ranks (docs/milestones/M14-14b-2a-streak-ranks.md): the pill in the phone's top bar and in the sidebar
// from 768px, Seed at 0 and Daisy once the game screen's Start begins today's run, and /streak's ranks.
import { expect, test, type Browser } from "@playwright/test";
import { Pool } from "pg";
import { RUN, signInAndPick } from "./players";
import { removePuzzle, todayPuzzle, type TodayPuzzle } from "./puzzle";

const DB = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", max: 1 });
let puzzle: TodayPuzzle;

test.beforeAll(async () => {
  puzzle = await todayPuzzle(DB);
});

test.afterAll(async () => {
  await DB.query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await removePuzzle(DB, puzzle);
  await DB.end();
});

async function player(browser: Browser, name: string, viewport: { width: number; height: number }) {
  const page = await (await browser.newContext({ viewport })).newPage();
  await page.goto("/");
  await signInAndPick(page, name);
  return page;
}

const RANKS = [
  ["Seed", "0 days"],
  ["Daisy", "1–4 days"],
  ["Morning glory", "5–14 days"],
  ["Hibiscus", "15–29 days"],
  ["Lotus", "30–89 days"],
  ["Sakura", "90 days and up"],
];

// Criteria 1 to 4, on a phone.
test("a phone's top bar shows the streak's rank beside the gear, and it grows when a run starts", async ({ browser }) => {
  const page = await player(browser, "st", { width: 360, height: 800 });
  const top = page.getByRole("banner");
  const pill = top.getByRole("link", { name: "0 day streak, Seed" });
  await expect(pill).toBeVisible();
  // Between the wordmark and the gear.
  const [word, box, gear] = await Promise.all([top.getByText("Plor", { exact: true }), pill, top.getByRole("button", { name: "Settings" })].map((l) => l.boundingBox()));
  expect(word!.x + word!.width).toBeLessThan(box!.x);
  expect(box!.x + box!.width).toBeLessThanOrEqual(gear!.x);
  // Today's old line is gone (criterion 4).
  await expect(page.getByText(/played in a row/)).toHaveCount(0);

  // /streak: how it counts, the six ranks, the player's marked (criterion 3).
  await pill.click();
  await expect(page).toHaveURL("http://localhost:3000/streak");
  const streak = page.getByRole("region", { name: "Streak" });
  await expect(streak.getByRole("heading", { name: "Your streak: 0 days" })).toBeVisible();
  await expect(streak).toContainText("A day with no puzzle neither counts nor breaks it.");
  const ranks = streak.getByRole("listitem");
  await expect(ranks).toHaveCount(RANKS.length);
  for (const [i, [name, days]] of RANKS.entries()) {
    await expect(ranks.nth(i)).toContainText(name);
    await expect(ranks.nth(i)).toContainText(days);
    // "each with its flower" (criterion 3): a drawing with shapes in it, at a real size (14b-2c-4, item 50).
    const flower = ranks.nth(i).locator("svg");
    await expect(flower).toHaveCount(1);
    expect(await flower.evaluate((svg) => svg.querySelectorAll("path, circle, ellipse, rect, polygon").length)).toBeGreaterThan(0);
    const box = (await flower.boundingBox())!;
    expect(box.width * box.height).toBeGreaterThan(0);
  }
  await expect(streak.locator("[aria-current]")).toHaveCount(1);
  await expect(streak.locator("[aria-current]")).toContainText("Seed0 daysYour rank");

  // Start on the game screen begins today's run, which counts at once: the pill moves to Daisy without a reload
  // (criterion 2).
  await page.goto("/");
  await page.getByRole("link", { name: "Play", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/offbeat");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(top.getByRole("link", { name: "1 day streak, Daisy" })).toBeVisible();
  // Then /streak itself counts the run: this click opens the page afresh, so it checks /streak's own reading of the
  // streak, not the pill's change without a reload, which the line above checks (14b-2c-4, item 50).
  await top.getByRole("link", { name: "1 day streak, Daisy" }).click();
  await expect(streak.locator("[aria-current]")).toContainText("Daisy");
  await expect(streak.getByRole("heading", { name: "Your streak: 1 day" })).toBeVisible();
});

// Criterion 1, from 768px.
test("from 768px the sidebar shows the avatar slot and the streak's pill under the wordmark", async ({ browser }) => {
  const page = await player(browser, "su", { width: 1440, height: 900 });
  await expect(page.getByRole("banner")).toBeHidden();
  const nav = page.getByRole("navigation", { name: "Main" });
  const pill = nav.getByRole("link", { name: "0 day streak, Seed" });
  await expect(pill).toBeVisible();
  const slot = nav.locator("[data-initial='S']");
  await expect(slot).toBeVisible();
  const [word, slotBox, box, today] = await Promise.all(
    [nav.getByText("Plor", { exact: true }), slot, pill, nav.getByRole("link", { name: "Today" })].map((l) => l.boundingBox()),
  );
  // Slot then pill, side by side, under the wordmark and above the tabs.
  expect(slotBox!.x + slotBox!.width).toBeLessThan(box!.x);
  expect(word!.y + word!.height).toBeLessThan(box!.y);
  expect(box!.y + box!.height).toBeLessThan(today!.y);
});
