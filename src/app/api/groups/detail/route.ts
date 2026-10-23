import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { msToReset } from "@/game/runs";
import { getGroup, readGroupId } from "@/groups/groups";

// A group's page: its name, members and invite link, for members only (M10 10b; G1, G3, G7), and the time to the reset,
// when the page's thread and board move to the new day (M11 H6).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const groupId = readGroupId(new URL(request.url).searchParams.get("id"));
  const group = await getGroup(getPool(), userId, groupId);
  return Response.json({ ok: true, group, msToReset: await msToReset(getPool()) });
});
