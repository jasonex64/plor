// Route-level checks that need no database or Auth server: with no session cookie, getClaims() makes no network
// call. The signed-in paths are in route.db.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { POST as remove } from "./delete/route";
import { POST as report } from "./report/route";
import { GET as thread, POST as post } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

beforeEach(() => {
  cookieJar.clear();
  // Shape-valid values; nothing in these tests reaches them.
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test");
});

describe("/api/comments routes (M08 8a, 8c)", () => {
  it.each([
    ["GET /api/comments", () => thread(apiRequest("/api/comments", { method: "GET" }))],
    ["POST /api/comments", () => post(apiRequest("/api/comments", { method: "POST", body: { date: "2026-10-22", body: "hi" } }))],
    ["POST /api/comments/delete", () => remove(apiRequest("/api/comments/delete", { method: "POST", body: { id: "1" } }))],
    ["POST /api/comments/report", () => report(apiRequest("/api/comments/report", { method: "POST", body: { id: "1" } }))],
  ])("%s refuses a signed-out player with 401 not_signed_in", async (_name, call) => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "not_signed_in" });
  });
});
