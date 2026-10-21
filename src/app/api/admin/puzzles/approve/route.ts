import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { isAdmin } from "@/insights/queries";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { checkPuzzle, isCalendarDate } from "@/content/puzzle";
import { withHostAnswers } from "@/admin/puzzle-entry";
import { approvePuzzle, readDrafts } from "@/admin/puzzles";

// Approves a drafted day with the host answers the admin chose (docs/milestones/M06-puzzle-entry.md). The result is
// checked by the same content rules as a file; a failure lists each problem and saves nothing. The database function
// checks the admin, refuses a day that is over, and its trigger refuses changing a day that has started.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  // Checked here too, before anything about drafts or dates is read, so a non-admin learns nothing.
  if (!(await isAdmin(getPool(), userId))) throw new AppError("admins_only", 403);
  const { date, hostAnswers } = await readJsonObject(request);
  if (!isCalendarDate(date)) throw new AppError("bad_request", 400, "date");
  const draft = readDrafts().get(date);
  if (!draft) throw new AppError("no_draft", 404);
  if (!isHostAnswerLists(hostAnswers, draft.questions.length)) throw new AppError("bad_request", 400, "hostAnswers");
  const puzzle = withHostAnswers(draft, hostAnswers);
  const problems = checkPuzzle(date, puzzle);
  if (problems.length) return Response.json({ ok: false, error: "puzzle_invalid", problems }, { status: 422 });
  await approvePuzzle(getPool(), userId, puzzle);
  return Response.json({ ok: true });
});

// One list of entry IDs per question.
function isHostAnswerLists(v: unknown, questions: number): v is string[][] {
  return Array.isArray(v) && v.length === questions && v.every((l) => Array.isArray(l) && l.every((id) => typeof id === "string"));
}
