import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { checkProtocol, handle } from "@/lib/http";
import { requireGuestToken } from "@/lib/guest-token";
import { finishGuestClock } from "@/game/guest-clock-runs";

// Finish on the guest's run, as POST /api/run/finish.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const token = await requireGuestToken();
  return Response.json({ ok: true, run: await finishGuestClock(getPool(), hashKey(token)) });
});
