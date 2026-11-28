import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { isAdmin } from "@/admin/is-admin";
import { lookupThings } from "@/admin/base";
import { STATUS } from "@/lib/status";

// The answer database's lookup for admins only (docs/milestones/M13-13a-the-base.md): signed out → 401, not in
// private.admin → 403, nothing typed → 400.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", STATUS.forbidden);
  return Response.json({ ok: true, things: await lookupThings(db, userId, new URL(request.url).searchParams.get("q")) });
});
