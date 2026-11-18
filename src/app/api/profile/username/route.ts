import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { changeUsername } from "@/lib/profile";
import { STATUS } from "@/lib/status";

// Changes the signed-in player's username, at most once every 30 days (docs/milestones/M12-account.md, 12b; A2). The
// user comes from the verified session, never from the body; the database checks the rules.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { username } = await readJsonObject(request);
  if (typeof username !== "string" || username.includes("\0")) throw new AppError("username_invalid", STATUS.badRequest);
  await changeUsername(getPool(), userId, username);
  return Response.json({ ok: true, username });
});
