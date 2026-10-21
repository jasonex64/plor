import { authFailure, createAuthClient } from "@/lib/auth";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";

// The player types the code from the sign-in email, and verifyOtp exchanges it for a session, whose cookies this
// response carries (supabase.com/docs/guides/auth/auth-email-passwordless, "With OTP", step 2). `type: "email"`
// covers both templates, so a new address (Confirm signup) and a returning one (Magic link) verify the same way.
// Whether the code is right, used or expired is Auth's call; it answers with a 4xx code the client shows.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const { email, code } = await readJsonObject(request);
  if (typeof email !== "string" || email.trim() === "") throw new AppError("email_invalid", 400);
  if (typeof code !== "string" || code.trim() === "") throw new AppError("code_invalid", 400);

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
  if (error) throw authFailure(error);
  return Response.json({ ok: true });
});
