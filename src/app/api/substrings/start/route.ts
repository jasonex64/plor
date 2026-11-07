import { startSubstringRun } from "@/game/substring-runs";
import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { getProfile } from "@/lib/profile";

// Starts today's game 2 run, and round 1's 20 seconds. The profile comes first, as for game 1. Starting twice returns
// the same run.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if ((await getProfile(db, userId)) === null) throw new AppError("no_profile", 409);
  return Response.json({ ok: true, run: await startSubstringRun(db, userId) });
});
