import { createAuthClient, currentUserId, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { isAdmin } from "@/insights/queries";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { createProfile, getProfile } from "@/lib/profile";
import { getStreak } from "@/game/streak";
import { msToReset } from "@/game/runs";

// Who is signed in, whether they have picked a username yet, and whether they're an admin, for the sidebar's Admin
// link (docs/milestones/M14-14a-1-shell.md). The admin pages check again on every request. With a profile, its display
// name, when the username may change and the settings, which the settings sheet shows and Today and Me follow
// (docs/milestones/M14-14a-3b-settings.md); and the streak, which the shell shows on every page as its rank
// (docs/milestones/M14-14b-2a-streak-ranks.md), with the time to the daily reset, when the shell reads it again
// (docs/milestones/M14-14b-19-controls-layout-and-state.md; 14b-18, answer 16).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await currentUserId(await createAuthClient());
  if (!userId) return Response.json({ ok: true, signedIn: false });
  const db = getPool();
  const profile = await getProfile(db, userId);
  const admin = await isAdmin(db, userId);
  if (!profile) return Response.json({ ok: true, signedIn: true, username: null, admin });
  return Response.json({ ok: true, signedIn: true, ...profile, admin, streak: await getStreak(db, userId), msToReset: await msToReset(db) });
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
