import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { isCalendarDate } from "@/content/puzzle";
import { getThread, postComment, readCommentBody } from "@/comments/comments";
import { readGroupId } from "@/groups/groups";

// A day's comments: today's by default, or a past day's with `?date=YYYY-MM-DD` (docs/milestones/M08-comments-and-reactions.md,
// 8a and D6). Today's stay hidden until the signed-in player's run is over. The friends thread by default, or a
// group's with `?group=<id>`, for its members (docs/milestones/M10-groups.md, 10d; G4).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  if (date !== null && !isCalendarDate(date)) throw new AppError("bad_request", 400, "date");
  const group = params.get("group");
  return Response.json({ ok: true, thread: await getThread(getPool(), userId, date, group === null ? null : readGroupId(group)) });
});

// Posts a comment to the day the page shows, which must be today, once the signed-in player's run is over: to the
// friends thread, or to a group's when the body names one. The author comes from the verified session, never from the
// body.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const { date, body, group } = await readJsonObject(request);
  if (!isCalendarDate(date)) throw new AppError("bad_request", 400, "date");
  const comment = await postComment(getPool(), userId, date, readCommentBody(body), group === undefined ? null : readGroupId(group));
  return Response.json({ ok: true, comment }, { status: 201 });
});
