// Two-browser tests against the local stack (M07 D7: Playwright, human, 2026-10-21). They need the local Supabase
// stack with Realtime (`npx supabase start`) and .env.local pointing at it; Playwright starts the dev server itself.
// Run with `npm run test:e2e`. Timeouts are Playwright's defaults.
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
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  // Game 2's village draws with WebGL (M16 16g-2); CI's runners have no GPU, so Chromium's software WebGL is switched on,
  // for this test browser only (DECISIONS.md, log, 2026-11-08; 16g-2 answer 17).
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--enable-unsafe-swiftshader"] } } }],
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
});
