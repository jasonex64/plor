// The no-invented-numbers rule catches the mistake it exists for (docs/milestones/PROCESS-lint-rules.md). RuleTester runs
// under Vitest through its describe and it hooks (ESLint's Node.js API, "Customizing describe and it").
import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import noInventedNumbers from "./no-invented-numbers.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-invented-numbers", noInventedNumbers, {
  valid: [
    "const none = 0, one = 1, half = x / 2, minute = 60 * 1000, day = 24, turn = 360, pct = 100, missing = -1;",
    "const third = list[3];",
    "const wait = 1500; // human, 2026-11-17",
    "// The clock, answer 12.\nconst wait = 1500;",
    "// See docs/milestones/M04-game-1.md\nconst wait = 1500;",
    "const wait = 1500; /* https://example.com/spec */",
    "const LIMITS = {\n  // Answers 13 to 28.\n  perDay: 7,\n};",
    "// The badge, drawn to answer 4.\nfunction badge() {\n  return [12, 7, 3.5].map((v) => v * 3);\n}",
  ],
  invalid: [
    { code: "const wait = 1500;", errors: [{ messageId: "unsourced" }] },
    { code: "// Feels right.\nconst wait = 1500;", errors: [{ messageId: "unsourced" }] },
    { code: "const wait = 1500; // about a second and a half", errors: [{ messageId: "unsourced" }] },
    { code: "throw new AppError('x', 404);", errors: [{ messageId: "unsourced" }] },
    { code: "// human, 2026-11-17\nconst a = 5;\nconst b = 7;", errors: [{ messageId: "unsourced" }] },
  ],
});
