import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { checkProtocol, handle } from "@/lib/http";
import { requireGuestToken } from "@/lib/guest-token";
import { nextGuestRound } from "@/game/guest-substring-runs";

// Next, on the guest's run: opens the next round and starts its 20 seconds. Tapping twice returns the same run.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const token = await requireGuestToken();
  return Response.json({ ok: true, run: await nextGuestRound(getPool(), hashKey(token)) });
});
