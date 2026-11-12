// What every guest start does before it creates anything: the bot check, then the token the run will use (the cookie's, or a
// new one). Shared by game 1's and game 2's start routes, so no guest row is created without a passed check
// (docs/milestones/M18-guest-play.md, Design, "The bot check"). The caller sets the cookie once its run exists.
import { readServerEnv } from "@/config/env";
import { readJsonObject } from "@/lib/http";
import { newGuestToken, readGuestToken } from "@/lib/guest-token";
import { verifyTurnstile } from "@/lib/turnstile";

export async function checkedGuestToken(request: Request): Promise<string> {
  const { turnstileToken } = await readJsonObject(request);
  const { secretKey, allowedHostnames } = readServerEnv().turnstile;
  await verifyTurnstile(typeof turnstileToken === "string" ? turnstileToken : null, secretKey, allowedHostnames);
  return (await readGuestToken()) ?? newGuestToken();
}
