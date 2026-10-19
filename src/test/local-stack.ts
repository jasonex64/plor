// Shared helpers for `*.db.test.ts` files that sign in through the local Supabase stack (`npx supabase start`):
// the real Auth server sends the email, the local Mailpit inbox receives it, and route handlers run with the
// cookie jar from request-scope.ts standing in for the browser. Each test file still declares its own vi.mock
// lines for next/headers and next/server (vitest hoists them per file).
import { execSync } from "node:child_process";
import { expect, vi } from "vitest";
import { POST as sendLink } from "@/app/api/auth/email/route";
import { GET as confirm } from "@/app/auth/confirm/route";
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

// Requests a link like the sign-in form does and returns the email that arrived.
export async function requestLink(email: string): Promise<{ subject: string; link: string }> {
  const before = (await inbox(email)).length;
  const response = await sendLink(apiRequest("/api/auth/email", { method: "POST", body: { email } }));
  expect(response.status).toBe(200);
  await expect.poll(async () => (await inbox(email)).length).toBe(before + 1);
  const [newest] = await inbox(email);
  const message = await (await fetch(`${MAILPIT}/api/v1/message/${newest.ID}`)).json();
  const href = /href="([^"]*\/auth\/confirm\?[^"]*)"/.exec(message.HTML)?.[1];
  if (!href) throw new Error(`no /auth/confirm link in the email: ${message.HTML}`);
  return { subject: newest.Subject, link: href.replaceAll("&amp;", "&") };
}

// Opens an emailed link and returns where it redirected.
export async function openLink(link: string): Promise<string> {
  const response = await confirm(new Request(link));
  expect(response.status).toBe(307);
  return response.headers.get("location")!;
}

// Signs in with a fresh jar and returns a copy of the session cookies, for switching players with useSession.
export async function signIn(email: string): Promise<{ subject: string; session: Map<string, string> }> {
  cookieJar.clear();
  const { subject, link } = await requestLink(email);
  expect(await openLink(link)).toBe("/");
  return { subject, session: new Map(cookieJar) };
}

export function useSession(session: Map<string, string>): void {
  cookieJar.clear();
  for (const [name, value] of session) cookieJar.set(name, value);
}
