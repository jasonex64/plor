import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import { TURNSTILE_TEST_PASS_SECRET, TURNSTILE_TEST_SITE_KEY } from "./src/test/turnstile-keys.ts";

// Mirrors the "@/*" path alias in tsconfig.json so tests import modules the way the app does.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Another session's worktree under .claude/worktrees holds a copy of every test; collecting it would race this
  // checkout's db tests on the one local stack (ROADMAP Housekeeping, found in M02 2f).
  // The unit tests that call readServerEnv stub the database and Supabase values themselves; the Turnstile test keys come
  // from here for all of them (M18 18c), so the variables stay required in readServerEnv.
  test: {
    exclude: [...configDefaults.exclude, ".claude/worktrees/**"],
    env: { TURNSTILE_SITE_KEY: TURNSTILE_TEST_SITE_KEY, TURNSTILE_SECRET_KEY: TURNSTILE_TEST_PASS_SECRET },
  },
});
