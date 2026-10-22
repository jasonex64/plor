import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { getLeaderboard } from "@/friends/leaderboard";

// The signed-in player's all-time friends leaderboard (docs/milestones/M09-points-and-leaderboard.md, 9b). Reading it
// settles the players it shows into the points ledger first (D3, D10).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  return Response.json({ ok: true, leaderboard: await getLeaderboard(getPool(), userId) });
});
