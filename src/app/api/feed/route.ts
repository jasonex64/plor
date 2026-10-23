import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { getFeed } from "@/comments/feed";

// Today's feed for the home page: the friends thread's and the player's groups' comments in one list, names and
// counts only until the signed-in player's run is over (docs/milestones/M11-home-screen.md, 11b; H2, H3).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  return Response.json({ ok: true, feed: await getFeed(getPool(), userId) });
});
