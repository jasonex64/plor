import { authFailure, createAuthClient } from "@/lib/auth";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";

// Sends a magic link (supabase.com/docs/guides/auth/auth-email-passwordless). A new address signs up on its
// first link, which is the default (shouldCreateUser). The link itself comes from the email template, which
// points at /auth/confirm with a token hash (same page, PKCE flow), so no redirect URL is passed here.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const { email } = await readJsonObject(request);
  if (typeof email !== "string" || email.trim() === "") throw new AppError("email_invalid", 400);

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
  if (error) throw authFailure(error);
  return Response.json({ ok: true });
});
