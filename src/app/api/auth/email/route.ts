import { authFailure, createAuthClient } from "@/lib/auth";
import { clearAttempts, clientIp, emailKey, giveBackAttempt, takeAttempt } from "@/lib/auth-limits";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";

// Emails a 6-digit sign-in code (supabase.com/docs/guides/auth/auth-email-passwordless, "With OTP", step 1); the
// player types it in and /api/auth/email/verify checks it. A new address signs up on its first code, which is the
// default (shouldCreateUser). The email template carries the code and no link, so no redirect URL is passed here.
// Codes are limited per player IP and per address before Auth is asked (docs/milestones/M12-12e-sign-in-limits.md, N1,
// N2). The address's count is taken first and given back when the request goes no further, so it counts only the
// codes Auth sent (a double tap within Auth's 60 s doesn't use one up); the IP's counts every request that reached
// Auth, since each one spends Auth's shared limit. A sent code clears the address's checks, so it gets its own N4.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const { email } = await readJsonObject(request);
  if (typeof email !== "string" || email.trim() === "") throw new AppError("email_invalid", 400);

  const db = getPool();
  const ip = clientIp(request);
  const address = emailKey(email);
  await takeAttempt(db, "send_email", address);
  try {
    await takeAttempt(db, "send_ip", ip);
  } catch (err) {
    await giveBackAttempt(db, "send_email", address);
    throw err;
  }
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
  if (error) {
    await giveBackAttempt(db, "send_email", address);
    throw authFailure(error);
  }
  await clearAttempts(db, "check_email", address);
  return Response.json({ ok: true });
});
