import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { getYesterdayBoard } from "@/friends/leaderboard";
import { readGroupId } from "@/groups/groups";

// Yesterday's standings for the game card (docs/milestones/M11-home-screen.md, H7): the signed-in player and their
// friends by default, or a group's members with `?group=<id>`, for its members only. Reading it settles the players it
// shows first (M09 D3, D10).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const group = new URL(request.url).searchParams.get("group");
  return Response.json({ ok: true, day: await getYesterdayBoard(getPool(), userId, group === null ? null : readGroupId(group)) });
});
