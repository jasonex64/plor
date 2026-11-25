import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { requireGuestToken } from "@/lib/guest-token";
import { finishGuestClock, isClockGuestRun } from "@/game/guest-clock-runs";
import { STATUS } from "@/lib/status";

// Finish on the guest's run, as POST /api/run/finish: only a clock day has one.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const token = await requireGuestToken();
  const db = getPool();
  if (!(await isClockGuestRun(db))) throw new AppError("not_a_clock_day", STATUS.conflict);
  return Response.json({ ok: true, run: await finishGuestClock(db, hashKey(token)) });
});
