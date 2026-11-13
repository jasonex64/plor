import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { listBlocked } from "@/friends/requests";

// The players the signed-in player has blocked, for the list in Settings (docs/milestones/M17-profiles-and-friend-requests.md, 17a; answer 21).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  return Response.json({ ok: true, blocked: await listBlocked(getPool(), userId) });
});
