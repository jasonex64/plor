import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { blockPlayer, readUsername } from "@/friends/requests";

// Blocks a player: it ends any friendship with them and hides each from the other; they aren't told
// (docs/milestones/M17-profiles-and-friend-requests.md, 17a; answers 5, 12, 13, 20).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const username = readUsername((await readJsonObject(request)).username);
  await blockPlayer(getPool(), userId, username);
  return Response.json({ ok: true });
});
