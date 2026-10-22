// Reported comments for admins (docs/milestones/M08-comments-and-reactions.md, 8c and D5): every comment with a report,
// until an admin deletes it. Nothing is hidden automatically. The routes check the admin before calling these.
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

// Deletes a reported comment for everyone and for good, with its reports and reactions (D4, D5). Only a reported
// comment: anything else is the same 404 as a missing one.
export async function deleteReportedComment(db: Db, id: string): Promise<void> {
  const { rowCount } = await db.query(
    "delete from private.comment c where c.id = $1 and exists (select from private.comment_report r where r.comment_id = c.id)",
    [id],
  );
  if (rowCount === 0) throw new AppError("comment_not_found", 404);
}
