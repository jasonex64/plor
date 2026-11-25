import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { getProfile } from "@/lib/profile";
import { startRun } from "@/game/runs";
import { isClockRun, startClock } from "@/game/clock-runs";
import { STATUS } from "@/lib/status";

// Starts today's run (docs/milestones/M00-data-design.md §5). Signed-in players only, and the profile comes
// first (§3: created at first sign-in, before the first run). Starting twice returns the same run. A day on a clock
// starts the same way (src/game/clock-runs.ts).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if ((await getProfile(db, userId)) === null) throw new AppError("no_profile", STATUS.conflict);
  return Response.json({ ok: true, run: (await isClockRun(db, userId)) ? await startClock(db, userId) : await startRun(db, userId) });
});
