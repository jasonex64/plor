import { nextRound } from "@/game/substring-runs";
import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";

// Next: opens the next round and starts its 20 seconds. Tapping twice returns the same run.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  return Response.json({ ok: true, run: await nextRound(getPool(), userId) });
});
