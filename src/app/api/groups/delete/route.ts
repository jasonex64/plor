import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { deleteGroup, readGroupId } from "@/groups/groups";

// The creator deletes their group and every membership in it (M10 10b; G1).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const groupId = readGroupId((await readJsonObject(request)).id);
  await deleteGroup(getPool(), userId, groupId);
  return Response.json({ ok: true });
});
