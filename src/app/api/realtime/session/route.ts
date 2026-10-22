import { readServerEnv } from "@/config/env";
import { createAuthClient, requireUserId } from "@/lib/auth";
import { AppError, checkProtocol, handle } from "@/lib/http";

// What the browser's Realtime-only client needs to join its own board (M07 D5): the project URL, the publishable key
// (both public by design, Supabase API keys), and the player's own access token, which Realtime checks against the
// own-board policy. The session is verified with getClaims first; getSession only hands that same session's token
// back to its owner, who already holds it in the session cookie.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const supabase = await createAuthClient();
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new AppError("not_signed_in", 401);
  const { url, publishableKey } = readServerEnv().supabase;
  // userId names the board topic, `board:<user id>`.
  return Response.json({
    ok: true,
    url,
    publishableKey,
    userId,
    accessToken: data.session.access_token,
    expiresAt: data.session.expires_at,
  });
});
