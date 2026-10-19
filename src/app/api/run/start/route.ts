import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { getUsername } from "@/lib/profile";
import { startRun } from "@/game/runs";

// Starts today's run (docs/milestones/M00-data-design.md §5). Signed-in players only, and the profile comes
// first (§3: created at first sign-in, before the first run). Starting twice returns the same run.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if ((await getUsername(db, userId)) === null) throw new AppError("no_profile", 409);
  return Response.json({ ok: true, run: await startRun(db, userId) });
});
