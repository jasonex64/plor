import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { readDisplayName, setDisplayName } from "@/lib/profile";

// Sets or clears the signed-in player's display name (docs/milestones/M07-friends-and-live-board.md, 7a). The user
// comes from the verified session, never from the body; the database checks the rules (D1).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const displayName = readDisplayName((await readJsonObject(request)).displayName);
  await setDisplayName(getPool(), userId, displayName);
  return Response.json({ ok: true, displayName });
});
