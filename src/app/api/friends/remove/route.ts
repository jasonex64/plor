import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { removeFriend } from "@/friends/friends";

// Ends a friendship both ways (M07 D4). Only a friendship of the signed-in player can be removed.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { username } = await readJsonObject(request);
  if (typeof username !== "string") throw new AppError("bad_request", 400, "username");
  await removeFriend(getPool(), userId, username);
  return Response.json({ ok: true });
});
