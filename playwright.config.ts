// Two-browser tests against the local stack (M07 D7: Playwright, human, 2026-10-21). They need the local Supabase
// stack with Realtime (`npx supabase start`) and .env.local pointing at it; Playwright starts the dev server itself.
// Run with `npm run test:e2e`. Timeouts are Playwright's defaults, but for Afterglow's look check, which waits on each step
// and not on the whole, as the mock's did (e2e/afterglow-look.e2e.ts).
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  // *.e2e.ts, so Vitest's default *.test / *.spec pattern never picks these up.
  testMatch: "*.e2e.ts",
  // The tests share one local database, like the *.db.test.ts files.
  workers: 1,
  // One retry in CI (human, 2026-11-06: "retry, bukld faster next"): 19 of the last 64 runs failed, mostly on one different
  // test of 149. A test that needed it is listed as flaky in the log; a retry there is a lead, not a pass to forget.
  retries: process.env.CI ? 1 : 0,
  // On CI a failed test keeps a video of its page, which CI uploads: what the page did, with no network data, so not the
  // stack's key a trace holds (docs/milestones/M16-16g-3-village-e2e-on-ci.md, answer 2). Only pages Playwright makes
  // are filmed, so tests take the `page` fixture rather than opening their own context.
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", video: process.env.CI ? "retain-on-failure" : "off" },
  projects: [
    // Every test but the full look check, the e2e CI runs (`npm run test:e2e`). Game 2's village draws with WebGL (M16 16g-2) and
    // CI's runners have no GPU, so this test browser's software WebGL is switched on (DECISIONS.md, log, 2026-11-08; 16g-2
    // answer 17); Afterglow draws in 2D, so its checks are unaffected.
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--enable-unsafe-swiftshader"] } }, grepInvert: /@full/ },
    // Afterglow's full look check, by hand (`npm run check:afterglow`): both sizes and every section, in the installed
    // Chrome, where its fps lines are judged (docs/milestones/M14-14c-6-afterglow-in-play.md, 14c-6b-2, answers 15 and 47;
    // 14c-5 answer 41).
    { name: "afterglow-full", testMatch: "afterglow-look.e2e.ts", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
});
