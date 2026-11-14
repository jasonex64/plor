import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { readUserId, removeFriend } from "@/friends/friends";

// Ends a friendship both ways (M07 D4). Only a friendship of the signed-in player can be removed. The friend is named by
// ID, as a username can change hands after the page was drawn (M19 19e).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const friendId = readUserId((await readJsonObject(request)).userId);
  await removeFriend(getPool(), userId, friendId);
  return Response.json({ ok: true });
});
