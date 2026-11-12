import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { requireGuestToken } from "@/lib/guest-token";
import { answerGuest } from "@/game/guest-runs";

// A guest's answer: the same as POST /api/run/answer, on the guest's run. Text over 40 characters is refused before any
// matching (answerGuest, assertTypedLength).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const token = await requireGuestToken();
  const { index, text } = await readJsonObject(request);
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) throw new AppError("bad_request", 400, "index");
  if (typeof text !== "string" || text.trim() === "") throw new AppError("bad_request", 400, "text");
  const { run, notInList } = await answerGuest(getPool(), hashKey(token), index, text.trim());
  return Response.json({ ok: true, run, notInList });
});
