import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { checkProtocol, handle } from "@/lib/http";
import { requireGuestToken } from "@/lib/guest-token";
import { openNextGuest } from "@/game/guest-runs";

// "Next" after a reveal, on the guest's run: opens the next question and starts its 20 seconds. Tapping it twice returns
// the same run.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const token = await requireGuestToken();
  return Response.json({ ok: true, run: await openNextGuest(getPool(), hashKey(token)) });
});
