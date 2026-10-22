import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { deleteComment, readCommentId } from "@/comments/comments";

// Deletes one of the signed-in player's own comments, for everyone and for good (docs/milestones/M08-comments-and-reactions.md,
// D4). Any day's, since deleting adds nothing to a read-only day.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  await deleteComment(getPool(), userId, readCommentId((await readJsonObject(request)).id));
  return Response.json({ ok: true });
});
