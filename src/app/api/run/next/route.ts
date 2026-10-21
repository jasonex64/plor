import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { openNext } from "@/game/runs";

// "Next" after a reveal: opens the next question and starts its 20 seconds (M13 13c-2 and 13c-4; G5). Tapping it
// twice returns the same run.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  return Response.json({ ok: true, run: await openNext(getPool(), userId) });
});
