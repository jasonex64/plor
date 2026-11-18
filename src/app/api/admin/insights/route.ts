import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { dayInsights, isAdmin, reportDays } from "@/insights/queries";
import { isCalendarDate } from "@/content/puzzle";
import { STATUS } from "@/lib/status";

// The puzzle insights report, for admins only (docs/milestones/M03-puzzle-insights.md, D1): signed out → 401,
// signed in but not in private.admin → 403. `?date=YYYY-MM-DD` picks a day; the default is the newest
// day with a puzzle (today if it has one).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", STATUS.forbidden);
  const date = new URL(request.url).searchParams.get("date");
  if (date !== null && !isCalendarDate(date)) throw new AppError("bad_request", STATUS.badRequest, "date");
  return Response.json({ ok: true, days: await reportDays(db), report: await dayInsights(db, date) });
});
