import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { isAdmin } from "@/insights/queries";
import { poolView } from "@/admin/pool";
import { STATUS } from "@/lib/status";

// A category's answer pool for admins only (docs/milestones/M15-15g-the-answer-pool.md): signed out → 401, not in
// private.admin → 403, a bad query → 400, a category the answer database doesn't have → 404.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", STATUS.forbidden);
  return Response.json({ ok: true, ...(await poolView(db, userId, new URL(request.url).searchParams)) });
});
