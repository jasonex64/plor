// The Google callback before it reaches Supabase: bad or crafted parameters go home with a safe error code.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as callback } from "./callback/route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test");
});

function location(response: Response): string {
  expect(response.status).toBe(307);
  expect(response.headers.get("cache-control")).toContain("no-store");
  return response.headers.get("location")!;
}

describe("/auth/callback", () => {
  it("passes a cancelled Google sign-in home as its error code", async () => {
    const response = await callback(new Request("http://127.0.0.1:3000/auth/callback?error=access_denied&error_code=access_denied"));
    expect(location(response)).toBe("/?error=access_denied");
  });

  it("replaces a crafted error value with sign_in_failed", async () => {
    const response = await callback(new Request("http://127.0.0.1:3000/auth/callback?error=Call%20555-0100%20now"));
    expect(location(response)).toBe("/?error=sign_in_failed");
  });

  it("sends a callback without a code home with link_invalid", async () => {
    expect(location(await callback(new Request("http://127.0.0.1:3000/auth/callback")))).toBe("/?error=link_invalid");
  });
});
