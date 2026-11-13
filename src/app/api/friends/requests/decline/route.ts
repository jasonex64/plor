import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { declineRequest, readUsername } from "@/friends/requests";

// Declines the request a player sent to the signed-in player; the sender isn't told (docs/milestones/M17-profiles-and-friend-requests.md, 17a; answer 23).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const username = readUsername((await readJsonObject(request)).username);
  await declineRequest(getPool(), userId, username);
  return Response.json({ ok: true });
});
