import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { checkProtocol, handle } from "@/lib/http";
import { readGuestToken } from "@/lib/guest-token";
import { msToReset } from "@/game/runs";
import { guestTodaysState } from "@/game/guest-runs";

// The guest's run today: not started, or where it stands, with only what may be shown. A run that is over is returned every
// time, until its day's purge (docs/milestones/M19-pre-beta-fixes.md, answers 3 and 10). No cookie is a visitor with no
// run. On a day with no puzzle, run is null, with the time to the reset, as GET /api/run.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const token = await readGuestToken();
  const db = getPool();
  const run = await guestTodaysState(db, token === null ? null : hashKey(token));
  if (run) return Response.json({ ok: true, run });
  return Response.json({ ok: true, run: null, msToReset: await msToReset(db) });
});
