import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { getProfile } from "@/lib/profile";
import { issueInviteCode } from "@/friends/friends";

// Gives the signed-in player their invite code, making it the first time; `reset: true` replaces it, so the old link
// stops working (M07 7b). A link shows its owner's name, so a username comes first.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { reset } = await readJsonObject(request);
  if (reset !== undefined && typeof reset !== "boolean") throw new AppError("bad_request", 400, "reset");
  const db = getPool();
  if ((await getProfile(db, userId)) === null) throw new AppError("no_profile", 409);
  return Response.json({ ok: true, inviteCode: await issueInviteCode(db, userId, reset === true) });
});
