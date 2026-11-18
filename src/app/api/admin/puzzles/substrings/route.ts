import { approveSubstringDay, readSubstringDrafts } from "@/admin/substrings";
import { isCalendarDate } from "@/content/puzzle";
import { isAdmin } from "@/insights/queries";
import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { STATUS } from "@/lib/status";

// Approves a drafted day of game 2 (docs/milestones/M16-16c-a-day-of-game-2.md, 16c-2). Reading the drafts holds it to
// the format's rules; private.approve_puzzle checks the admin itself, and refuses a day that is over or has started.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  // Checked here too, before anything about drafts or dates is read, so a non-admin learns nothing.
  if (!(await isAdmin(getPool(), userId))) throw new AppError("admins_only", STATUS.forbidden);
  const { date } = await readJsonObject(request);
  if (!isCalendarDate(date)) throw new AppError("bad_request", STATUS.badRequest, "date");
  const draft = readSubstringDrafts().get(date);
  if (!draft) throw new AppError("no_draft", STATUS.notFound);
  const problems = await approveSubstringDay(getPool(), userId, draft);
  if (problems.length) return Response.json({ ok: false, error: "puzzle_invalid", problems }, { status: STATUS.unprocessableContent });
  return Response.json({ ok: true });
});
