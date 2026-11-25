import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { answer } from "@/game/runs";
import { answerClockRun, isClockRun } from "@/game/clock-runs";
import { STATUS } from "@/lib/status";

// Answers one question with the text the player typed; the server alone turns it into an entry (DECISIONS.md:
// Answer model). The response is the run after the answer: the result and host answer(s) for that question and the
// next question, or the same question with notInList when the text names no entry (a free retry, logged as a miss).
// On a clock day (src/game/clock-runs.ts) the same body is answered with the run's state, `notInList` for text that names
// nothing and `repeat` for an answer already given; neither changes the clock or the score.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { index, text } = await readJsonObject(request);
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) throw new AppError("bad_request", STATUS.badRequest, "index");
  if (typeof text !== "string" || text.trim() === "") throw new AppError("bad_request", STATUS.badRequest, "text");
  const db = getPool();
  if (await isClockRun(db, userId)) {
    const { run, notInList, repeat } = await answerClockRun(db, userId, index, text.trim());
    return Response.json({ ok: true, run, notInList, repeat });
  }
  const { run, notInList, needs } = await answer(db, userId, index, text.trim());
  return Response.json({ ok: true, run, notInList, needs });
});
