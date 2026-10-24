import { createAuthClient, requireUserId } from "@/lib/auth";
import { deleteAccount } from "@/lib/account";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";

// The signed-in player deletes their own account, confirmed by typing their username (docs/milestones/M12-account.md,
// 12c; A4, A7). Then this device signs out (A9 (a)): Auth no longer knows the session, which signOut ignores (auth-js
// 2.118.0, _signOut: a 404, 401 or 403 still removes the session), so it only clears the cookies here. Any other copy
// of the access token stays valid until it expires, and can't write (src/lib/account.plor-app.db.test.ts).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const supabase = await createAuthClient();
  const userId = await requireUserId(supabase);
  const typed = (await readJsonObject(request)).username;
  if (typeof typed !== "string" || !(await deleteAccount(getPool(), userId, typed))) throw new AppError("username_mismatch", 400);
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
  return Response.json({ ok: true });
});
