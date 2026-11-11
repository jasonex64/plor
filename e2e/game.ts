// Playing the game in a test (docs/milestones/M14-14c-8-plain-game-1.md): the plain screen has no animation, so each
// step waits only as Playwright's own timeouts do.
import { expect, type Page } from "@playwright/test";

export const answerBox = (page: Page) => page.getByRole("textbox", { name: "Your answer", exact: true });
export const nextButton = (page: Page) => page.getByRole("button", { name: "Next", exact: true });
export const seeResults = (page: Page) => page.getByRole("button", { name: "See results", exact: true });

// The question is open with its time, once Next's reply (or Start's) has landed.
export async function asked(page: Page, prompt: string): Promise<void> {
  await expect(page.getByRole("heading", { name: prompt, exact: true })).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText(/\d/);
}

export async function answer(page: Page, text: string): Promise<void> {
  await answerBox(page).fill(text);
  await page.getByRole("button", { name: "Answer", exact: true }).click();
}

// A safe answer, to its reveal.
export async function safe(page: Page, text: string): Promise<void> {
  await answer(page, text);
  await expect(page.getByRole("heading", { name: "Safe!", exact: true })).toBeVisible();
  await expect(nextButton(page)).toBeVisible();
}

// Next, to the next question's open box.
export async function next(page: Page, prompt: string): Promise<void> {
  await nextButton(page).click();
  await asked(page, prompt);
}

// A caught answer, to the recap.
export async function caught(page: Page, text: string): Promise<void> {
  await answer(page, text);
  await expect(seeResults(page)).toBeVisible();
}

// A caught answer, then See results: the run is over and the page is back on today's cards, as most files that only
// need a finished run get there.
export async function caughtToCards(page: Page, text: string): Promise<void> {
  await caught(page, text);
  await seeResults(page).click();
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
