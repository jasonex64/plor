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
