import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { checkProtocol, handle } from "@/lib/http";
import { readGuestToken } from "@/lib/guest-token";
import { guestSubstringState } from "@/game/guest-substring-runs";

// The guest's game 2 run today: not started, or where it stands. A run that is over is returned every time, until its day's purge (M19 answers 3 and 10).
// No cookie is a visitor with no run. null on a day with no puzzle, as GET /api/substrings.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const token = await readGuestToken();
  return Response.json({ ok: true, run: await guestSubstringState(getPool(), token === null ? null : hashKey(token)) });
});
