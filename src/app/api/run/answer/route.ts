import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { answerClockRun } from "@/game/clock-runs";
import { STATUS } from "@/lib/status";

// Answers the open question with the text the player typed; the server alone turns it into an entry (DECISIONS.md:
// Answer model). The response is the run's state (src/game/clock-runs.ts), `notInList` for text that names nothing (a free
// retry, logged as a miss) and `repeat` for an answer already given; neither changes the clock or the score.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { index, text } = await readJsonObject(request);
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) throw new AppError("bad_request", STATUS.badRequest, "index");
  if (typeof text !== "string" || text.trim() === "") throw new AppError("bad_request", STATUS.badRequest, "text");
  const { run, notInList, repeat } = await answerClockRun(getPool(), userId, index, text.trim());
  return Response.json({ ok: true, run, notInList, repeat });
});
