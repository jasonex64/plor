import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { listGroups } from "@/groups/groups";

// The signed-in player's groups, for the home page's Groups section (docs/milestones/M10-groups.md, 10b; G7).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  return Response.json({ ok: true, groups: await listGroups(getPool(), userId) });
});
