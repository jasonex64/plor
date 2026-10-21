import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { isAdmin } from "@/insights/queries";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { isCalendarDate } from "@/content/puzzle";
import { readQuestions } from "@/admin/puzzle-entry";
import { saveQuestions } from "@/admin/puzzles";

// Saves the questions an admin typed for a day (docs/milestones/M06-puzzle-entry.md). The database function checks the
// admin and the date itself; this route checks the shape: a real date and 7 non-empty questions.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  // Checked here too, before anything about drafts or dates is read, so a non-admin learns nothing.
  if (!(await isAdmin(getPool(), userId))) throw new AppError("admins_only", 403);
  const { date, questions } = await readJsonObject(request);
  if (!isCalendarDate(date)) throw new AppError("bad_request", 400, "date");
  const prompts = readQuestions(questions);
  if (!prompts) throw new AppError("questions_invalid", 400);
  await saveQuestions(getPool(), userId, date, prompts);
  return Response.json({ ok: true });
});
