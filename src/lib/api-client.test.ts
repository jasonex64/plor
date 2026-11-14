// A reply that isn't the app's JSON (docs/milestones/M19-pre-beta-fixes.md, 19a; the 2026-11-11 audit's W8): a
// platform error page becomes the same ApiError a route's own 500 gives, not a SyntaxError.
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api-client";

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("turns a failed reply that isn't JSON into the internal ApiError", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>Bad Gateway</html>", { status: 502, headers: { "content-type": "text/html" } }));
    const error = await api("/api/x", { method: "GET" }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "internal", status: 502 });
  });

  it("still carries a route's own error code", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ ok: false, error: "bad_request" }, { status: 400 }));
    expect(await api("/api/x", { method: "GET" }).catch((e) => e)).toMatchObject({ code: "bad_request", status: 400 });
  });
});
