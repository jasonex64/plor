// The no-service-role rule catches the mistake it exists for (docs/milestones/PROCESS-lint-rules.md, rule 5). RuleTester
// runs under Vitest through its describe and it hooks (ESLint's Node.js API, "Customizing describe and it").
import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import noServiceRole from "./no-service-role.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

const error = [{ messageId: "serviceRole" }];

new RuleTester().run("no-service-role", noServiceRole, {
  valid: [
    "const url = process.env.DATABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;",
    "// never the service_role key here\nconst role = 'plor_app';",
    "const n = 3; const ok = `role ${role}`;",
  ],
  invalid: [
    { code: "const key = process.env.SUPABASE_SERVICE_ROLE_KEY;", errors: error },
    { code: "const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];", errors: error },
    { code: "const role = 'service_role';", errors: error },
    { code: "const header = `Bearer ${x} service_role`;", errors: error },
    { code: "const service_role = createClient(url, key);", errors: error },
  ],
});
