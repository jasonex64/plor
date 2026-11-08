import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { getLeaderboard, readBoardGame } from "@/friends/leaderboard";

// The signed-in player's weekly friends leaderboard for one game, this week and last (docs/milestones/M10-groups.md, 10a;
// M09 9b; M16 16e-2).
// Reading it settles the players it shows into the points ledger first (M09 D3, D10).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const game = readBoardGame(new URL(request.url).searchParams.get("game"));
  return Response.json({ ok: true, ...(await getLeaderboard(getPool(), userId, game)) });
});
