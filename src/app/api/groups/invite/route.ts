import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { readGroupId, resetGroupInvite } from "@/groups/groups";

// The creator resets their group's invite link, so the old one stops working (M10 10b; G1).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const groupId = readGroupId((await readJsonObject(request)).id);
  return Response.json({ ok: true, inviteCode: await resetGroupInvite(getPool(), userId, groupId) });
});
