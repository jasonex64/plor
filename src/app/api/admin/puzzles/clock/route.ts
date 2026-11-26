import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { isAdmin } from "@/insights/queries";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { isCalendarDate } from "@/content/puzzle";
import { clockContext, previewDay, readPicks, redraftDay } from "@/admin/clock-days";
import { readDrafts } from "@/admin/puzzles";
import { STATUS } from "@/lib/status";

// The day on a clock the approval page shows for a change it has made (docs/milestones/M23-23e-drafting-and-approving.md, 23e-1),
// built on the server from the researched lists and never from anything the page holds: with `questions` (a list, a wording if
// edited and a re-roll count each) that day, with `skip` (the lists the page has shown) a fresh one, the lists the draft would pick
// next. It saves nothing. Admins only: signed out → 401, not in private.admin → 403.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", STATUS.forbidden);
  const { date, questions, skip } = await readJsonObject(request);
  if (!isCalendarDate(date)) throw new AppError("bad_request", STATUS.badRequest, "date");
  if ((questions === undefined) === (skip === undefined)) throw new AppError("bad_request", STATUS.badRequest, "questions or skip");
  const context = await clockContext(db, userId, readDrafts());
  let view;
  if (questions !== undefined) view = previewDay(date, readPicks(questions), context);
  else {
    if (!Array.isArray(skip) || !skip.every((c) => typeof c === "string")) throw new AppError("bad_request", STATUS.badRequest, "skip");
    view = redraftDay(date, skip, context);
  }
  if ("problems" in view) return Response.json({ ok: false, error: "puzzle_invalid", problems: view.problems }, { status: STATUS.unprocessableContent });
  return Response.json({ ok: true, ...view });
});
