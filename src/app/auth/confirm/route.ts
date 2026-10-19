import { authFailure, createAuthClient, redirectHome } from "@/lib/auth";
import { AppError, handle } from "@/lib/http";

// The magic link lands here: the email template sends `token_hash` and `type=email`, and verifyOtp exchanges
// them for a session (supabase.com/docs/guides/auth/auth-email-passwordless, PKCE flow). It works on any
// device, because no code verifier from the requesting browser is needed.
export const GET = handle(async (request) => {
  const params = new URL(request.url).searchParams;
  const tokenHash = params.get("token_hash");
  if (!tokenHash || params.get("type") !== "email") return redirectHome("link_invalid");

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (error) {
    // A used or expired link is the player's to retry; anything else propagates as a 500.
    const failure = authFailure(error);
    if (failure instanceof AppError) return redirectHome(failure.code);
    throw failure;
  }
  return redirectHome();
});
