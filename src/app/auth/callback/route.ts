import { authFailure, createAuthClient, redirectHome } from "@/lib/auth";
import { AppError, handle } from "@/lib/http";

// Google sends the player back through Supabase to here with a `code`, exchanged for a session with the
// verifier cookie set when sign-in started (supabase.com/docs/guides/auth/social-login/auth-google, PKCE).
// If the player cancels, Supabase sends `error` / `error_code` instead.
export const GET = handle(async (request) => {
  const params = new URL(request.url).searchParams;
  const denied = params.get("error_code") ?? params.get("error");
  if (denied) return redirectHome(denied);
  const code = params.get("code");
  if (!code) return redirectHome("link_invalid");

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const failure = authFailure(error);
    if (failure instanceof AppError) return redirectHome(failure.code);
    throw failure;
  }
  return redirectHome();
});
