import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { logMiss } from "@/game/runs";

// "Not in our list yet, try another": typed text that matched no entry is logged for a human to review, and the
// player keeps playing the same question (human, 2026-10-18). The 40-character limit is the table's check.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { index, text } = await readJsonObject(request);
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) throw new AppError("bad_request", 400, "index");
  if (typeof text !== "string") throw new AppError("bad_request", 400, "text");
  await logMiss(getPool(), userId, index, text.trim());
  return Response.json({ ok: true });
});
