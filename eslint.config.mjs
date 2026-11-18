import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import failLoudly from "./eslint-rules/fail-loudly.mjs";
import noInventedNumbers from "./eslint-rules/no-invented-numbers.mjs";
import noSkippedTests from "./eslint-rules/no-skipped-tests.mjs";
import noServiceRole from "./eslint-rules/no-service-role.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // A code mistake becomes a rule here, not a sentence in CLAUDE.md (docs/milestones/PROCESS-lint-rules.md). Kept in
  // the project as a plugin object, ESLint's "Runtime Rules" (docs/SOURCES.md).
  {
    plugins: {
      local: {
        rules: {
          "fail-loudly": failLoudly,
          "no-invented-numbers": noInventedNumbers,
          "no-skipped-tests": noSkippedTests,
          "no-service-role": noServiceRole,
        },
      },
    },
    rules: {
      "local/fail-loudly": "error",
      "local/no-skipped-tests": "error",
      // CLAUDE.md's "Clean only your orphans" for imports and variables (PROCESS-lint-rules, rule 3): ESLint's own
      // check, a warning in eslint-config-next, made an error so CI stops on it.
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
  // App code only; tests are full of example values (answer 9).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    rules: { "local/no-invented-numbers": "error", "local/no-service-role": "error" },
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
    // pstack's statechart, copied at its commit with only the Windows changes its ticket records
    // (docs/milestones/PROCESS-formal-verification.md, Source diff): third-party code, not rewritten to our rules.
    ".claude/skills/statechart/**",
  ]),
]);

export default eslintConfig;
