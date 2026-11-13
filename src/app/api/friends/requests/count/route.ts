import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { countReceived } from "@/friends/requests";

// How many friend requests wait for the signed-in player's answer, for the Friends tab on every page
// (docs/milestones/M17-profiles-and-friend-requests.md, 17a; answer 14, D6).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  return Response.json({ ok: true, count: await countReceived(getPool(), userId) });
});
