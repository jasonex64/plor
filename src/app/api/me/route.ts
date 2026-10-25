import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { getProfile } from "@/lib/profile";
import { getMe } from "@/game/me";

// The signed-in player's own stats for the Me tab (docs/milestones/M14-14a-3a-me.md). Only their own runs and answers;
// the shares beside the rarest answers are the result's, from closed days with enough players (M11 H5). A player who
// hasn't picked a username has no profile yet, refused as the other routes refuse it.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if ((await getProfile(db, userId)) === null) throw new AppError("no_profile", 409);
  return Response.json({ ok: true, me: await getMe(db, userId) });
});
