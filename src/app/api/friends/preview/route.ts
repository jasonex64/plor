import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle } from "@/lib/http";
import { findInviter, readInviteCode } from "@/friends/friends";

// Whose invite link this is, for the invite page to ask "Add <name> as a friend?" (M07 7b). Signed-in players only.
export const GET = handle(async (request) => {
  checkProtocol(request);
  await requireUserId(await createAuthClient());
  const code = readInviteCode(new URL(request.url).searchParams.get("code"));
  const { username, name } = await findInviter(getPool(), code);
  return Response.json({ ok: true, inviter: { username, name } });
});
