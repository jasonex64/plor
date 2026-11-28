import type { Db } from "@/lib/db";

// Whether the player is in private.admin: every admin route and page checks it first (docs/milestones/M06-puzzle-entry.md).
export async function isAdmin(db: Db, userId: string): Promise<boolean> {
  const { rows } = await db.query("select 1 from private.admin where user_id = $1", [userId]);
  return rows.length > 0;
}
