// Entering the emailed code against the local stack (run with `npm run test:db`; docs/milestones/M12-account.md, 12b,
// A6): a code typed or pasted with spaces signs in.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getPool } from "@/lib/db";
import { enterCode, requestCode, useLocalStack } from "@/test/local-stack";
import { cookieJar } from "@/test/request-scope";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const email = `${Date.now().toString(36)}-code@example.test`;

beforeAll(useLocalStack);

afterAll(async () => {
  await getPool().query("delete from auth.users where email = $1", [email]);
  await getPool().end();
});

describe("POST /api/auth/email/verify", () => {
  it("signs in with a code pasted as two groups of digits (A6)", async () => {
    cookieJar.clear();
    const { code } = await requestCode(email);
    const pasted = ` ${code.slice(0, 3)} ${code.slice(3)} `;
    expect(await enterCode(email, pasted)).toEqual({ status: 200, body: { ok: true } });
  });
});
