import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { getStats, getYesterday } from "@/game/offbeat";

// Offbeat's game screen for the signed-in player: their stats and yesterday's answers
// (docs/milestones/M14-14a-2b-game-screen.md). Security change: a closed day's host answers go to every signed-in
// player, except one whose own run that day is still going (human, 2026-10-25; DECISIONS.md Log). Nothing of today's
// puzzle is read here.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  return Response.json({ ok: true, stats: await getStats(db, userId), yesterday: await getYesterday(db, userId) });
});
