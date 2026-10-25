import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { readSettings, setSettings } from "@/lib/profile";

// Sets the signed-in player's settings, Skip the game screen and Numbers on the calendar
// (docs/milestones/M14-14a-3b-settings.md). The user comes from the verified session, never from the body, and
// plor_app may update only these two columns of the profile (DECISIONS.md Log, 2026-10-25).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const settings = readSettings(await readJsonObject(request));
  return Response.json({ ok: true, settings: await setSettings(getPool(), userId, settings) });
});
