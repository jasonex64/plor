// Reported comments for admins (docs/milestones/M08-comments-and-reactions.md, 8c and D5): every comment with an open
// report, until an admin deletes or keeps it, and then a record of who did (M12 12d, docs/milestones/
// M12-12d-decided-fixes.md; keeping, docs/milestones/M14-14b-2b-2-admin-build.md, 14b-2b-2b). Nothing is hidden
// automatically. The routes check the admin before calling these.
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";

// username and name identify the author (name is the display name if set, else the username: M07 7a). reports is
// how many players reported it since an admin last kept it; firstReportedAt is when the first of them did.
export type ReportedComment = { id: string; date: string; username: string; name: string; body: string; reports: number; firstReportedAt: string };

// Oldest first report first, so the longest-waiting comes first.
export async function listReports(db: Db): Promise<ReportedComment[]> {
  const { rows } = await db.query<{ id: string; date: string; username: string; name: string; body: string; reports: number; first: Date }>(
    `select c.id::text as id, c.puzzle_date::text as date, p.username::text as username,
            coalesce(p.display_name, p.username::text) as name, c.body, count(*)::int as reports, min(r.created_at) as first
     from private.comment_report r
     join private.comment c on c.id = r.comment_id
     join private.profile p on p.user_id = c.user_id
     -- A report is open until an admin keeps the comment; as in private.keep_reported_comment.
     where not exists (select from private.comment_keep k where k.comment_id = c.id and k.kept_at >= r.created_at)
     group by c.id, p.user_id
     order by min(r.created_at), c.id`,
  );
  return rows.map(({ first, ...r }) => ({ ...r, firstReportedAt: first.toISOString() }));
}

// An admin's decision on a reported comment: deleted, or kept (shown again to everyone but its reporters). at is when;
// admin and author are current usernames; admin is null for an admin with no profile (admins are added by user ID, and
// need none), so adminId always says who.
export type Decision = { id: string; decision: "deleted" | "kept"; at: string; adminId: string; admin: string | null; author: string; body: string };

// Newest first. Every record: the beta is small, and a page size would be a human number (12d, Numbers).
export async function listDecisions(db: Db): Promise<Decision[]> {
  const { rows } = await db.query<Omit<Decision, "at"> & { at: Date }>(
    `select d.comment_id::text as id, d.decision, d.at, d.admin_id::text as "adminId", a.username::text as admin,
            w.username::text as author, d.body
     from (select 'deleted' as decision, comment_id, deleted_at as at, admin_id, author_id, body from private.comment_deletion
           union all
           select 'kept', comment_id, kept_at, admin_id, author_id, body from private.comment_keep) d
     left join private.profile a on a.user_id = d.admin_id
     -- A comment's author always has a profile: the comment hangs off their run.
     join private.profile w on w.user_id = d.author_id
     order by d.at desc, d.decision, d.comment_id desc`,
  );
  return rows.map(({ at, ...r }) => ({ ...r, at: at.toISOString() }));
}

// Deletes a reported comment for everyone and for good, with its reports and reactions (D4, D5), and records which
// admin did (12d): one guarded function does both (supabase/migrations/20261028140000_baseline.sql).
// Only a reported comment: anything else is the same 404 as a missing one.
export async function deleteReportedComment(db: Db, adminId: string, id: string): Promise<void> {
  const { rows } = await db.query<{ deleted: boolean }>("select private.delete_reported_comment($1, $2) as deleted", [adminId, id]);
  if (!rows[0].deleted) throw new AppError("comment_not_found", 404);
}

// Keeps a reported comment for everyone but the players who reported it: its open reports are handled and it leaves
// this list, while it stays hidden for the players who reported it (D5), and the keep is recorded: one guarded function
// (supabase/migrations/20261028140000_baseline.sql). A comment with no open report is the same 404 as a missing
// one.
export async function keepReportedComment(db: Db, adminId: string, id: string): Promise<void> {
  const { rows } = await db.query<{ kept: boolean }>("select private.keep_reported_comment($1, $2) as kept", [adminId, id]);
  if (!rows[0].kept) throw new AppError("comment_not_found", 404);
}
