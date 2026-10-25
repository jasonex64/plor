import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { getMe } from "@/game/me";

// The signed-in player's own stats for the Me tab (docs/milestones/M14-14a-3a-me.md). Only their own runs and answers;
// the shares beside the rarest answers are the result's, from closed days with enough players (M11 H5).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  return Response.json({ ok: true, me: await getMe(getPool(), userId) });
});
