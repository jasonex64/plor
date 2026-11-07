import { todaysRun } from "@/game/substring-runs";
import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";

// Today's game 2 run for the signed-in player, with only what may be shown (docs/milestones/M16-16d-playing-it.md);
// null on a day with no puzzle.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  return Response.json({ ok: true, run: await todaysRun(getPool(), userId) });
});
