import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { getProfile } from "@/lib/profile";
import { addFriend, readInviteCode } from "@/friends/friends";

// Accepts an invite link: the signed-in player and the link's owner become friends both ways (M07 7b). The player
// comes from the verified session, never from the body.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const code = readInviteCode((await readJsonObject(request)).code);
  const db = getPool();
  if ((await getProfile(db, userId)) === null) throw new AppError("no_profile", 409);
  return Response.json({ ok: true, friend: await addFriend(db, userId, code) });
});
