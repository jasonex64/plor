// CLAUDE.md's "Never cheat a check", as a check (docs/milestones/PROCESS-lint-rules.md, rule 4): a test switched off,
// focused or marked to fail can turn a run green without testing anything. Vitest's and Playwright's ways to do it:
// test.skip, .only, .fixme, .todo, .skipIf, .runIf, .fail on test, it, describe or suite (also chained, as in
// test.describe.only), and the x/f-prefixed names. A wrong test is fixed or removed as its own change instead.
// Built from ESLint's custom rules page, "Rule Structure" and "Report Problems" (docs/SOURCES.md).

const ROOTS = new Set(["test", "it", "describe", "suite"]);
const SWITCHES = new Set(["skip", "only", "fixme", "todo", "skipIf", "runIf", "fail"]);
const PREFIXED = new Set(["xit", "xtest", "xdescribe", "fit", "fdescribe"]);

function rootName(node) {
  let at = node;
  while (at.type === "MemberExpression") at = at.object;
  return at.type === "Identifier" ? at.name : null;
}

/** @type {import("eslint").Rule.RuleModule} */
const noSkippedTests = {
  meta: {
    type: "problem",
    docs: { description: "No test may be skipped, focused or marked to fail" },
    messages: {
      switched: "{{name}} switches a test off or narrows the run, so a green result proves less. Fix or remove the test as its own change.",
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (node.computed || node.property.type !== "Identifier" || !SWITCHES.has(node.property.name)) return;
        if (!ROOTS.has(rootName(node.object))) return;
        context.report({ node, messageId: "switched", data: { name: context.sourceCode.getText(node) } });
      },
      CallExpression(node) {
        if (node.callee.type === "Identifier" && PREFIXED.has(node.callee.name)) {
          context.report({ node: node.callee, messageId: "switched", data: { name: node.callee.name } });
        }
      },
    };
  },
};

export default noSkippedTests;
