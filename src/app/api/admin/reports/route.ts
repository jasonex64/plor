import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { isAdmin } from "@/insights/queries";
import { listDeletions, listReports } from "@/admin/reports";

// Every reported comment, and every record of an admin's deletion (M12 12d), for admins only
// (docs/milestones/M08-comments-and-reactions.md, 8c and D5): signed out → 401, not in private.admin → 403.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", 403);
  return Response.json({ ok: true, reports: await listReports(db), deletions: await listDeletions(db) });
});
