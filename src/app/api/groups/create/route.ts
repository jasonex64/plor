import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { getProfile } from "@/lib/profile";
import { createGroup, readGroupName } from "@/groups/groups";

// Creates a group with the signed-in player as its creator and first member (M10 10b; G1). Members see each other's
// names, so a username comes first.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const name = readGroupName((await readJsonObject(request)).name);
  const db = getPool();
  if ((await getProfile(db, userId)) === null) throw new AppError("no_profile", 409);
  return Response.json({ ok: true, group: await createGroup(db, userId, name) }, { status: 201 });
});
