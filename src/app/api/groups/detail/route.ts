import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { getGroup, readGroupId } from "@/groups/groups";

// A group's page: its name, members and invite link, for members only (M10 10b; G1, G3, G7).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const groupId = readGroupId(new URL(request.url).searchParams.get("id"));
  return Response.json({ ok: true, group: await getGroup(getPool(), userId, groupId) });
});
