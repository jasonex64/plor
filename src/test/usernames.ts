// A stale page names a player by a username that has since changed hands (docs/milestones/M19-pre-beta-fixes.md, 19e).
// This makes that real: `from` gives up their username for `newName`, and `to` takes the old one. The 30-day wait
// between changes and the 30-day hold on a given-up name are rules the real change has to obey, so the fixture moves
// them out of the way directly (src/app/api/players/[username]/route.db.test.ts does the same).
import type { Pool } from "pg";

export async function handNameOver(db: Pool, from: { userId: string; username: string }, to: { userId: string }, newName: string): Promise<void> {
  await db.query("update private.profile set username_changed_at = username_changed_at - interval '31 days' where user_id = any($1::uuid[])", [
    [from.userId, to.userId],
  ]);
  await db.query("update private.profile set username = $2 where user_id = $1", [from.userId, newName]);
  await db.query("delete from private.held_username where user_id = $1", [from.userId]);
  await db.query("update private.profile set username = $2 where user_id = $1", [to.userId, from.username]);
}
