import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { requireGuestToken } from "@/lib/guest-token";
import { tryGuestWord } from "@/game/guest-substring-runs";

// One try at the guest's open round, as POST /api/substrings/try: a refused word is an outcome, not an error.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const token = await requireGuestToken();
  const { text } = await readJsonObject(request);
  if (typeof text !== "string") throw new AppError("bad_request", 400, "text");
  return Response.json({ ok: true, ...(await tryGuestWord(getPool(), hashKey(token), text)) });
});
