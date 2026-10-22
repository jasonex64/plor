import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { isCalendarDate } from "@/content/puzzle";
import { getThread, postComment, readCommentBody } from "@/comments/comments";

// A day's comments: today's by default, or a past day's with `?date=YYYY-MM-DD` (docs/milestones/M08-comments-and-reactions.md,
// 8a and D6). Today's stay hidden until the signed-in player's run is over.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const date = new URL(request.url).searchParams.get("date");
  if (date !== null && !isCalendarDate(date)) throw new AppError("bad_request", 400, "date");
  return Response.json({ ok: true, thread: await getThread(getPool(), userId, date) });
});

// Posts a comment to the day the page shows, which must be today, once the signed-in player's run is over. The
// author comes from the verified session, never from the body.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { date, body } = await readJsonObject(request);
  if (!isCalendarDate(date)) throw new AppError("bad_request", 400, "date");
  const comment = await postComment(getPool(), userId, date, readCommentBody(body));
  return Response.json({ ok: true, comment }, { status: 201 });
});
