import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { requireGuestToken } from "@/lib/guest-token";
import { nextGuestClock } from "@/game/guest-clock-runs";
import { STATUS } from "@/lib/status";

// Next on the guest's run: opens the question after the one the tab is showing (`index`), as POST /api/run/next. Tapping it
// twice returns the same run.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const token = await requireGuestToken();
  const { index } = await readJsonObject(request);
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) throw new AppError("bad_request", STATUS.badRequest, "index");
  return Response.json({ ok: true, run: await nextGuestClock(getPool(), hashKey(token), index) });
});
