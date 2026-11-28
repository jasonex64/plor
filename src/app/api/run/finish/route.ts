import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { finishClockRun } from "@/game/clock-runs";

// Finish, on the last question of a run on a clock: ends the run at once with the score as it stands (M23 answer 33).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  return Response.json({ ok: true, run: await finishClockRun(getPool(), userId) });
});
