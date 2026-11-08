import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { getGroupLeaderboard, readBoardGame } from "@/friends/leaderboard";
import { readGroupId } from "@/groups/groups";

// A group's weekly leaderboard for one game (M16 16e-2), this week and last, for its members only (docs/milestones/M10-groups.md, 10c; G3).
// Reading it settles the members into the points ledger first (M09 D3, D10), as the friends board does.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const params = new URL(request.url).searchParams;
  const groupId = readGroupId(params.get("id"));
  return Response.json({ ok: true, ...(await getGroupLeaderboard(getPool(), userId, groupId, readBoardGame(params.get("game")))) });
});
