import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { defaultGroupId, listGroups } from "@/groups/groups";

// The signed-in player's groups, for the Groups tab (docs/milestones/M10-groups.md, 10b; G7), and the one the tab opens
// (M24 24b).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const [groups, defaultId] = await Promise.all([listGroups(getPool(), userId), defaultGroupId(getPool(), userId)]);
  return Response.json({ ok: true, groups, defaultId });
});
