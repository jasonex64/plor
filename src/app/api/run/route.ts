import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { todaysState } from "@/game/runs";

// Today's run for the signed-in player: not started, or where it stands, with only what may be shown.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  return Response.json({ ok: true, run: await todaysState(getPool(), userId) });
});
