import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { nextClockRun } from "@/game/clock-runs";
import { STATUS } from "@/lib/status";

// Next: opens the question after the one the tab is showing (`index`), as src/game/clock-runs.ts does. Tapping it twice
// returns the same run.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { index } = await readJsonObject(request);
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) throw new AppError("bad_request", STATUS.badRequest, "index");
  return Response.json({ ok: true, run: await nextClockRun(getPool(), userId, index) });
});
