import { createAuthClient, currentUserId, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { createProfile, getUsername } from "@/lib/profile";

// Who is signed in, and whether they have picked a username yet.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await currentUserId(await createAuthClient());
  if (!userId) return Response.json({ ok: true, signedIn: false });
  return Response.json({ ok: true, signedIn: true, username: await getUsername(getPool(), userId) });
});

// Creates the profile once, after the first sign-in (M00 data design §3). The user comes from the verified
// session, never from the body; the database checks the username rules and uniqueness.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { username } = await readJsonObject(request);
  if (typeof username !== "string") throw new AppError("username_invalid", 400);
  await createProfile(getPool(), userId, username);
  return Response.json({ ok: true, username }, { status: 201 });
});
