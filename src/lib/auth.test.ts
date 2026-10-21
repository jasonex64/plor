// authFailure decides what the player reads when Supabase Auth refuses or fails (docs/milestones/M02-2f-cleanup.md, A2).
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authFailure } from "./auth";
import { AppError } from "./http";

afterEach(() => vi.restoreAllMocks());

describe("authFailure", () => {
  it("turns Auth failing on its side into 503 auth_unavailable and logs the cause", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    // supabase-js throws this for any 5xx or no response, as when Auth couldn't reach the SMTP server on staging
    // (docs/milestones/M02-sign-in-and-play.md, staging finding 1).
    const failure = authFailure(new AuthRetryableFetchError("upstream failed", 500));
    expect(failure).toBeInstanceOf(AppError);
    expect(failure).toMatchObject({ code: "auth_unavailable", status: 503 });
    expect(JSON.parse(logged.mock.calls[0][0])).toMatchObject({ level: "error", error: "upstream failed", status: 500 });
  });

  it("passes a 4xx with a code through for the player to read", () => {
    const failure = authFailure(new AuthApiError("Token has expired or is invalid", 403, "otp_expired"));
    expect(failure).toBeInstanceOf(AppError);
    expect(failure).toMatchObject({ code: "otp_expired", status: 403 });
  });

  it("leaves any other error as it is, for the route wrapper to log as a 500", () => {
    const error = new AuthApiError("unexpected", 400, undefined);
    expect(authFailure(error)).toBe(error);
  });
});
