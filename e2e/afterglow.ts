// Playing Afterglow in a test (docs/milestones/M14-14c-6-afterglow-in-play.md): Light it, Walk on and See results, each
// waiting as long as the scene can take to get there. The scene's times are its own (src/config/tunables.ts,
// AFTERGLOW), the longest of each; on top of them goes Playwright's own expect timeout, 5 s by default, as the margin
// any other wait in these tests has.
import { expect, type Page } from "@playwright/test";
import { AFTERGLOW } from "../src/config/tunables";

const A = AFTERGLOW;
const most = (o: Record<string, number>) => Math.max(...Object.values(o));
const EXPECT_MS = 5_000;
// Light it to the sky result's Walk on: the longest charge and climb, then the button's wait after the burst.
export const SKY_MS = (most(A.CHARGE_S) + most(A.CLIMB_S) + A.BUTTON_AT) * 1000 + EXPECT_MS;
// Walk on to the next box: the longer way down, the longer arrival and a lantern.
export const WALK_MS = (most(A.DRIFT_S) + most(A.ARRIVE_S) + A.LETTER_LOWER + A.LETTER_BURN + A.LETTER_SPUTTER + A.LETTER_DROP) * 1000 + EXPECT_MS;
// Light it to a dud's ending list and its See results.
export const DUD_MS = (A.DUD_CHARGE_S + A.DUD_LIFT_S + A.DUD_FALL_S + A.DUD_SMOKE_S + A.OVER_BUTTON_AT) * 1000 + EXPECT_MS;
// Q7's Walk on to the ending list's See results: Q7's text fades out, then the results fade in.
export const LAST_MS = (A.RESULTS_FADE_S + A.OVER_BUTTON_AT) * 1000 + EXPECT_MS;

export const box = (page: Page) => page.getByRole("region", { name: "Question" });
export const answerBox = (page: Page) => page.getByRole("textbox", { name: "Your answer", exact: true });
export const skyResult = (page: Page) => page.getByRole("button", { name: "Walk on" });
export const seeResults = (page: Page) => page.getByRole("button", { name: "See results" });

// The question's box is open with its time, once Next's reply (or Start's) has landed.
export async function asked(page: Page, prompt: string, timeout = EXPECT_MS): Promise<void> {
  await expect(box(page).getByText(prompt, { exact: true })).toBeVisible({ timeout });
  await expect(box(page).getByRole("timer")).toHaveText(/\d/);
}

export async function lightIt(page: Page, text: string): Promise<void> {
  await answerBox(page).fill(text);
  await page.getByRole("button", { name: "Light it" }).click();
}

// A safe answer, to its sky result.
export async function safe(page: Page, text: string): Promise<void> {
  await lightIt(page, text);
  await expect(skyResult(page)).toBeVisible({ timeout: SKY_MS });
}

// Walk on, to the next question's open box.
export async function walkOn(page: Page, prompt: string): Promise<void> {
  await skyResult(page).click();
  await asked(page, prompt, WALK_MS);
}

// A caught answer, to the ending list.
export async function caught(page: Page, text: string): Promise<void> {
  await lightIt(page, text);
  await expect(seeResults(page)).toBeVisible({ timeout: DUD_MS });
}
