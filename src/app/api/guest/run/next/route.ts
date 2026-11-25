import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { requireGuestToken } from "@/lib/guest-token";
import { openNextGuest } from "@/game/guest-runs";
import { isClockGuestRun, nextGuestClock } from "@/game/guest-clock-runs";
import { STATUS } from "@/lib/status";

// "Next" after a reveal, on the guest's run: opens the next question and starts its 20 seconds. Tapping it twice returns
// the same run. On a clock day the body names the question the tab is showing (`index`), as POST /api/run/next.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const token = await requireGuestToken();
  const db = getPool();
  if (await isClockGuestRun(db)) {
    const { index } = await readJsonObject(request);
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0) throw new AppError("bad_request", STATUS.badRequest, "index");
    return Response.json({ ok: true, run: await nextGuestClock(db, hashKey(token), index) });
  }
  return Response.json({ ok: true, run: await openNextGuest(db, hashKey(token)) });
});
