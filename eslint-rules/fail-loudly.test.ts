// The fail-loudly rule catches the mistakes it exists for (docs/milestones/PROCESS-lint-rules.md). RuleTester runs
// under Vitest through its describe and it hooks (ESLint's Node.js API, "Customizing describe and it").
import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import failLoudly from "./fail-loudly.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("fail-loudly", failLoudly, {
  valid: [
    "try { f(); } catch (e) { throw new Error('f failed', { cause: e }); }",
    "function g() { try { return f(); } catch { return null; } }",
    "try { f(); } catch (e) { log.error('f', e); throw e; }",
    "try { f(); } catch { /* Expected: storage is blocked in private mode; nothing is kept. */ }",
    "try { f(); } catch {\n  // Expected: the value is already kept as typed.\n}",
  ],
  invalid: [
    { code: "try { f(); } catch {}", errors: [{ messageId: "empty" }] },
    { code: "try { f(); } catch { /* ignore */ }", errors: [{ messageId: "empty" }] },
    { code: "try { f(); } catch (e) { console.log(e); }", errors: [{ messageId: "logsOnly" }] },
    { code: "try { f(); } catch (e) { log.warn('f', e); console.error(e); }", errors: [{ messageId: "logsOnly" }] },
    { code: "async function g() { try { await f(); } catch (e) { await log.error('f', e); } }", errors: [{ messageId: "logsOnly" }] },
  ],
});
