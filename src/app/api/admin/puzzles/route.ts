import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { isAdmin } from "@/insights/queries";
import { listDays, readDrafts } from "@/admin/puzzles";

// Every day from today on with saved questions, a drafted file or an approved puzzle, for admins only
// (docs/milestones/M06-puzzle-entry.md): signed out → 401, not in private.admin → 403.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", 403);
  return Response.json({ ok: true, ...(await listDays(db, readDrafts())) });
});
