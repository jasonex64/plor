// The no-skipped-tests rule catches the mistake it exists for (docs/milestones/PROCESS-lint-rules.md, rule 4). RuleTester
// runs under Vitest through its describe and it hooks (ESLint's Node.js API, "Customizing describe and it").
import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import noSkippedTests from "./no-skipped-tests.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

const error = [{ messageId: "switched" }];

new RuleTester().run("no-skipped-tests", noSkippedTests, {
  valid: [
    "test('a', () => {});",
    "it('a', () => {}); describe('b', () => {});",
    "test.describe('c', () => {}); test.beforeEach(() => {}); test.step('d', () => {});",
    "expect(x).toBe(1); const skip = list.skip; options.only = true;",
  ],
  invalid: [
    { code: "test.skip('a', () => {});", errors: error },
    { code: "it.only('a', () => {});", errors: error },
    { code: "describe.skip('b', () => {});", errors: error },
    { code: "test.describe.only('c', () => {});", errors: error },
    { code: "test('a', () => { test.fixme(); });", errors: error },
    { code: "it.todo('later');", errors: error },
    { code: "it.skipIf(process.env.CI)('a', () => {});", errors: error },
    { code: "test.fail('a', () => {});", errors: error },
    { code: "xit('a', () => {});", errors: error },
    { code: "fdescribe('b', () => {});", errors: error },
  ],
});
