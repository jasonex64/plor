import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { readInviteCode } from "@/friends/friends";
import { findGroupByCode } from "@/groups/groups";

// Which group an invite link opens, for the join page to ask "Join <name>?" (M10 10b; G7). Signed-in players only.
export const GET = handle(async (request) => {
  checkProtocol(request);
  await requireUserId(await createAuthClient());
  const code = readInviteCode(new URL(request.url).searchParams.get("code"));
  const { name } = await findGroupByCode(getPool(), code);
  return Response.json({ ok: true, group: { name } });
});
