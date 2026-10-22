// Sign-in and profile creation end to end against the local Supabase stack (`npx supabase start`; run with
// `npm run test:db`): the real Auth server sends the email, the local Mailpit inbox receives it, and the
// route handlers run with a cookie jar standing in for the browser. Only Next.js's request scope is faked.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST as signOut } from "@/app/api/auth/sign-out/route";
import { getPool } from "@/lib/db";
import { enterCode, requestCode, signIn, useLocalStack, useSession } from "@/test/local-stack";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { POST as setDisplayName } from "./display-name/route";
import { GET as getProfile, POST as createProfile } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const RUN = Date.now().toString(36);
const EMAIL_A = `${RUN}-a@example.test`;
const EMAIL_B = `${RUN}-b@example.test`;
const NEW_ADDRESS_SUBJECT = "Welcome to Plor: your sign-in code"; // supabase/config.toml, confirmation template
const RETURNING_SUBJECT = "Your Plor sign-in code"; // supabase/config.toml, magic_link template

beforeAll(useLocalStack);

afterAll(async () => {
  // Leave the local stack as it was: deleting the auth users cascades to their profiles (M02 review).
  await getPool().query("delete from auth.users where email like $1", [`${RUN}-%@example.test`]);
  await getPool().end();
});

async function profile() {
  return (await getProfile(apiRequest("/api/profile", { method: "GET" }))).json();
}

async function rename(displayName: unknown) {
  const response = await setDisplayName(apiRequest("/api/profile/display-name", { method: "POST", body: { displayName } }));
  return { status: response.status, body: await response.json() };
}

async function pick(username: string) {
  const response = await createProfile(apiRequest("/api/profile", { method: "POST", body: { username } }));
  return { status: response.status, body: await response.json() };
}

describe("sign-in and profile", () => {
  let firstCode = "";

  it("signs a new address in with the emailed code, which comes from the confirmation template", async () => {
    cookieJar.clear();
    const { subject, html, code } = await requestCode(EMAIL_A);
    expect(subject).toBe(NEW_ADDRESS_SUBJECT);
    // No link at all: a mail scanner that opens links can't use the code up (M02 2f, A3).
    expect(html).not.toMatch(/<a\s/i);
    expect(await enterCode(EMAIL_A, code)).toEqual({ status: 200, body: { ok: true } });
    expect([...cookieJar.keys()].some((name) => name.startsWith("sb-"))).toBe(true);
    expect(await profile()).toEqual({ ok: true, signedIn: true, username: null, displayName: null });
    firstCode = code;
  });

  it("refuses a code that was already used", async () => {
    const session = new Map(cookieJar);
    cookieJar.clear();
    expect(await enterCode(EMAIL_A, firstCode)).toEqual({ status: 403, body: { ok: false, error: "otp_expired" } });
    expect(await profile()).toEqual({ ok: true, signedIn: false });
    useSession(session);
  });

  it("creates the profile on the first username pick", async () => {
    expect(await pick(`a${RUN}`)).toEqual({ status: 201, body: { ok: true, username: `a${RUN}` } });
    expect(await profile()).toEqual({ ok: true, signedIn: true, username: `a${RUN}`, displayName: null });
  });

  it("sets, changes and clears the display name (M07 7a)", async () => {
    expect(await rename("  Zoë Ann ")).toEqual({ status: 200, body: { ok: true, displayName: "Zoë Ann" } });
    expect(await rename("Zed")).toEqual({ status: 200, body: { ok: true, displayName: "Zed" } });
    expect(await profile()).toEqual({ ok: true, signedIn: true, username: `a${RUN}`, displayName: "Zed" });
    expect(await rename(null)).toEqual({ status: 200, body: { ok: true, displayName: null } });
    expect(await profile()).toEqual({ ok: true, signedIn: true, username: `a${RUN}`, displayName: null });
  });

  it("rejects a display name outside the rules, with 400 display_name_invalid", async () => {
    for (const name of ["", "Zoe 😀", "a".repeat(25), "Zoe  Ann", 7]) {
      expect(await rename(name)).toEqual({ status: 400, body: { ok: false, error: "display_name_invalid" } });
    }
  });

  it("rejects a username another player has, with 409 username_taken", async () => {
    await signIn(EMAIL_B);
    expect(await pick(`a${RUN}`)).toEqual({ status: 409, body: { ok: false, error: "username_taken" } });
  });

  it("refuses a display name before a username is picked, with 409 no_profile", async () => {
    expect(await rename("Bea")).toEqual({ status: 409, body: { ok: false, error: "no_profile" } });
  });

  it("rejects a username outside the rules, with 400 username_invalid", async () => {
    expect(await pick(`B${RUN}`)).toEqual({ status: 400, body: { ok: false, error: "username_invalid" } });
    expect(await pick("ab")).toEqual({ status: 400, body: { ok: false, error: "username_invalid" } });
  });

  it("refuses a wrong code without using up the right one", async () => {
    cookieJar.clear();
    const { code } = await requestCode(EMAIL_B);
    const wrong = code.replace(/\d$/, (digit) => String((Number(digit) + 1) % 10));
    expect(await enterCode(EMAIL_B, wrong)).toEqual({ status: 403, body: { ok: false, error: "otp_expired" } });
    expect(await enterCode(EMAIL_B, code)).toEqual({ status: 200, body: { ok: true } });
  });

  it("sends a returning player the magic-link template and keeps their one profile", async () => {
    expect((await signIn(EMAIL_A)).subject).toBe(RETURNING_SUBJECT);
    expect(await pick(`c${RUN}`)).toEqual({ status: 409, body: { ok: false, error: "profile_exists" } });
  });

  it("signs out by clearing the session cookies", async () => {
    const response = await signOut(apiRequest("/api/auth/sign-out", { method: "POST" }));
    expect(response.status).toBe(200);
    expect([...cookieJar.keys()].some((name) => name.startsWith("sb-"))).toBe(false);
    expect(await profile()).toEqual({ ok: true, signedIn: false });
  });
});
