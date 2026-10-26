import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { isAdmin } from "@/insights/queries";
import { readCommentId } from "@/comments/comments";
import { keepReportedComment } from "@/admin/reports";

// Keeps a reported comment for everyone, for admins only, recording which admin did
// (docs/milestones/M14-14b-2b-2-admin-build.md, 14b-2b-2b). As Delete's route, the admin is checked before the body is
// read, so a non-admin learns nothing.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", 403);
  await keepReportedComment(db, userId, readCommentId((await readJsonObject(request)).id));
  return Response.json({ ok: true });
});
