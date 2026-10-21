import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { dayInsights, isAdmin, reportDays } from "@/insights/queries";

// The puzzle insights report, for admins only (docs/milestones/M03-puzzle-insights.md, D1): signed out → 401,
// signed in but not in private.admin → 403. `?date=YYYY-MM-DD` picks a day; the default is the newest
// day with a puzzle (today if it has one).
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", 403);
  const date = new URL(request.url).searchParams.get("date");
  if (date !== null && !isCalendarDate(date)) throw new AppError("bad_request", 400, "date");
  return Response.json({ ok: true, days: await reportDays(db), report: await dayInsights(db, date) });
});

// YYYY-MM-DD naming a real day: the pattern alone lets 2026-02-30 through to Postgres, which refuses it as a 500
// (M02 2f, B2). Node's Date.parse rolls an impossible day over (2026-02-30 became 2026-03-02) and returns NaN for
// month 13 (observed, Node 24, 2026-10-20), so the parse plus the round trip catches both.
function isCalendarDate(text: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text)) && new Date(text).toISOString().slice(0, 10) === text;
}
