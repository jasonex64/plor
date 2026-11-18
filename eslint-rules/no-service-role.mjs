// CLAUDE.md's "Least privilege", as a check (docs/milestones/PROCESS-lint-rules.md, rule 5): app code reaches the
// database as a role with only the grants it needs, so the service_role key, which skips row level security, has no
// place in it. Fails on a name or a string that holds service_role, in any case (process.env.SUPABASE_SERVICE_ROLE_KEY,
// "service_role"); a comment may still mention it. DECISIONS.md allows it nowhere today.
// Built from ESLint's custom rules page, "Rule Structure" and "Report Problems" (docs/SOURCES.md).

const SERVICE_ROLE = /service_role/i;

/** @type {import("eslint").Rule.RuleModule} */
const noServiceRole = {
  meta: {
    type: "problem",
    docs: { description: "App code may not use the service_role key" },
    messages: {
      serviceRole: "{{text}} reaches for the service_role key, which skips row level security. App code connects as its own role (CLAUDE.md, Least privilege).",
    },
    schema: [],
  },
  create(context) {
    const flag = (node, text) => {
      if (SERVICE_ROLE.test(text)) context.report({ node, messageId: "serviceRole", data: { text } });
    };
    return {
      Identifier: (node) => flag(node, node.name),
      Literal: (node) => {
        if (typeof node.value === "string") flag(node, node.value);
      },
      TemplateElement: (node) => flag(node, node.value.raw),
    };
  },
};

export default noServiceRole;
