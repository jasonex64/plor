// CLAUDE.md's "No invented numbers", as a check (docs/milestones/PROCESS-lint-rules.md, answers 6, 9, 10, 15 to 18):
// a number in app code needs a comment that names where it came from. A comment counts when it holds a ticket answer,
// a docs/ path, a URL, or "human, <date>" (answer 17), and it may sit on the number's own line or just above the number
// or anything enclosing it, so one comment above a drawing covers the drawing (answer 18). 0 and 1 (answer 6) and the
// unit numbers 2, 24, 60, 100, 360 and 1000 (answer 16; -1 is 1 negated) need none, nor does an array index.
// Built from ESLint's custom rules page, "Rule Structure", "Report Problems" and "Accessing Comments" (docs/SOURCES.md).

const ALLOWED = new Set([0, 1, 2, 24, 60, 100, 360, 1000]);
const SOURCE = [/\banswers? \d+/i, /docs\//, /https?:\/\//, /\bhuman, \d{4}-\d{2}-\d{2}/i];

const named = (comment) => SOURCE.some((pattern) => pattern.test(comment.value));

/** @type {import("eslint").Rule.RuleModule} */
const noInventedNumbers = {
  meta: {
    type: "problem",
    docs: { description: "A number in app code needs a comment naming its source" },
    messages: {
      unsourced:
        "{{value}} has no source. Add a comment on its line or above it naming a ticket answer, a docs/ path, a URL or \"human, <date>\"; an HTTP status is a STATUS name (src/lib/status.ts).",
    },
    schema: [],
  },
  create(context) {
    const { sourceCode } = context;
    const lineComments = new Map();
    for (const comment of sourceCode.getAllComments()) {
      if (!named(comment)) continue;
      for (let line = comment.loc.start.line; line <= comment.loc.end.line; line++) lineComments.set(line, true);
    }
    return {
      Literal(node) {
        if (typeof node.value !== "number" || ALLOWED.has(node.value)) return;
        const parent = node.parent;
        if (parent.type === "MemberExpression" && parent.computed && parent.property === node) return;
        if (lineComments.has(node.loc.start.line)) return;
        // Not the Program: the file's first comment would then vouch for every number in the file.
        for (let at = node; at && at.type !== "Program"; at = at.parent) {
          if (sourceCode.getCommentsBefore(at).some(named)) return;
        }
        context.report({ node, messageId: "unsourced", data: { value: node.raw } });
      },
    };
  },
};

export default noInventedNumbers;
