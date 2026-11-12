import { readServerEnv } from "@/config/env";
import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { checkProtocol, handle, readJsonObject } from "@/lib/http";
import { newGuestToken, readGuestToken, setGuestCookie } from "@/lib/guest-token";
import { verifyTurnstile } from "@/lib/turnstile";
import { startGuestRun } from "@/game/guest-runs";

// Starts a guest run, or returns the one that is open. The bot check comes first and fails closed: nothing is created, and no
// cookie is set, unless Siteverify says the token is good (docs/milestones/M18-guest-play.md, Design, "The bot check"). Every
// start is checked, so a replay needs a new check (answer 13).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const { turnstileToken } = await readJsonObject(request);
  const { secretKey, allowedHostnames } = readServerEnv().turnstile;
  await verifyTurnstile(typeof turnstileToken === "string" ? turnstileToken : null, secretKey, allowedHostnames);
  const token = (await readGuestToken()) ?? newGuestToken();
  const run = await startGuestRun(getPool(), hashKey(token));
  await setGuestCookie(token);
  return Response.json({ ok: true, run });
});
