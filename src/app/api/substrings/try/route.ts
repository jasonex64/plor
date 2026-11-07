import { tryWord } from "@/game/substring-runs";
import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";

// One try at the open round. The database judges it; the response says how it went, and a refused word is an outcome,
// not an error, as a player keeps trying until the clock runs out (DECISIONS.md, Game 2, "Tries").
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { text } = await readJsonObject(request);
  if (typeof text !== "string") throw new AppError("bad_request", 400, "text");
  return Response.json({ ok: true, ...(await tryWord(getPool(), userId, text)) });
});
