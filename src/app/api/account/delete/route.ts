import { createAuthClient, requireUserId } from "@/lib/auth";
import { deleteAccount } from "@/lib/account";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { log } from "@/lib/log";

// The signed-in player deletes their own account, confirmed by typing their username (docs/milestones/M12-account.md,
// 12c; A4, A7). Then this device signs out (A9 (a)): Auth no longer knows the session, which signOut ignores (auth-js
// 2.118.0, _signOut: a 404, 401 or 403 still removes the session), so it only clears the cookies here. Any other copy
// of the access token stays valid until it expires, and can't write (src/lib/account.plor-app.db.test.ts).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const supabase = await createAuthClient();
  const userId = await requireUserId(supabase);
  const typed = (await readJsonObject(request)).username;
  // A NUL character can't reach Postgres text (22021), and no username holds one (M19 19b).
  if (typeof typed !== "string" || typed.includes("\0") || !(await deleteAccount(getPool(), userId, typed))) throw new AppError("username_mismatch", 400);
  const { error } = await supabase.auth.signOut({ scope: "local" });
  // The account is gone either way, so the reply says so (M19 19a, answer 6: "Say it's deleted").
  if (error) log.error("account deleted, sign-out failed", { error: String(error) });
  return Response.json({ ok: true });
});
