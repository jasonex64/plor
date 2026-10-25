import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { isAdmin } from "@/insights/queries";
import { bankView, readBank } from "@/admin/bank";
import { readDrafts } from "@/admin/puzzles";

// The question bank with each question's uses and catch rates, for admins only
// (docs/milestones/M13-13d-the-question-bank.md): signed out → 401, not in private.admin → 403.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", 403);
  return Response.json({ ok: true, ...(await bankView(db, readBank(), readDrafts())) });
});
