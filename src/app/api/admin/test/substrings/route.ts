import { readSubstringDraft } from "@/admin/substrings";
import { isCalendarDate } from "@/content/puzzle";
import type { SubstringDay } from "@/content/substrings";
import { substringTestRun } from "@/game/substring-test-run";
import { isAdmin } from "@/insights/queries";
import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle, readJsonObject } from "@/lib/http";
import { SUBSTRINGS_ID } from "@/platform/game";
import { STATUS } from "@/lib/status";

// One step of a Fragments test run (docs/milestones/M15-15f-fragments-test-run.md, 15f-2), as /api/admin/test is game 1's:
// an admin plays any day and nothing is saved; the browser sends the whole run each time (src/game/substring-test-run.ts).
// The date's draft is played when it has one, as the Puzzles page shows it, else its approved day; played says which, for the
// test bar's label.
export const POST = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const db = getPool();
  // Before anything about drafts or dates is read, so a non-admin learns nothing, as the approve routes do.
  if (!(await isAdmin(db, userId))) throw new AppError("admins_only", STATUS.forbidden);
  const { date, words, open, text } = await readJsonObject(request);
  if (!isCalendarDate(date)) throw new AppError("bad_request", STATUS.badRequest, "date");
  if (!Array.isArray(words) || !words.every((w) => w === null || typeof w === "string")) throw new AppError("bad_request", STATUS.badRequest, "words");
  if (typeof open !== "boolean") throw new AppError("bad_request", STATUS.badRequest, "open");
  if (text !== null && typeof text !== "string") throw new AppError("bad_request", STATUS.badRequest, "text");

  const draft = readSubstringDraft(date);
  if (draft && "problems" in draft) return Response.json({ ok: false, error: "puzzle_invalid", problems: draft.problems }, { status: STATUS.unprocessableContent });
  let day: SubstringDay;
  if (draft) day = draft.day;
  else {
    const { rows } = await db.query<{ content: SubstringDay }>("select content from private.puzzle where game_id = $1 and puzzle_date = $2::date", [SUBSTRINGS_ID, date]);
    if (rows.length === 0) throw new AppError("no_puzzle", STATUS.notFound);
    day = rows[0].content;
  }
  return Response.json({ ok: true, played: draft ? "draft" : "approved", ...(await substringTestRun(db, userId, day, { words, open, text })) });
});
