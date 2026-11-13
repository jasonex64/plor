import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { listFriends } from "@/friends/friends";
import { listReceived, listSent } from "@/friends/requests";

// The signed-in player's friends (docs/milestones/M07-friends-and-live-board.md, 7b),
// and the friend requests waiting for their answer and the ones they sent (M17 17a).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  return Response.json({
    ok: true,
    friends: await listFriends(db, userId),
    requests: await listReceived(db, userId),
    sent: await listSent(db, userId),
  });
});
