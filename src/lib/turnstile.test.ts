import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "./http.ts";
import { verifyTurnstile } from "./turnstile.ts";

// Only Cloudflare's Siteverify is stubbed (the network edge); the verification logic is the thing under test.
const fetchStub = vi.fn();
vi.stubGlobal("fetch", fetchStub);
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => fetchStub.mockReset());

function reply(body: string, status = 200) {
  fetchStub.mockResolvedValue(new Response(body, { status }));
}

async function refusal(token: string | null | undefined): Promise<AppError> {
  const error = await verifyTurnstile(token, "secret").then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
}

describe("verifyTurnstile", () => {
  it("passes on success: true, posting secret and response to Siteverify", async () => {
    reply(JSON.stringify({ success: true }));
    await verifyTurnstile("tok", "secret");
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
});
