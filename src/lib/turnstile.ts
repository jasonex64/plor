// The bot check's server side: a Turnstile token is valid only once Cloudflare's Siteverify says so, and any other
// outcome stops the request (docs/milestones/M18-guest-play.md, Design, "The bot check"; Siteverify:
// developers.cloudflare.com/turnstile/get-started/server-side-validation/). Nothing here passes by default.
import { AppError } from "@/lib/http";
import { log } from "@/lib/log";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Resolves only when Siteverify answers 200 with success: true. A missing token or success: false is the visitor's
// 400 captcha_failed; Siteverify unreachable (network error, non-200, bad JSON) is our side, 503 captcha_unavailable.
// Each refusal is logged once, as authFailure logs (src/lib/auth.ts). The secret is never logged.
export async function verifyTurnstile(token: string | null | undefined, secret: string): Promise<void> {
  if (!token) {
    log.warn("turnstile token missing");
    throw new AppError("captcha_failed", 400);
  }

  let result: unknown;
  try {
    const response = await fetch(SITEVERIFY_URL, { method: "POST", body: new URLSearchParams({ secret, response: token }) });
    if (!response.ok) throw new Error(`Siteverify answered ${response.status}`);
    result = await response.json();
    if (typeof result !== "object" || result === null) throw new Error("Siteverify answered something that is not an object");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("turnstile siteverify unavailable", { error: message });
    throw new AppError("captcha_unavailable", 503, message);
  }

  const { success, "error-codes": errorCodes } = result as { success?: unknown; "error-codes"?: unknown };
  if (success !== true) {
    log.warn("turnstile check failed", { errorCodes });
    throw new AppError("captcha_failed", 400);
  }
}
