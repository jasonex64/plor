// A guest's cookie opens no account route (docs/milestones/M18-guest-play.md, Security changes 6 and acceptance; human,
// 2026-11-11, answer 28: "18d, now (Recommended)"). Every route under src/app/api is listed by scripts/routes.ts and called
// with a valid guest cookie and no Supabase session; each that isn't an exception answers 401 not_signed_in. The exceptions are
// the guest routes, which are the cookie's own, the sign-in routes, which exist for a visitor with no session, the health check, and
// GET /api/profile (human, 2026-11-11, answer 30: "Allow it as a named exception (Recommended)"): it is the site's "who is signed in"
// probe, answers a visitor with no session "signed out" and reads no guest cookie. Its POST is an account route and is called below.
// No database is needed: a route refuses before it reads one.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listRoutes } from "../../../scripts/routes.ts";
import { newGuestToken } from "@/lib/guest-token";
import { apiRequest, cookieJar } from "@/test/request-scope";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

const NOT_ACCOUNT_ROUTES = (r: { method: string; path: string }) =>
  r.path.startsWith("/api/guest/") || r.path.startsWith("/api/auth/") || r.path === "/api/health" || (r.method === "GET" && r.path === "/api/profile");

const routes = listRoutes();

beforeEach(() => {
  cookieJar.clear();
  cookieJar.set("plor_guest", newGuestToken());
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test");
});

describe("a guest cookie sent to each account route", () => {
  it("is listed from every route file, so a route can't be left out", () => {
    const files = (readdirSync(join(import.meta.dirname), { recursive: true }) as string[]).filter((name) => name.endsWith("route.ts"));
    expect(new Set(routes.map((r) => r.file)).size).toBe(files.length);
  });

  const account = routes.filter((r) => !NOT_ACCOUNT_ROUTES(r));
  it("has account routes to call", () => {
    expect(account.length).toBeGreaterThan(40);
  });

  it.each(account.map((r) => [`${r.method} ${r.path}`, r] as const))("%s answers 401 not_signed_in", async (_, route) => {
    const handler = (await import(/* @vite-ignore */ pathToFileURL(route.file).href))[route.method] as (request: Request) => Promise<Response>;
    const response = await handler(apiRequest(route.path, { method: route.method, body: route.method === "POST" ? {} : undefined }));
    expect({ status: response.status, body: await response.json() }).toEqual({ status: 401, body: { ok: false, error: "not_signed_in" } });
  });

  it("GET /api/profile, the one exception, answers exactly signed out and nothing else", async () => {
    const { GET } = await import("@/app/api/profile/route");
    const response = await GET(apiRequest("/api/profile", { method: "GET" }));
    expect({ status: response.status, body: await response.json() }).toEqual({ status: 200, body: { ok: true, signedIn: false } });
  });
});
