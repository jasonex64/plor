import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { STATUS } from "@/lib/status";
import { readUserId, setFavourite } from "@/friends/friends";

// A player stars a friend as a favourite, or clears the star (M24 24a). Only the signed-in player's own flag changes,
// and the friend isn't told. The friend is named by ID, as a username can change hands after the page was drawn
// (M19 19e).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const body = await readJsonObject(request);
  const friendId = readUserId(body.userId);
  if (typeof body.favourite !== "boolean") throw new AppError("bad_request", STATUS.badRequest, "favourite");
  await setFavourite(getPool(), userId, friendId, body.favourite);
  return Response.json({ ok: true });
});
