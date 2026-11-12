import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { checkProtocol, handle } from "@/lib/http";
import { setGuestCookie } from "@/lib/guest-token";
import { checkedGuestToken } from "@/lib/guest-start";
import { startGuestSubstringRun } from "@/game/guest-substring-runs";

// Starts a guest game 2 run, and round 1's 20 seconds, or returns the one that is open. The same bot check as game 1's
// start, first and failing closed; every start is checked (docs/milestones/M18-guest-play.md, Design, "The bot check").
export const POST = handle(async (request) => {
  checkProtocol(request);
  const token = await checkedGuestToken(request);
  const run = await startGuestSubstringRun(getPool(), hashKey(token));
  await setGuestCookie(token);
  return Response.json({ ok: true, run });
});
