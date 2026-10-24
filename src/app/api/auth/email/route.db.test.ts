// Sending a sign-in code against the local stack (run with `npm run test:db`; docs/milestones/M12-12e-sign-in-limits.md,
// N1, N2, L2): code emails are limited per player IP and per address before Auth is called. The counts are filled in
// directly up to one short of a limit, so the test spends only a few of Auth's own shared per-IP requests.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AUTH_LIMITS } from "@/config/tunables";
import { emailKey, hashKey, type AuthLimitKind } from "@/lib/auth-limits";
import { getPool } from "@/lib/db";
import { useLocalStack } from "@/test/local-stack";
import { apiRequest } from "@/test/request-scope";
import { POST as sendRoute } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const email = (tag: string) => `${RUN}-${tag}@example.test`;
const MAILPIT = "http://127.0.0.1:54324";
// Documentation addresses (RFC 5737), never a real player's. Their counts are removed after the run.
const IP_A = "198.51.100.1";
const IP_B = "198.51.100.2";
const IPS = [IP_A, IP_B, "192.0.2.10", "192.0.2.11", "192.0.2.12", "192.0.2.13", "192.0.2.14"];

async function send(address: string, ip?: string) {
  const response = await sendRoute(apiRequest("/api/auth/email", { method: "POST", body: { email: address }, ip }));
  return { status: response.status, body: await response.json() };
}
// Fills a key's count to one short of its limit, as earlier attempts would have.
async function fillToOneShort(kind: AuthLimitKind, value: string) {
  await getPool().query("insert into private.auth_attempt (kind, key) select $1, $2 from generate_series(1, $3)", [
    kind,
    hashKey(value),
    AUTH_LIMITS[kind].limit - 1,
  ]);
}
async function held(kind: AuthLimitKind, value: string): Promise<number> {
  return (await getPool().query("select count(*)::int as n from private.auth_attempt where kind = $1 and key = $2", [kind, hashKey(value)])).rows[0].n;
}
async function mails(address: string): Promise<number> {
  return (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`)).json()).messages.length;
}

beforeAll(useLocalStack);

afterAll(async () => {
  const keys = [...IPS, ...["ip1", "ip2", "ip3", "addr", "log", "tap", "full"].map((t) => emailKey(email(t)))].map(hashKey);
  await getPool().query("delete from private.auth_attempt where key = any($1)", [keys]);
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().end();
});

describe("POST /api/auth/email limits", () => {
  it(`sends ${AUTH_LIMITS.send_ip.limit} codes from one player IP in an hour, and refuses the next (N1)`, async () => {
    await fillToOneShort("send_ip", IP_A);
    expect(await send(email("ip1"), IP_A)).toEqual({ status: 200, body: { ok: true } });
    expect(await send(email("ip2"), IP_A)).toEqual({ status: 429, body: { ok: false, error: "too_many_attempts" } });
    expect(await mails(email("ip2"))).toBe(0);
    // Another player is unaffected.
    expect(await send(email("ip3"), IP_B)).toEqual({ status: 200, body: { ok: true } });
  });

  it(`sends ${AUTH_LIMITS.send_email.limit} codes to one address in an hour, and refuses the next (N2)`, async () => {
    const address = email("addr");
    await fillToOneShort("send_email", emailKey(address));
    expect(await send(address, "192.0.2.10")).toEqual({ status: 200, body: { ok: true } });
    // From another IP, and with the address in capitals: the same address.
    expect(await send(address.toUpperCase(), "192.0.2.11")).toEqual({ status: 429, body: { ok: false, error: "too_many_attempts" } });
    expect(await mails(address)).toBe(1);
  });

  it("logs a refusal with its kind and a hashed key, never the address or IP (L2)", async () => {
    const address = email("log");
    await getPool().query("insert into private.auth_attempt (kind, key) select 'send_email', $1 from generate_series(1, $2)", [
      hashKey(emailKey(address)),
      AUTH_LIMITS.send_email.limit,
    ]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect((await send(address, "192.0.2.12")).status).toBe(429);
      const line = JSON.parse(warn.mock.calls.at(-1)![0] as string);
      expect(line).toMatchObject({ level: "warn", msg: "sign-in attempt refused", kind: "send_email", key: hashKey(emailKey(address)).slice(0, 8) });
      expect(JSON.stringify(line)).not.toContain(address);
      expect(JSON.stringify(line)).not.toContain("192.0.2.12");
    } finally {
      warn.mockRestore();
    }
  });

  it("answers 500 to a request with no player IP, rather than sharing one count", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await send(email("noip"))).status).toBe(500);
    } finally {
      error.mockRestore();
    }
  });

  // Review finding 2: N2 counts code emails Auth sent, so a refused send gives the address's count back.
  it("doesn't count a code Auth refused against the address, but counts it against the IP", async () => {
    const address = email("tap");
    expect((await send(address, "192.0.2.13")).status).toBe(200);
    // A second tap within Auth's per-address wait (1 s locally, 60 s hosted) is refused by Auth itself.
    expect(await send(address, "192.0.2.13")).toEqual({ status: 429, body: { ok: false, error: "over_email_send_rate_limit" } });
    expect(await held("send_email", emailKey(address))).toBe(1);
    expect(await held("send_ip", "192.0.2.13")).toBe(2);
  });

  it("doesn't count a request refused for its address against its IP", async () => {
    const address = email("full");
    await getPool().query("insert into private.auth_attempt (kind, key) select 'send_email', $1 from generate_series(1, $2)", [
      hashKey(emailKey(address)),
      AUTH_LIMITS.send_email.limit,
    ]);
    expect((await send(address, "192.0.2.14")).status).toBe(429);
    expect(await held("send_ip", "192.0.2.14")).toBe(0);
    expect(await held("send_email", emailKey(address))).toBe(AUTH_LIMITS.send_email.limit);
  });
});
