import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { readGroupId, removeMember } from "@/groups/groups";

// The creator removes a member by username (M10 10b; G1, G6).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const body = await readJsonObject(request);
  const groupId = readGroupId(body.id);
  if (typeof body.username !== "string") throw new AppError("bad_request", 400, "username");
  await removeMember(getPool(), userId, groupId, body.username);
  return Response.json({ ok: true });
});
