import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { sendRequest, readUsername } from "@/friends/requests";

// Sends a friend request to the player a username names, or accepts theirs if it is already waiting: state is "sent"
// or "friends" (docs/milestones/M17-profiles-and-friend-requests.md, 17a; answer 23). The player comes from the verified session, never from the body.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const username = readUsername((await readJsonObject(request)).username);
  return Response.json({ ok: true, state: await sendRequest(getPool(), userId, username) });
});
