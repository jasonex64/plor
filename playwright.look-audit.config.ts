// The look audit's run (docs/milestones/M20-design-rules-and-clean-up.md, 20l): `npm run look-audit`. The same built app, port,
// local stack and web server as the e2e suite (playwright.config.ts), but its own file, e2e/look-audit.shots.ts, which the
// suite's `*.e2e.ts` pattern never matches, so CI never runs it. It takes pictures, not checks.
import { defineConfig, devices } from "@playwright/test";
import e2e from "./playwright.config.ts";

// How long the whole audit may take: about 400 pictures of a built app, each a page load, 45 minutes.
const AUDIT_MS = 45 * 60_000;

// How long one click, page load or check may wait: 15 seconds, the audit's own choice.
const ACTION_MS = 15_000;

export default defineConfig({
  ...e2e,
  testMatch: "look-audit.shots.ts",
  retries: 0,
  // A screen that isn't there fails after 15 seconds (Playwright's actions otherwise wait out the whole run).
  expect: { timeout: ACTION_MS },
  use: { ...e2e.use, actionTimeout: ACTION_MS, navigationTimeout: ACTION_MS },
  timeout: AUDIT_MS,
  // The suite's phone project would run the one test twice; the audit sets its own sizes.
  projects: [{ name: "look-audit", use: { ...devices["Desktop Chrome"] } }],
  reporter: "list",
});
