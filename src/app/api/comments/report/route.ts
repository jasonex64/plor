import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { readCommentId, reportComment } from "@/comments/comments";

// Reports someone else's comment (docs/milestones/M08-comments-and-reactions.md, 8c and D5): it's hidden from the
// signed-in player at once and listed for admins. The reporter comes from the verified session, never from the body.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  await reportComment(getPool(), userId, readCommentId((await readJsonObject(request)).id));
  return Response.json({ ok: true });
});
