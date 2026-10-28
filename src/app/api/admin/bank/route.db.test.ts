// The question bank route against the local stack (run with `npm run test:db`; docs/milestones/M13-13d-the-question-bank.md):
// signed out, it answers 401 before reading anything (13d review; 13f-4c). The e2e covers the admin and a player.
import { describe, expect, it, vi } from "vitest";
import { useLocalStack } from "@/test/local-stack";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { GET } from "./route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

describe("GET /api/admin/bank", () => {
  it("answers 401 to a signed-out request", async () => {
    useLocalStack();
    cookieJar.clear();
    const response = await GET(apiRequest("/api/admin/bank", { method: "GET" }));
    expect(response.status).toBe(401);
  });
});
