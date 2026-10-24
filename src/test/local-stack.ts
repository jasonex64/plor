// Shared helpers for `*.db.test.ts` files that sign in through the local Supabase stack (`npx supabase start`):
// the real Auth server sends the email, the local Mailpit inbox receives it, and route handlers run with the
// cookie jar from request-scope.ts standing in for the browser. Each test file still declares its own vi.mock
// lines for next/headers and next/server (vitest hoists them per file).
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { expect, vi } from "vitest";
import { POST as sendCode } from "@/app/api/auth/email/route";
import { POST as verifyCode } from "@/app/api/auth/email/verify/route";
import { apiRequest, cookieJar } from "./request-scope";

// The local stack's documented defaults (supabase.com/docs/guides/local-development/cli/getting-started).
export const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const MAILPIT = "http://127.0.0.1:54324";

// Points the server env at the local stack. The publishable key comes from the running stack, never printed.
export function useLocalStack(): void {
  const status = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const key = /^PUBLISHABLE_KEY="?([^"\n]+)/m.exec(status)?.[1];
  if (!key) throw new Error("local Supabase stack is not running (npx supabase start)");
  vi.stubEnv("DATABASE_URL", LOCAL_DATABASE_URL);
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", key);
}

type MailSummary = { ID: string; Subject: string };

async function inbox(email: string): Promise<MailSummary[]> {
  const response = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
  if (!response.ok) throw new Error(`Mailpit search failed: ${response.status}`);
  return (await response.json()).messages;
}

// A player IP of its own for each test address, so the sign-in limits (M12 12e) count each test player apart, as they
// would count players on different connections. 10.0.0.0/8 is private: no real player has one.
export function ipFor(email: string): string {
  const [a, b, c] = createHash("sha256").update(email).digest();
  return `10.${a}.${b}.${c}`;
}

// Requests a code like the sign-in form does and returns the email that arrived, with the code read from the
// <strong> that supabase/templates/sign_in_code.html puts it in.
export async function requestCode(email: string): Promise<{ subject: string; html: string; code: string }> {
  const before = (await inbox(email)).length;
  const response = await sendCode(apiRequest("/api/auth/email", { method: "POST", body: { email }, ip: ipFor(email) }));
  expect(response.status).toBe(200);
  await expect.poll(async () => (await inbox(email)).length).toBe(before + 1);
  const [newest] = await inbox(email);
  const message = await (await fetch(`${MAILPIT}/api/v1/message/${newest.ID}`)).json();
  const code = /<strong>(\d+)<\/strong>/.exec(message.HTML)?.[1];
  if (!code) throw new Error(`no code in the email: ${message.HTML}`);
  return { subject: newest.Subject, html: message.HTML, code };
}

// Types a code into the sign-in form and returns the API's answer.
export async function enterCode(email: string, code: string): Promise<{ status: number; body: unknown }> {
  const response = await verifyCode(apiRequest("/api/auth/email/verify", { method: "POST", body: { email, code }, ip: ipFor(email) }));
  return { status: response.status, body: await response.json() };
}

// Signs in with a fresh jar and returns a copy of the session cookies, for switching players with useSession.
export async function signIn(email: string): Promise<{ subject: string; session: Map<string, string> }> {
  cookieJar.clear();
  const { subject, code } = await requestCode(email);
  expect(await enterCode(email, code)).toEqual({ status: 200, body: { ok: true } });
  return { subject, session: new Map(cookieJar) };
}

export function useSession(session: Map<string, string>): void {
  cookieJar.clear();
  for (const [name, value] of session) cookieJar.set(name, value);
}
