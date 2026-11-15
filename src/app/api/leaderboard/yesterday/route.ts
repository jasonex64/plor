import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { getYesterdayBoard, readBoardGame } from "@/friends/leaderboard";
import { readGroupId } from "@/groups/groups";

// Yesterday's standings for the game card (docs/milestones/M11-home-screen.md, H7): the signed-in player and their
// friends by default, or a group's members with `?group=<id>`, for its members only. Reading it settles the players it
// shows first (M09 D3, D10). It names its game, or Overall, and is refused without it (M16 16f-6).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const params = new URL(request.url).searchParams;
  const game = readBoardGame(params.get("game"));
  const group = params.get("group");
  return Response.json({ ok: true, day: await getYesterdayBoard(getPool(), userId, group === null ? null : readGroupId(group), game) });
});
