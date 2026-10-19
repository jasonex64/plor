// Sign-in and profile creation end to end against the local Supabase stack (`npx supabase start`; run with
// `npm run test:db`): the real Auth server sends the email, the local Mailpit inbox receives it, and the
// route handlers run with a cookie jar standing in for the browser. Only Next.js's request scope is faked.
import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as sendLink } from "@/app/api/auth/email/route";
import { POST as signOut } from "@/app/api/auth/sign-out/route";
import { GET as confirm } from "@/app/auth/confirm/route";
import { getPool } from "@/lib/db";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { GET as getProfile, POST as createProfile } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

// The local stack's documented default ports (supabase.com/docs/guides/local-development/cli/getting-started).
const MAILPIT = "http://127.0.0.1:54324";
const RUN = Date.now().toString(36);
const EMAIL_A = `${RUN}-a@example.test`;
const EMAIL_B = `${RUN}-b@example.test`;
const NEW_ADDRESS_SUBJECT = "Welcome to Plor: your sign-in link"; // supabase/config.toml, confirmation template
const RETURNING_SUBJECT = "Your Plor sign-in link"; // supabase/config.toml, magic_link template

beforeAll(() => {
  // The publishable key comes from the running stack and is never printed.
  const status = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const key = /^PUBLISHABLE_KEY="?([^"\n]+)/m.exec(status)?.[1];
  if (!key) throw new Error("local Supabase stack is not running (npx supabase start)");
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", key);
});

afterAll(async () => {
  // Leave the local stack as it was: deleting the auth users cascades to their profiles (M02 review).
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().end();
});

type MailSummary = { ID: string; Subject: string };

async function inbox(email: string): Promise<MailSummary[]> {
  const response = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
  if (!response.ok) throw new Error(`Mailpit search failed: ${response.status}`);
  return (await response.json()).messages;
}

// Requests a link like the sign-in form does and returns the email that arrived.
async function requestLink(email: string): Promise<{ subject: string; link: string }> {
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

async function openLink(link: string): Promise<string> {
  const response = await confirm(new Request(link));
  expect(response.status).toBe(307);
  return response.headers.get("location")!;
}

async function signIn(email: string): Promise<string> {
  cookieJar.clear();
  const { subject, link } = await requestLink(email);
  expect(await openLink(link)).toBe("/");
  return subject;
}

async function profile() {
  return (await getProfile(apiRequest("/api/profile", { method: "GET" }))).json();
}

async function pick(username: string) {
  const response = await createProfile(apiRequest("/api/profile", { method: "POST", body: { username } }));
  return { status: response.status, body: await response.json() };
}

describe("sign-in and profile", () => {
  let firstLink = "";

  it("signs a new address in from the emailed link, which comes from the confirmation template", async () => {
    cookieJar.clear();
    const { subject, link } = await requestLink(EMAIL_A);
    expect(subject).toBe(NEW_ADDRESS_SUBJECT);
    expect(await openLink(link)).toBe("/");
    expect([...cookieJar.keys()].some((name) => name.startsWith("sb-"))).toBe(true);
    expect(await profile()).toEqual({ ok: true, signedIn: true, username: null });
    firstLink = link;
  });

  it("refuses a link that was already used", async () => {
    expect(await openLink(firstLink)).toBe("/?error=otp_expired");
  });

  it("creates the profile on the first username pick", async () => {
    expect(await pick(`a${RUN}`)).toEqual({ status: 201, body: { ok: true, username: `a${RUN}` } });
    expect(await profile()).toEqual({ ok: true, signedIn: true, username: `a${RUN}` });
  });

  it("rejects a username another player has, with 409 username_taken", async () => {
    await signIn(EMAIL_B);
    expect(await pick(`a${RUN}`)).toEqual({ status: 409, body: { ok: false, error: "username_taken" } });
  });

  it("rejects a username outside the rules, with 400 username_invalid", async () => {
    expect(await pick(`B${RUN}`)).toEqual({ status: 400, body: { ok: false, error: "username_invalid" } });
    expect(await pick("ab")).toEqual({ status: 400, body: { ok: false, error: "username_invalid" } });
  });

  it("sends a returning player the magic-link template and keeps their one profile", async () => {
    expect(await signIn(EMAIL_A)).toBe(RETURNING_SUBJECT);
    expect(await pick(`c${RUN}`)).toEqual({ status: 409, body: { ok: false, error: "profile_exists" } });
  });

  it("signs out by clearing the session cookies", async () => {
    const response = await signOut(apiRequest("/api/auth/sign-out", { method: "POST" }));
    expect(response.status).toBe(200);
    expect([...cookieJar.keys()].some((name) => name.startsWith("sb-"))).toBe(false);
    expect(await profile()).toEqual({ ok: true, signedIn: false });
  });
});
