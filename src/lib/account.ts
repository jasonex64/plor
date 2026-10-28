// Deleting the signed-in player's account (docs/milestones/M12-account.md, 12c; A4, A5, A7). The database does all of
// it (supabase/migrations/20261028140000_baseline.sql): it checks the typed username, leaves the player's
// groups, then deletes their auth.users row, whose cascades remove the rest.
import type { Db } from "@/lib/db";

// False when the username isn't the player's own, and nothing was deleted.
export async function deleteAccount(db: Db, userId: string, username: string): Promise<boolean> {
  const { rows } = await db.query<{ deleted: boolean }>("select private.delete_account($1, $2) as deleted", [userId, username]);
  return rows[0].deleted;
}
