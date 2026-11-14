import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { getFeedPage, readFeedCursor } from "@/comments/feed-page";

// A page of the endless feed: comments and finished runs of both games, newest first (docs/milestones/M16-16f-the-shared-pieces.md,
// 16f-4). `?cursor=` is the previous page's `next`, kept as it came; none gives the first page. Beside /api/feed,
// which 16f-5 replaces with this when Today switches over.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const cursor = readFeedCursor(new URL(request.url).searchParams.get("cursor"));
  return Response.json({ ok: true, feed: await getFeedPage(getPool(), userId, cursor) });
});
