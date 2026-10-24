import { authFailure, createAuthClient } from "@/lib/auth";
import { clientIp, emailKey, takeAttempt } from "@/lib/auth-limits";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";

// The player types the code from the sign-in email, and verifyOtp exchanges it for a session, whose cookies this
// response carries (supabase.com/docs/guides/auth/auth-email-passwordless, "With OTP", step 2). `type: "email"`
// covers both templates, so a new address (Confirm signup) and a returning one (Magic link) verify the same way.
// Whether the code is right, used or expired is Auth's call; it answers with a 4xx code the client shows. Spaces are
// taken out first, so a code pasted as "123 456" works (docs/milestones/M12-account.md, A6). Each check counts against
// the player's IP and the address before Auth sees it, so a code can't be guessed and a flood can't use up Auth's
// shared limit (docs/milestones/M12-12e-sign-in-limits.md, N3, N4); a wrong code doesn't use up the right one in Auth.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const { email, code } = await readJsonObject(request);
  if (typeof email !== "string" || email.trim() === "") throw new AppError("email_invalid", 400);
  if (typeof code !== "string" || code.replace(/\s/g, "") === "") throw new AppError("code_invalid", 400);

  const db = getPool();
  await takeAttempt(db, "check_ip", clientIp(request));
  await takeAttempt(db, "check_email", emailKey(email));
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ""), type: "email" });
  if (error) throw authFailure(error);
  return Response.json({ ok: true });
});
