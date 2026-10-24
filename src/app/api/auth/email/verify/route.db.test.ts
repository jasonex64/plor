// Entering the emailed code against the local stack (run with `npm run test:db`; docs/milestones/M12-account.md, 12b,
// A6): a code typed or pasted with spaces signs in. Checks are limited per player IP and per address (docs/milestones/
// M12-12e-sign-in-limits.md, N3, N4).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AUTH_LIMITS } from "@/config/tunables";
import { emailKey, hashKey } from "@/lib/auth-limits";
import { getPool } from "@/lib/db";
import { enterCode, ipFor, requestCode, useLocalStack } from "@/test/local-stack";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { POST as verifyRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const email = `${RUN}-code@example.test`;
const guessed = `${RUN}-guess@example.test`;
// A documentation address (RFC 5737), never a real player's; its count is removed after the run.
const IP = "203.0.113.20";
const TOO_MANY = { status: 429, body: { ok: false, error: "too_many_attempts" } };

async function check(address: string, code: string, ip: string) {
  const response = await verifyRoute(apiRequest("/api/auth/email/verify", { method: "POST", body: { email: address, code }, ip }));
  return { status: response.status, body: await response.json() };
}
// A wrong code for this code: the right one with its last digit changed.
const wrong = (code: string) => code.slice(0, 5) + String((Number(code[5]) + 1) % 10);

beforeAll(useLocalStack);

afterAll(async () => {
  const keys = [IP, ipFor(email), ipFor(guessed), ...[email, guessed, `${RUN}-nobody@example.test`].map(emailKey)].map(hashKey);
  await getPool().query("delete from private.auth_attempt where key = any($1)", [keys]);
  await getPool().query("delete from auth.users where email = any($1)", [[email, guessed]]);
  await getPool().end();
});

describe("POST /api/auth/email/verify", () => {
  it("signs in with a code pasted as two groups of digits (A6)", async () => {
    cookieJar.clear();
    const { code } = await requestCode(email);
    const pasted = ` ${code.slice(0, 3)} ${code.slice(3)} `;
    expect(await enterCode(email, pasted)).toEqual({ status: 200, body: { ok: true } });
  });

  it(`refuses a check after ${AUTH_LIMITS.check_email.limit} wrong codes, even the right one, until a new code is sent (N4)`, async () => {
    cookieJar.clear();
    const first = (await requestCode(guessed)).code;
    for (let i = 0; i < AUTH_LIMITS.check_email.limit; i++) {
      expect((await enterCode(guessed, wrong(first))).status).toBe(403);
    }
    expect(await enterCode(guessed, first)).toEqual(TOO_MANY);
    // Locally Auth sends an address a new code after 1 s (supabase/config.toml, max_frequency); hosted, after 60 s.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const second = (await requestCode(guessed)).code;
    expect(await enterCode(guessed, second)).toEqual({ status: 200, body: { ok: true } });
  });

  it(`checks ${AUTH_LIMITS.check_ip.limit} codes from one player IP in 5 minutes, and refuses the next (N3)`, async () => {
    // Filled to one short directly, so the test doesn't spend 30 of Auth's own shared per-IP checks.
    await getPool().query("insert into private.auth_attempt (kind, key) select 'check_ip', $1 from generate_series(1, $2)", [
      hashKey(IP),
      AUTH_LIMITS.check_ip.limit - 1,
    ]);
    expect((await check(`${RUN}-nobody@example.test`, "000000", IP)).status).toBe(403);
    expect(await check(`${RUN}-nobody2@example.test`, "000000", IP)).toEqual(TOO_MANY);
  });
});
