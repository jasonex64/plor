import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { openNext } from "@/game/runs";
import { isClockRun, nextClockRun } from "@/game/clock-runs";
import { STATUS } from "@/lib/status";

// "Next" after a reveal: opens the next question and starts its 20 seconds (M04 13c-2 and 13c-4; G5). Tapping it
// twice returns the same run. On a clock day (src/game/clock-runs.ts) the body names the question the tab is showing
// (`index`), and the server opens the one after it.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (await isClockRun(db, userId)) {
    const { index } = await readJsonObject(request);
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0) throw new AppError("bad_request", STATUS.badRequest, "index");
    return Response.json({ ok: true, run: await nextClockRun(db, userId, index) });
  }
  return Response.json({ ok: true, run: await openNext(db, userId) });
});
