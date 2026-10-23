import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { getProfile } from "@/lib/profile";
import { readInviteCode } from "@/friends/friends";
import { joinGroup } from "@/groups/groups";

// Accepts a group's invite link: the signed-in player becomes a member (M10 10b; G1, G7). The player comes from the
// verified session, never from the body.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const code = readInviteCode((await readJsonObject(request)).code);
  const db = getPool();
  if ((await getProfile(db, userId)) === null) throw new AppError("no_profile", 409);
  return Response.json({ ok: true, group: await joinGroup(db, userId, code) });
});
