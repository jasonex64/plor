// Two-browser tests against the local stack (M07 D7: Playwright, human, 2026-10-21). They need the local Supabase
// stack with Realtime (`npx supabase start`) and .env.local pointing at it; Playwright builds and starts the app itself.
// Run with `npm run test:e2e`. Timeouts are Playwright's defaults, but for the web server's.
import { defineConfig, devices } from "@playwright/test";
import { localStack } from "./scripts/slot.ts";

// This slot's own port (docs/milestones/PROCESS-parallel-sessions.md).
const appUrl = localStack().appUrl;
const port = new URL(appUrl).port;
// How long the build and start may take before the run gives up (docs/milestones/M21-faster-e2e.md, answer 11): 3
// minutes. PR #237's built run took about 1.4 on CI.
const BUILD_AND_START_MS = 3 * 60_000;

export default defineConfig({
  testDir: "e2e",
  // *.e2e.ts, so Vitest's default *.test / *.spec pattern never picks these up.
  testMatch: "*.e2e.ts",
  // The tests share one local database, like the *.db.test.ts files.
  workers: 1,
  // One retry in CI (human, 2026-11-06: "retry, bukld faster next"): 19 of the last 64 runs failed, mostly on one different
  // test of 149. A test that needed it is listed as flaky in the log; a retry there is a lead, not a pass to forget.
  retries: process.env.CI ? 1 : 0,
  // On CI every test keeps a video of what its page did, passed or failed, which CI uploads as the proof of a visible
  // change (docs/milestones/PROCESS-lint-rules.md, answers 3, 8 and 33): pictures, with no network data, so not the
  // stack's key a trace holds (docs/milestones/M16-16g-3-village-e2e-on-ci.md, answer 2). Only pages Playwright makes
  // are filmed, so tests take the `page` fixture rather than opening their own context. No screenshots (answer 33): they
  // took every page still open, and tests that open their own contexts leave them open for the rest of the run.
  use: {
    baseURL: appUrl,
    trace: "retain-on-failure",
    video: process.env.CI ? "on" : "off",
  },
  projects: [
    // Every test, the e2e CI runs (`npm run test:e2e`), at Desktop Chrome's 1280 × 720 unless the test sets its own size.
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // A test tagged @visual runs again at phone size (docs/milestones/PROCESS-lint-rules.md, answers 11, 12 and 29 to 31).
    { name: "phone", grep: /@visual/, use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
  // The built app players get, not `next dev`, here and on CI alike (docs/milestones/M21-faster-e2e.md, 21a; answer 3):
  // measured in PR #237, the suite spent 13.2 minutes in tests on a built app against 24.3 on the dev server, and two
  // tests failed only on the built app. Never a server already on the port: every run builds the code it tests, and
  // Playwright refuses a port that is taken.
  webServer: { command: `npm run build && npm run start -- -p ${port}`, url: appUrl, reuseExistingServer: false, timeout: BUILD_AND_START_MS },
});
