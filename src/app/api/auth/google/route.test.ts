// signInWithOAuth only builds the authorize URL and stores the PKCE verifier, so no Auth server is needed.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar } from "@/test/request-scope";
import { PROTOCOL_VERSION } from "@/lib/protocol";
import { POST } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

beforeEach(() => {
  cookieJar.clear();
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test");
});

function start(origin: string | null): Promise<Response> {
  const headers = new Headers({ "x-protocol": String(PROTOCOL_VERSION) });
  if (origin) headers.set("origin", origin);
  // request.url says localhost, as Next.js builds it; the way back must come from Origin instead.
  return POST(new Request("http://localhost:3000/api/auth/google", { method: "POST", headers }));
}

describe("/api/auth/google", () => {
  it("sends Google back to the page's own origin and stores the PKCE verifier", async () => {
    const response = await start("http://127.0.0.1:3000");
    const { url } = await response.json();
    const authorize = new URL(url);
    expect(authorize.origin + authorize.pathname).toBe("http://127.0.0.1:54321/auth/v1/authorize");
    expect(authorize.searchParams.get("provider")).toBe("google");
    expect(authorize.searchParams.get("redirect_to")).toBe("http://127.0.0.1:3000/auth/callback");
    expect([...cookieJar.keys()].some((name) => name.includes("code-verifier"))).toBe(true);
  });

  it("refuses a request without an Origin header", async () => {
    const response = await start(null);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "bad_request" });
  });
});
