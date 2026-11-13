import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { unblockPlayer, readUsername } from "@/friends/requests";

// Lifts the signed-in player's block of a player; it restores no friendship and no request (docs/milestones/M17-profiles-and-friend-requests.md, 17a; answer 21).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const username = readUsername((await readJsonObject(request)).username);
  await unblockPlayer(getPool(), userId, username);
  return Response.json({ ok: true });
});
