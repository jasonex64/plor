// Two-browser tests against the local stack (M07 D7: Playwright, human, 2026-10-21). They need the local Supabase
// stack with Realtime (`npx supabase start`) and .env.local pointing at it; Playwright starts the dev server itself.
// Run with `npm run test:e2e`. Timeouts are Playwright's defaults.
import { defineConfig, devices } from "@playwright/test";
import { localStack } from "./scripts/slot.ts";

// This slot's own dev server (docs/milestones/PROCESS-parallel-sessions.md): npm run dev serves it on the slot's port.
const appUrl = localStack().appUrl;

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
  use: { baseURL: appUrl, trace: "retain-on-failure", video: process.env.CI ? "retain-on-failure" : "off" },
  projects: [
    // Every test, the e2e CI runs (`npm run test:e2e`).
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // A server already on the port is reused only if it is this slot's own: e2e/own-server.ts checks, after this step.
  webServer: process.env.E2E_SERVER === "prod"
    ? { command: "npm run build && npm run start", url: appUrl, reuseExistingServer: false, timeout: 900_000 }
    : { command: "npm run dev", url: appUrl, reuseExistingServer: !process.env.CI },
  globalSetup: "./e2e/own-server.ts",
});
