// A deletion that committed, then a sign-out that failed (docs/milestones/M19-pre-beta-fixes.md, 19a, answer 6:
// "Say it's deleted"): the reply is ok, and the failure is one logged error. Auth and the database are stand-ins
// here, since a failing sign-out can't be had from the local stack; the real path is route.db.test.ts.
import { afterEach, expect, it, vi } from "vitest";
import { apiRequest } from "@/test/request-scope";
import { POST } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));
vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));
vi.mock("@/lib/account", () => ({ deleteAccount: async () => true }));
vi.mock("@/lib/auth", () => ({
  createAuthClient: async () => ({ auth: { signOut: async () => ({ error: new Error("Auth unreachable") }) } }),
  requireUserId: async () => "00000000-0000-0000-0000-000000000001",
}));

afterEach(() => vi.restoreAllMocks());

it("answers ok for a deletion that worked when the sign-out fails, and logs the failure once", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  const response = await POST(apiRequest("/api/account/delete", { method: "POST", body: { username: "gone" } }));
  expect({ status: response.status, body: await response.json() }).toEqual({ status: 200, body: { ok: true } });
  expect(logged.mock.calls.map(([line]) => JSON.parse(String(line)).msg)).toEqual(["account deleted, sign-out failed"]);
});
