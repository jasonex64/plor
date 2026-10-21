// The run routes refuse a signed-out player before touching the database (M02 2a criterion: a player can't
// start a run without being signed in). The signed-in paths are in runs.db.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { POST as answer } from "./answer/route";
import { POST as next } from "./next/route";
import { GET as state } from "./route";
import { POST as start } from "./start/route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

beforeEach(() => {
  cookieJar.clear();
  // Shape-valid values; nothing in these tests reaches them.
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test");
});

describe("run routes, signed out", () => {
  it.each([
    ["POST /api/run/start", () => start(apiRequest("/api/run/start", { method: "POST" }))],
    ["GET /api/run", () => state(apiRequest("/api/run", { method: "GET" }))],
    ["POST /api/run/next", () => next(apiRequest("/api/run/next", { method: "POST" }))],
    ["POST /api/run/answer", () => answer(apiRequest("/api/run/answer", { method: "POST", body: { index: 0, text: "x" } }))],
  ])("%s answers 401 not_signed_in", async (_, call) => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "not_signed_in" });
  });
});
