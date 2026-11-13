import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { getProfile } from "@/lib/profile";
import { getPlayer } from "@/friends/players";

// A player's profile by username, which is also the search (docs/milestones/M17-profiles-and-friend-requests.md, 17b;
// E1): the view the signed-in viewer may see, or 404 player_not_found. The viewer comes from the verified session. A
// viewer who hasn't picked a username has no profile yet, refused as the other routes refuse it.
export const GET = (request: Request, context: RouteContext<"/api/players/[username]">) =>
  handle(async (request) => {
    checkProtocol(request);
    const userId = await requireUserId(await createAuthClient());
    const db = getPool();
    if ((await getProfile(db, userId)) === null) throw new AppError("no_profile", 409);
    return Response.json({ ok: true, player: await getPlayer(db, userId, (await context.params).username) });
  })(request);
