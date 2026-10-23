// Route-level checks that need no database or Auth server: with no session cookie, getClaims() makes no
// network call. The signed-in paths are in route.db.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { POST as setDisplayName } from "./display-name/route";
import { POST as changeUsername } from "./username/route";
import { GET, POST } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

beforeEach(() => {
  cookieJar.clear();
  // Shape-valid values; nothing in these tests reaches them.
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test");
});

describe("/api/profile", () => {
  it("refuses a signed-out player with 401 not_signed_in", async () => {
    const response = await POST(apiRequest("/api/profile", { method: "POST", body: { username: "abc" } }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "not_signed_in" });
  });

  it("refuses a signed-out display name change with 401 not_signed_in (M07 7a)", async () => {
    const response = await setDisplayName(apiRequest("/api/profile/display-name", { method: "POST", body: { displayName: "Zoë" } }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "not_signed_in" });
  });

  it("refuses a signed-out username change with 401 not_signed_in (M12 12b)", async () => {
    const response = await changeUsername(apiRequest("/api/profile/username", { method: "POST", body: { username: "abc" } }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "not_signed_in" });
  });

  it("reports a signed-out player", async () => {
    const response = await GET(apiRequest("/api/profile", { method: "GET" }));
    expect(await response.json()).toEqual({ ok: true, signedIn: false });
  });

  it.each([null, "0"])("answers 409 client_outdated when x-protocol is %s", async (protocol) => {
    const response = await GET(apiRequest("/api/profile", { method: "GET", protocol }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "client_outdated" });
  });

  // No CDN may store a response that can carry a session (src/lib/http.ts, noStore).
  it("marks success and error responses as not storable", async () => {
    const ok = await GET(apiRequest("/api/profile", { method: "GET" }));
    const refused = await POST(apiRequest("/api/profile", { method: "POST", body: { username: "abc" } }));
    for (const response of [ok, refused]) expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
