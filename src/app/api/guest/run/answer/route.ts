import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { requireGuestToken } from "@/lib/guest-token";
import { answerGuest } from "@/game/guest-runs";
import { answerGuestClock, isClockGuestRun } from "@/game/guest-clock-runs";
import { STATUS } from "@/lib/status";

// A guest's answer: the same as POST /api/run/answer, on the guest's run. Text over 40 characters is refused before any
// matching (answerGuest, assertTypedLength). A clock day answers with `repeat` in place of `needs`, as the signed-in route.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const token = await requireGuestToken();
  const { index, text } = await readJsonObject(request);
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) throw new AppError("bad_request", STATUS.badRequest, "index");
  if (typeof text !== "string" || text.trim() === "") throw new AppError("bad_request", STATUS.badRequest, "text");
  const db = getPool();
  if (await isClockGuestRun(db)) {
    const { run, notInList, repeat } = await answerGuestClock(db, hashKey(token), index, text.trim());
    return Response.json({ ok: true, run, notInList, repeat });
  }
  const { run, notInList, needs } = await answerGuest(db, hashKey(token), index, text.trim());
  return Response.json({ ok: true, run, notInList, needs });
});
