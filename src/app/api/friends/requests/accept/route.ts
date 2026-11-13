import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { acceptRequest, readUsername } from "@/friends/requests";

// Accepts the request a player sent to the signed-in player: they become friends both ways (docs/milestones/M17-profiles-and-friend-requests.md, 17a).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const username = readUsername((await readJsonObject(request)).username);
  await acceptRequest(getPool(), userId, username);
  return Response.json({ ok: true });
});
