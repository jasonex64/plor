// Route-level checks that need no database or Auth server: with no session cookie, getClaims() makes no network
// call. The signed-in paths are in route.db.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { POST as create } from "./create/route";
import { POST as del } from "./delete/route";
import { GET as detail } from "./detail/route";
import { POST as invite } from "./invite/route";
import { POST as join } from "./join/route";
import { POST as leave } from "./leave/route";
import { GET as preview } from "./preview/route";
import { POST as remove } from "./remove/route";
import { POST as rename } from "./rename/route";
import { GET as groups } from "./route";

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
const ID = "00000000-0000-0000-0000-000000000001";

describe("/api/groups routes (M10 10b)", () => {
  it.each([
    ["GET /api/groups", () => groups(apiRequest("/api/groups", { method: "GET" }))],
    ["POST /api/groups/create", () => create(apiRequest("/api/groups/create", { method: "POST", body: { name: "Club" } }))],
    ["GET /api/groups/detail", () => detail(apiRequest(`/api/groups/detail?id=${ID}`, { method: "GET" }))],
    ["GET /api/groups/preview", () => preview(apiRequest(`/api/groups/preview?code=${CODE}`, { method: "GET" }))],
    ["POST /api/groups/join", () => join(apiRequest("/api/groups/join", { method: "POST", body: { code: CODE } }))],
    ["POST /api/groups/leave", () => leave(apiRequest("/api/groups/leave", { method: "POST", body: { id: ID } }))],
    ["POST /api/groups/rename", () => rename(apiRequest("/api/groups/rename", { method: "POST", body: { id: ID, name: "Club" } }))],
    ["POST /api/groups/invite", () => invite(apiRequest("/api/groups/invite", { method: "POST", body: { id: ID } }))],
    ["POST /api/groups/remove", () => remove(apiRequest("/api/groups/remove", { method: "POST", body: { id: ID, username: "abc" } }))],
    ["POST /api/groups/delete", () => del(apiRequest("/api/groups/delete", { method: "POST", body: { id: ID } }))],
  ])("%s refuses a signed-out player with 401 not_signed_in", async (_name, call) => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "not_signed_in" });
  });
});
