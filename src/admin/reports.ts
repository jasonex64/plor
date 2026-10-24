// Reported comments for admins (docs/milestones/M08-comments-and-reactions.md, 8c and D5): every comment with a report,
// until an admin deletes it, and then a record of who deleted it (M12 12d, docs/milestones/M12-12d-decided-fixes.md).
// Nothing is hidden automatically. The routes check the admin before calling these.
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";

// username and name identify the author (name is the display name if set, else the username: M07 7a). reports is
// how many players reported it; firstReportedAt is when the first did.
export type ReportedComment = { id: string; date: string; username: string; name: string; body: string; reports: number; firstReportedAt: string };

// Oldest first report first, so the longest-waiting comes first.
export async function listReports(db: Db): Promise<ReportedComment[]> {
  const { rows } = await db.query<{ id: string; date: string; username: string; name: string; body: string; reports: number; first: Date }>(
    `select c.id::text as id, c.puzzle_date::text as date, p.username::text as username,
            coalesce(p.display_name, p.username::text) as name, c.body, count(*)::int as reports, min(r.created_at) as first
     from private.comment_report r
     join private.comment c on c.id = r.comment_id
     join private.profile p on p.user_id = c.user_id
     group by c.id, p.user_id
     order by min(r.created_at), c.id`,
  );
  return rows.map(({ first, ...r }) => ({ ...r, firstReportedAt: first.toISOString() }));
}

// A deleted comment's record: who deleted it and when, and whose it was. admin and author are current usernames.
export type DeletedComment = { id: string; deletedAt: string; admin: string; author: string; body: string };

// Newest first. Every record: the beta is small, and a page size would be a human number (12d, Numbers).
export async function listDeletions(db: Db): Promise<DeletedComment[]> {
  const { rows } = await db.query<{ id: string; deleted_at: Date; admin: string; author: string; body: string }>(
    `select d.comment_id::text as id, d.deleted_at, a.username::text as admin, w.username::text as author, d.body
     from private.comment_deletion d
     join private.profile a on a.user_id = d.admin_id
     join private.profile w on w.user_id = d.author_id
     order by d.deleted_at desc, d.id desc`,
  );
  return rows.map(({ deleted_at, ...r }) => ({ ...r, deletedAt: deleted_at.toISOString() }));
}

// Deletes a reported comment for everyone and for good, with its reports and reactions (D4, D5), and records which
// admin did (12d): one guarded function does both (supabase/migrations/20261024031547_comment_deletion_record.sql).
// Only a reported comment: anything else is the same 404 as a missing one.
export async function deleteReportedComment(db: Db, adminId: string, id: string): Promise<void> {
  const { rows } = await db.query<{ deleted: boolean }>("select private.delete_reported_comment($1, $2) as deleted", [adminId, id]);
  if (!rows[0].deleted) throw new AppError("comment_not_found", 404);
}
