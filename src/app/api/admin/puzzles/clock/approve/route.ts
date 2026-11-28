import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { isAdmin } from "@/admin/is-admin";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { isCalendarDate } from "@/content/puzzle";
import { clockContext, readPicks } from "@/admin/clock-days";
import { buildChecked } from "@/content/clock-day";
import { approvePuzzle, readDrafts } from "@/admin/puzzles";
import { STATUS } from "@/lib/status";

// Approves a day on a clock (docs/milestones/M23-23e-drafting-and-approving.md, 23e-1). The request holds only the date and, per
// question, the list, the wording if edited and the re-roll count: the server builds the day again from the researched lists as the
// draft does, checks it by the same content rules as a file (three different researched lists, a wording, six rare answers), then
// against the answer database by private.approve_puzzle, which also checks the admin and refuses a day that is over. A failure
// lists each problem and saves nothing.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  // Checked here too, before anything about lists or dates is read, so a non-admin learns nothing.
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", STATUS.forbidden);
  const { date, questions } = await readJsonObject(request);
  if (!isCalendarDate(date)) throw new AppError("bad_request", STATUS.badRequest, "date");
  const picks = readPicks(questions);
  const { source } = await clockContext(db, userId, readDrafts());
  const checked = buildChecked(date, picks, source);
  const problems = "problems" in checked ? checked.problems : await approvePuzzle(db, userId, checked.built.day);
  if (problems.length) return Response.json({ ok: false, error: "puzzle_invalid", problems }, { status: STATUS.unprocessableContent });
  return Response.json({ ok: true });
});
