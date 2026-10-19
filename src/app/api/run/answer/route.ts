import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { answer } from "@/game/runs";

// Answers one question with an entry ID from the question's accepted bank (DECISIONS.md: Answer model). The
// response is the run after the answer: the result and host answer(s) for that question, and the next question.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { index, entryId } = await readJsonObject(request);
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) throw new AppError("bad_request", 400, "index");
  if (typeof entryId !== "string") throw new AppError("bad_request", 400, "entryId");
  return Response.json({ ok: true, run: await answer(getPool(), userId, index, entryId) });
});
