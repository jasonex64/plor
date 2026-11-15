import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { log } from "@/lib/log";
import { getBoard } from "@/friends/board";
import { readGame } from "@/friends/leaderboard";

// The signed-in player's live board (docs/milestones/M07-friends-and-live-board.md, 7c). The page loads it first,
// then again each time its Realtime channel re-subscribes after an error, with `reason=reconnect`; those are logged,
// so reconnects are counted in the runtime logs without a separate endpoint. Each game has its own board, named by `game`
// and refused without it (M16 16f-6, as comments and reactions: 16f-3).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const params = new URL(request.url).searchParams;
  const game = readGame(params.get("game"));
  if (params.get("reason") === "reconnect") log.info("board refetch after reconnect", { userId });
  return Response.json({ ok: true, board: await getBoard(getPool(), userId, game) });
});
