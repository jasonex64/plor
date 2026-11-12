import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITEVERIFY_TIMEOUT_MS } from "@/config/tunables";
import { AppError } from "./http.ts";
import { verifyTurnstile } from "./turnstile.ts";

// Only Cloudflare's Siteverify is stubbed (the network edge); the verification logic is the thing under test.
const fetchStub = vi.fn();
vi.stubGlobal("fetch", fetchStub);
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const ALLOWED = ["plor.app", "www.plor.app"];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  fetchStub.mockReset();
  vi.useRealTimers();
});

function reply(body: string, status = 200) {
  fetchStub.mockResolvedValue(new Response(body, { status }));
}

async function refusal(token: string | null | undefined): Promise<AppError> {
  const error = await verifyTurnstile(token, "secret", ALLOWED).then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
}

describe("verifyTurnstile", () => {
  it("passes on success: true, posting secret and response to Siteverify", async () => {
    reply(JSON.stringify({ success: true, hostname: "plor.app" }));
    await verifyTurnstile("tok", "secret", ALLOWED);
    const [url, init] = fetchStub.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init.method).toBe("POST");
    expect(new URLSearchParams(init.body).get("secret")).toBe("secret");
    expect(new URLSearchParams(init.body).get("response")).toBe("tok");
  });

  it.each([null, undefined, ""])("refuses a missing token (%s) with 400 captcha_failed and never calls Cloudflare", async (token) => {
    const error = await refusal(token);
    expect([error.code, error.status]).toEqual(["captcha_failed", 400]);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("refuses success: false (e.g. timeout-or-duplicate) with 400 captcha_failed", async () => {
    reply(JSON.stringify({ success: false, "error-codes": ["timeout-or-duplicate"] }));
    const error = await refusal("tok");
    expect([error.code, error.status]).toEqual(["captcha_failed", 400]);
  });

  it("refuses anything but success: true", async () => {
    reply(JSON.stringify({ success: "true" }));
    expect((await refusal("tok")).code).toBe("captcha_failed");
  });

  it.each([
    ["a non-200 reply", () => reply("{}", 500)],
    ["garbled JSON", () => reply("<html>")],
    ["a JSON reply that is not an object", () => reply("null")],
    ["a network error", () => fetchStub.mockRejectedValue(new TypeError("fetch failed"))],
  ])("refuses %s with 503 captcha_unavailable", async (_name, arrange) => {
    arrange();
    const error = await refusal("tok");
    expect([error.code, error.status]).toEqual(["captcha_unavailable", 503]);
  });

  // Cloudflare: "Set reasonable timeouts. Do not wait indefinitely for Siteverify responses." The human chose 10 seconds
  // (2026-11-11; M18 ticket, Open questions 2). The stub honours the abort signal as a real fetch does.
  it("gives up after the timeout and fails closed with 503 captcha_unavailable", async () => {
    fetchStub.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason))),
    );
    let settled = false;
    const pending = refusal("tok").finally(() => (settled = true));
    await vi.advanceTimersByTimeAsync(SITEVERIFY_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const error = await pending;
    expect([error.code, error.status]).toEqual(["captcha_unavailable", 503]);
  });

  it("refuses a check solved on another site with 400 captcha_failed", async () => {
    reply(JSON.stringify({ success: true, hostname: "evil.example" }));
    const error = await refusal("tok");
    expect([error.code, error.status]).toEqual(["captcha_failed", 400]);
  });

  it.each([["no hostname", {}], ["a non-string hostname", { hostname: 7 }], ["an empty hostname", { hostname: "" }]])(
    "refuses a reply with %s",
    async (_name, extra) => {
      reply(JSON.stringify({ success: true, ...extra }));
      expect((await refusal("tok")).code).toBe("captcha_failed");
    },
  );

  it("passes a hostname that is any one of the allowed ones", async () => {
    reply(JSON.stringify({ success: true, hostname: "www.plor.app" }));
    await verifyTurnstile("tok", "secret", ALLOWED);
  });
});
