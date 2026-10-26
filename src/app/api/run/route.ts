import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { msToReset, todaysState } from "@/game/runs";

// Today's run for the signed-in player: not started, or where it stands, with only what may be shown. On a day with
// no puzzle, run is null, with the time to the reset, when the page moves to the new day
// (docs/milestones/M12-12f-review-fixes.md, F2; M11 H6).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  const run = await todaysState(db, userId);
  if (run) return Response.json({ ok: true, run });
  return Response.json({ ok: true, run: null, msToReset: await msToReset(db) });
});
