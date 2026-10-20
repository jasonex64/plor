import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { dayInsights, isAdmin, reportDays } from "@/insights/queries";

// The puzzle insights report, for admins only (docs/milestones/M03-puzzle-insights.md, D1): signed out → 401,
// signed in but not in private.admin → 403. `?date=YYYY-MM-DD` picks a day; the default is today.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", 403);
  const date = new URL(request.url).searchParams.get("date");
  if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError("bad_request", 400, "date");
  return Response.json({ ok: true, days: await reportDays(db), report: await dayInsights(db, date) });
});
