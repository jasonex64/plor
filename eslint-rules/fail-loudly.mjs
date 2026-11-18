// CLAUDE.md's "Fail loudly", as a check (docs/milestones/PROCESS-lint-rules.md, answers 2 and 5): a catch that is empty,
// or only logs and carries on, hides the error. A catch must rethrow, return, or do something with the failure.
// The one way to choose to do nothing: a comment inside that starts with "Expected:" and says why (the human,
// 2026-11-17, answer 14: "Marker comment allows it"), so `grep -rn "Expected:"` lists every such choice.
// Built from ESLint's custom rules page, "Rule Structure", "Report Problems" and "Accessing Comments" (docs/SOURCES.md).

const LOGGERS = new Set(["console", "log"]);
const MARKER = "Expected:";

function isLogCall(statement) {
  if (statement.type !== "ExpressionStatement") return false;
  const call = statement.expression.type === "AwaitExpression" ? statement.expression.argument : statement.expression;
  return (
    call.type === "CallExpression" &&
    call.callee.type === "MemberExpression" &&
    call.callee.object.type === "Identifier" &&
    LOGGERS.has(call.callee.object.name)
  );
}

/** @type {import("eslint").Rule.RuleModule} */
const failLoudly = {
  meta: {
    type: "problem",
    docs: { description: "A catch must not be empty or only log: rethrow, return, or handle the failure" },
    messages: {
      empty: "This catch is empty, so the error disappears. Rethrow or handle it; if doing nothing is the plan, say why in a comment starting \"Expected:\".",
      logsOnly: "This catch only logs and carries on, so the caller never learns it failed. Rethrow, return, or handle it.",
    },
    schema: [],
  },
  create(context) {
    return {
      CatchClause(node) {
        const statements = node.body.body;
        if (statements.length === 0) {
          const chosen = context.sourceCode.getCommentsInside(node.body).some((c) => c.value.trim().startsWith(MARKER));
          if (!chosen) context.report({ node, messageId: "empty" });
        }
        else if (statements.every(isLogCall)) context.report({ node, messageId: "logsOnly" });
      },
    };
  },
};

export default failLoudly;
