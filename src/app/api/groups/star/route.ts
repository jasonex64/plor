import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { STATUS } from "@/lib/status";
import { readGroupId, setGroupStar } from "@/groups/groups";

// A player stars a group they're in as their default, or clears the star (M24 24a). Only the signed-in player's own
// star changes; starring another group moves it.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const body = await readJsonObject(request);
  const groupId = readGroupId(body.id);
  if (typeof body.starred !== "boolean") throw new AppError("bad_request", STATUS.badRequest, "starred");
  await setGroupStar(getPool(), userId, groupId, body.starred);
  return Response.json({ ok: true });
});
