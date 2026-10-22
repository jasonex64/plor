// The reports routes refuse a signed-out visitor before touching the database. The admin and non-admin paths are in
// route.db.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { POST as remove } from "./delete/route";
import { GET as list } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

beforeEach(() => {
  cookieJar.clear();
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test");
});

describe("/api/admin/reports routes (M08 8c), signed out", () => {
  it.each([
    ["GET /api/admin/reports", () => list(apiRequest("/api/admin/reports", { method: "GET" }))],
    ["POST /api/admin/reports/delete", () => remove(apiRequest("/api/admin/reports/delete", { method: "POST", body: { id: "1" } }))],
  ])("%s answers 401 not_signed_in", async (_name, call) => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "not_signed_in" });
  });
});
