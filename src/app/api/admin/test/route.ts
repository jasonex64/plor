import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { isAdmin } from "@/insights/queries";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { isCalendarDate, type ApprovedPuzzle } from "@/content/puzzle";
import { withHostAnswers } from "@/admin/puzzle-entry";
import { buildPuzzle, draftProblems, isHostAnswerLists, readDrafts } from "@/admin/puzzles";
import { dayLookup, draftLookup } from "@/game/matching";
import { testRun } from "@/game/runs";
import { GAME_ID } from "@/platform/game";

// One step of a test run (docs/milestones/M14-14b-11-test-runs.md): an admin plays any day and nothing is saved; the
// browser sends the whole run each time (src/game/runs.ts, testRun). With hostAnswers it plays the date's draft with
// those host answers, the page's own, saved or not (human, 2026-10-29, answer 9), built as approval would build it now
// and refused with approval's problems (answers 10 and 11); without them, the approved day, past, today or upcoming.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  // Before anything about drafts or dates is read, so a non-admin learns nothing (answer 4), as the approve route does.
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", 403);
  const { date, hostAnswers, texts, open, timedOut, text } = await readJsonObject(request);
  if (!isCalendarDate(date)) throw new AppError("bad_request", 400, "date");
  if (!Array.isArray(texts) || !texts.every((t) => typeof t === "string" && t.trim() !== "")) throw new AppError("bad_request", 400, "texts");
  if (typeof open !== "boolean" || typeof timedOut !== "boolean") throw new AppError("bad_request", 400, "open, timedOut");
  if (text !== null && (typeof text !== "string" || text.trim() === "")) throw new AppError("bad_request", 400, "text");
  const moves = { texts: texts.map((t: string) => t.trim()), open, timedOut, text: text === null ? null : text.trim() };

  if (hostAnswers === undefined) {
    const { rows } = await db.query<{ content: ApprovedPuzzle }>("select content from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, date]);
    if (rows.length === 0) throw new AppError("no_puzzle", 404);
    const puzzle = rows[0].content;
    if (moves.texts.length > puzzle.questions.length) throw new AppError("bad_request", 400, "texts");
    return Response.json({ ok: true, ...(await testRun(db, puzzle, dayLookup(db, puzzle), moves)) });
  }
  const draft = readDrafts().get(date);
  if (!draft) throw new AppError("no_draft", 404);
  if (!isHostAnswerLists(hostAnswers, draft.questions.length)) throw new AppError("bad_request", 400, "hostAnswers");
  if (moves.texts.length > draft.questions.length) throw new AppError("bad_request", 400, "texts");
  const puzzle = withHostAnswers(draft, hostAnswers);
  const problems = await draftProblems(db, date, puzzle);
  const result = problems.length ? { problems } : await buildPuzzle(db, userId, puzzle);
  if ("problems" in result) return Response.json({ ok: false, error: "puzzle_invalid", problems: result.problems }, { status: 422 });
  return Response.json({ ok: true, ...(await testRun(db, result.built, draftLookup(db, userId, result.built), moves)) });
});
