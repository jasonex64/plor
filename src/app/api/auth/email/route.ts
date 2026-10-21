import { authFailure, createAuthClient } from "@/lib/auth";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";

// Emails a 6-digit sign-in code (supabase.com/docs/guides/auth/auth-email-passwordless, "With OTP", step 1); the
// player types it in and /api/auth/email/verify checks it. A new address signs up on its first code, which is the
// default (shouldCreateUser). The email template carries the code and no link, so no redirect URL is passed here.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const { email } = await readJsonObject(request);
  if (typeof email !== "string" || email.trim() === "") throw new AppError("email_invalid", 400);

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
  if (error) throw authFailure(error);
  return Response.json({ ok: true });
});
