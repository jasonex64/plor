import { authFailure, createAuthClient } from "@/lib/auth";
import { clearAttempts, clientIp, emailKey, takeAttempt } from "@/lib/auth-limits";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";

// Emails a 6-digit sign-in code (supabase.com/docs/guides/auth/auth-email-passwordless, "With OTP", step 1); the
// player types it in and /api/auth/email/verify checks it. A new address signs up on its first code, which is the
// default (shouldCreateUser). The email template carries the code and no link, so no redirect URL is passed here.
// Codes are limited per player IP and per address before Auth is asked (docs/milestones/M12-12e-sign-in-limits.md, N1,
// N2), and a sent code clears the address's checks, so it gets its own N4.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const { email } = await readJsonObject(request);
  if (typeof email !== "string" || email.trim() === "") throw new AppError("email_invalid", 400);

  const db = getPool();
  await takeAttempt(db, "send_ip", clientIp(request));
  await takeAttempt(db, "send_email", emailKey(email));
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
  if (error) throw authFailure(error);
  await clearAttempts(db, "check_email", emailKey(email));
  return Response.json({ ok: true });
});
