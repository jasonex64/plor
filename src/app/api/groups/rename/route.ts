import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { readGroupId, readGroupName, renameGroup } from "@/groups/groups";

// The creator renames their group (M10 10b; G1).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const body = await readJsonObject(request);
  const groupId = readGroupId(body.id);
  const name = readGroupName(body.name);
  await renameGroup(getPool(), userId, groupId, name);
  return Response.json({ ok: true, name });
});
