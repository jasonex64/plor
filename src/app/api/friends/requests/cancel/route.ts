import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { cancelRequest, readUsername } from "@/friends/requests";

// Cancels a request the signed-in player sent (docs/milestones/M17-profiles-and-friend-requests.md, 17a; answer 23).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const username = readUsername((await readJsonObject(request)).username);
  await cancelRequest(getPool(), userId, username);
  return Response.json({ ok: true });
});
