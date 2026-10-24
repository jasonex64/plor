import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { isAdmin } from "@/insights/queries";
import { readCommentId } from "@/comments/comments";
import { deleteReportedComment } from "@/admin/reports";

// Deletes a reported comment for everyone, for admins only (docs/milestones/M08-comments-and-reactions.md, 8c and D5),
// recording which admin did (M12 12d).
// The admin is checked before the body is read, so a non-admin learns nothing.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", 403);
  await deleteReportedComment(db, userId, readCommentId((await readJsonObject(request)).id));
  return Response.json({ ok: true });
});
