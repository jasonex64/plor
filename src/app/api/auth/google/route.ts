import { authFailure, createAuthClient } from "@/lib/auth";
import { AppError, checkProtocol, handle } from "@/lib/http";

// Starts Google sign-in with the PKCE flow (supabase.com/docs/guides/auth/social-login/auth-google).
// signInWithOAuth stores the code verifier in a cookie, which this response carries; the client then
// navigates to the returned Google URL. The way back is built from the page's own origin (browsers send Origin
// on a POST), not request.url, which Next.js fills with "localhost" (see redirectHome). Supabase only redirects
// to a URL on its allow list (supabase.com/docs/guides/auth/redirect-urls), so a forged Origin goes nowhere.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const origin = request.headers.get("origin");
  if (!origin || !URL.canParse(origin)) throw new AppError("bad_request", 400, "missing or invalid Origin header");
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${new URL(origin).origin}/auth/callback` },
  });
  if (error) throw authFailure(error);
  return Response.json({ ok: true, url: data.url });
});
