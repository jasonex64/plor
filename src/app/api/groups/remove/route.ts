import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { readUserId } from "@/friends/friends";
import { readGroupId, removeMember } from "@/groups/groups";

// The creator removes a member by ID (M10 10b; G1, G6; M19 19e: a username can change hands after the page was drawn).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const body = await readJsonObject(request);
  const groupId = readGroupId(body.id);
  await removeMember(getPool(), userId, groupId, readUserId(body.userId));
  return Response.json({ ok: true });
});
