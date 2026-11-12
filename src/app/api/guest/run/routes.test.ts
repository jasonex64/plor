// The guest run routes' refusals that come before the database (M18 18c). The played runs, the bot check against the
// real Siteverify and the row counts are in routes.db.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, cookieJar } from "@/test/request-scope";
import { POST as answer } from "./answer/route";
import { POST as next } from "./next/route";
import { POST as start } from "./start/route";

vi.mock("next/headers", () => import("@/test/request-scope").then((m) => m.nextHeaders));
vi.mock("next/server", () => import("@/test/request-scope").then((m) => m.nextServer()));

// Cloudflare's published always-pass test keys (developers.cloudflare.com/turnstile/troubleshooting/testing/); public.
beforeEach(() => {
  cookieJar.clear();
  vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test");
  vi.stubEnv("TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
  vi.stubEnv("TURNSTILE_ALLOWED_HOSTNAMES", "example.com");
});

async function call(response: Promise<Response>) {
  const r = await response;
  return { status: r.status, body: await r.json() };
}

describe("guest start, refused before anything is created", () => {
  it("answers 400 captcha_failed to a missing or non-text bot-check token, and sets no cookie", async () => {
    for (const body of [{}, { turnstileToken: "" }, { turnstileToken: 7 }]) {
      expect(await call(start(apiRequest("/api/guest/run/start", { method: "POST", body })))).toEqual({
        status: 400,
        body: { ok: false, error: "captcha_failed" },
      });
    }
    expect(cookieJar.size).toBe(0);
  });

  it("answers 409 client_outdated to an old client, as the signed-in routes do", async () => {
    const r = await call(start(apiRequest("/api/guest/run/start", { method: "POST", protocol: null, body: {} })));
    expect(r).toEqual({ status: 409, body: { ok: false, error: "client_outdated" } });
  });
});

describe("guest answer and next without a guest cookie", () => {
  it.each([
    ["POST /api/guest/run/next", () => next(apiRequest("/api/guest/run/next", { method: "POST" }))],
    ["POST /api/guest/run/answer", () => answer(apiRequest("/api/guest/run/answer", { method: "POST", body: { index: 0, text: "x" } }))],
  ])("%s answers 404 no_run", async (_, callRoute) => {
    expect(await call(callRoute())).toEqual({ status: 404, body: { ok: false, error: "no_run" } });
  });

  it("treats a cookie that is not a token of the right shape as no cookie", async () => {
    cookieJar.set("plor_guest", "short");
    expect(await call(next(apiRequest("/api/guest/run/next", { method: "POST" })))).toEqual({ status: 404, body: { ok: false, error: "no_run" } });
  });
});

describe("guest answer, bad bodies", () => {
  it.each([
    [{ index: -1, text: "x" }],
    [{ index: 1.5, text: "x" }],
    [{ index: 0, text: "   " }],
    [{ index: 0 }],
  ])("%j answers 400 bad_request", async (body) => {
    cookieJar.set("plor_guest", "A".repeat(27));
    const r = await call(answer(apiRequest("/api/guest/run/answer", { method: "POST", body })));
    expect(r).toMatchObject({ status: 400, body: { ok: false, error: "bad_request" } });
  });
});
