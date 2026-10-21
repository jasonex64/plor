import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { answer } from "@/game/runs";

// Answers one question with the text the player typed; the server alone turns it into an entry (DECISIONS.md:
// Answer model). The response is the run after the answer: the result and host answer(s) for that question and the
// next question, or the same question with notInList when the text names no entry (a free retry, logged as a miss).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { index, text } = await readJsonObject(request);
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) throw new AppError("bad_request", 400, "index");
  if (typeof text !== "string" || text.trim() === "") throw new AppError("bad_request", 400, "text");
  const { run, notInList } = await answer(getPool(), userId, index, text.trim());
  return Response.json({ ok: true, run, notInList });
});
