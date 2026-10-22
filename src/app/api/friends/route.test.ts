// Route-level checks that need no database or Auth server: with no session cookie, getClaims() makes no network
// call. The signed-in paths are in route.db.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { POST as add } from "./add/route";
import { POST as invite } from "./invite/route";
import { GET as preview } from "./preview/route";
import { POST as remove } from "./remove/route";
import { GET as friends } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

beforeEach(() => {
  cookieJar.clear();
  // Shape-valid values; nothing in these tests reaches them.
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test");
});

const CODE = "abcdefghijklmnopqrst-_";

describe("/api/friends routes (M07 7b)", () => {
  it.each([
    ["GET /api/friends", () => friends(apiRequest("/api/friends", { method: "GET" }))],
    ["POST /api/friends/invite", () => invite(apiRequest("/api/friends/invite", { method: "POST", body: {} }))],
    ["GET /api/friends/preview", () => preview(apiRequest(`/api/friends/preview?code=${CODE}`, { method: "GET" }))],
    ["POST /api/friends/add", () => add(apiRequest("/api/friends/add", { method: "POST", body: { code: CODE } }))],
    ["POST /api/friends/remove", () => remove(apiRequest("/api/friends/remove", { method: "POST", body: { username: "abc" } }))],
  ])("%s refuses a signed-out player with 401 not_signed_in", async (_name, call) => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "not_signed_in" });
  });
});
