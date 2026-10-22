import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { getInviteCode, listFriends } from "@/friends/friends";

// The signed-in player's friends and invite code, if they have made one (docs/milestones/M07-friends-and-live-board.md, 7b).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  return Response.json({ ok: true, inviteCode: await getInviteCode(db, userId), friends: await listFriends(db, userId) });
});
