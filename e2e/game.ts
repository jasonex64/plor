// Playing the clock game in a test: the plain screen has no animation, so each step waits only as Playwright's own timeouts do.
import { expect, type Page } from "@playwright/test";

export const answerBox = (page: Page) => page.getByRole("textbox", { name: "Your answer", exact: true });

// The question is open with its time, once Start's reply (or Next's) has landed.
export async function asked(page: Page, prompt: string): Promise<void> {
  await expect(page.getByRole("heading", { name: prompt, exact: true })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText(/d/);
}

// Types text and presses Enter: the input is emptied and keeps focus.
export async function say(page: Page, text: string): Promise<void> {
  await answerBox(page).fill(text);
  await answerBox(page).press("Enter");
  await expect(answerBox(page)).toHaveValue("");
  await expect(answerBox(page)).toBeFocused();
}

// A run on a clock (the fixture day's first three questions, src/test/answer-fixture.ts) from question 1 open to its end: the text
// given on question 1, then Next, Next and Finish. Leaves the result showing; "dog" alone is 10 points, no text is 0.
export async function finishClockRun(page: Page, onFirst: string[] = []): Promise<void> {
  await asked(page, "Name an animal");
  for (const text of onFirst) await say(page, text);
  await page.getByRole("button", { name: "Next question", exact: true }).click();
  await asked(page, "Name a fruit");
  await page.getByRole("button", { name: "Next question", exact: true }).click();
  await asked(page, "Name a color");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.locator("#result")).toBeVisible();
}

// The countdown both games show (src/app/countdown-bar.tsx, docs/milestones/M14-14c-9-plain-game-2.md, answer 7b): the
// seconds as the timer's own text, "NN seconds left", and a bar for the eye only, aria-hidden, whose fill shrinks.
export const countdown = (page: Page) => {
  const track = page.locator('div[aria-hidden="true"]').filter({ has: page.locator('div[style*="scaleX"]') });
  return { timer: page.getByRole("timer"), track, fill: track.locator("div") };
};
export const fillScale = (page: Page) => countdown(page).fill.evaluate((el) => Number(/scaleX\(([\d.e-]+)\)/.exec((el as HTMLElement).style.transform)![1]));

export async function expectCountdown(page: Page): Promise<void> {
  const { timer, track } = countdown(page);
  await expect(timer).toHaveText(/^\d+ seconds left$/);
  await expect(track).toHaveCount(1);
  // The words under the number are for the eye; the timer's text says them to screen readers.
  await expect(page.locator('span[aria-hidden="true"]').filter({ hasText: /^seconds left$/ })).toHaveCount(1);
  const start = await fillScale(page);
  expect(start).toBeGreaterThan(0);
  expect(start).toBeLessThanOrEqual(1);
}
