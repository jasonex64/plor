import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import failLoudly from "./eslint-rules/fail-loudly.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // A code mistake becomes a rule here, not a sentence in CLAUDE.md (docs/milestones/PROCESS-lint-rules.md). Kept in
  // the project as a plugin object, ESLint's "Runtime Rules" (docs/SOURCES.md).
  {
    plugins: { local: { rules: { "fail-loudly": failLoudly } } },
    rules: { "local/fail-loudly": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Another session's worktree, with its own build output: linted from its own checkout.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
