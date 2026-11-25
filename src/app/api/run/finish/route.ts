import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { finishClockRun, isClockRun } from "@/game/clock-runs";
import { STATUS } from "@/lib/status";

// Finish, on the last question of a run on a clock: ends the run at once with the score as it stands (M23 answer 33). Only a
// clock day has one.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isClockRun(db, userId))) throw new AppError("not_a_clock_day", STATUS.conflict);
  return Response.json({ ok: true, run: await finishClockRun(db, userId) });
});
