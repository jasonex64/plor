// Route-level checks that need no database or Auth server: with no session cookie, getClaims() makes no network
// call. The signed-in paths are in route.db.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { GET as session } from "../realtime/session/route";
import { GET as board } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

beforeEach(() => {
  cookieJar.clear();
  // Shape-valid values; nothing in these tests reaches them.
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test");
});

describe("live board routes (M07 7c)", () => {
  it.each([
    ["GET /api/board", () => board(apiRequest("/api/board", { method: "GET" }))],
    // The publishable key and URL go only to signed-in players, with their own token.
    ["GET /api/realtime/session", () => session(apiRequest("/api/realtime/session", { method: "GET" }))],
  ])("%s refuses a signed-out player with 401 not_signed_in", async (_name, call) => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "not_signed_in" });
  });
});
