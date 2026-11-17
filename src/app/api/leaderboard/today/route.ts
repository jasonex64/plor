import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { getTodayBoard, readBoardGame } from "@/friends/leaderboard";
import { readGroupId } from "@/groups/groups";

// Today's standings (docs/milestones/M22-todays-board.md): the signed-in player and their friends by default, or a
// group's members with `?group=<id>`, for its members only, once the player has finished the game it names (Overall:
// each of today's games). It reads today's runs and writes no ledger row. It names its game, or Overall, as yesterday's does.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const params = new URL(request.url).searchParams;
  const game = readBoardGame(params.get("game"));
  const group = params.get("group");
  return Response.json({ ok: true, board: await getTodayBoard(getPool(), userId, group === null ? null : readGroupId(group), game) });
});
