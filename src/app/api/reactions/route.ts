import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { isCalendarDate } from "@/content/puzzle";
import { readEmoji, readTarget, setReaction } from "@/reactions/reactions";

// Sets, replaces or removes (emoji null) the signed-in player's reaction on a comment or a friend's run
// (docs/milestones/M08-comments-and-reactions.md, 8b): on the day the page shows, which must be today, once the
// player's run is over. The reactor comes from the verified session, never from the body.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { date, target, emoji } = await readJsonObject(request);
  if (!isCalendarDate(date)) throw new AppError("bad_request", 400, "date");
  await setReaction(getPool(), userId, date, readTarget(target), readEmoji(emoji));
  return Response.json({ ok: true });
});
