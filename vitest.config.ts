import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

// Mirrors the "@/*" path alias in tsconfig.json so tests import modules the way the app does.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Another session's worktree under .claude/worktrees holds a copy of every test; collecting it would race this
  // checkout's db tests on the one local stack (ROADMAP Housekeeping, found in M02 2f).
  test: { exclude: [...configDefaults.exclude, ".claude/worktrees/**"] },
});
