import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { leaveGroup, readGroupId } from "@/groups/groups";

// The signed-in player leaves a group (M10 10b; G6).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const groupId = readGroupId((await readJsonObject(request)).id);
  await leaveGroup(getPool(), userId, groupId);
  return Response.json({ ok: true });
});
