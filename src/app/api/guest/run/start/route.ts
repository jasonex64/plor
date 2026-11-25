import { getPool } from "@/lib/db";
import { hashKey } from "@/lib/auth-limits";
import { checkProtocol, handle } from "@/lib/http";
import { setGuestCookie } from "@/lib/guest-token";
import { checkedGuestToken } from "@/lib/guest-start";
import { startGuestRun } from "@/game/guest-runs";
import { isClockGuestRun, startGuestClockRun } from "@/game/guest-clock-runs";

// Starts a guest run, or returns the one that is open. The bot check comes first and fails closed: nothing is created, and no
// cookie is set, unless Siteverify says the token is good (docs/milestones/M18-guest-play.md, Design, "The bot check"). Every
// start is checked, so a replay needs a new check (answer 13). A clock day starts the same way (src/game/guest-clock-runs.ts).
export const POST = handle(async (request) => {
  checkProtocol(request);
  const token = await checkedGuestToken(request);
  const db = getPool();
  const run = (await isClockGuestRun(db)) ? await startGuestClockRun(db, hashKey(token)) : await startGuestRun(db, hashKey(token));
  await setGuestCookie(token);
  return Response.json({ ok: true, run });
});
