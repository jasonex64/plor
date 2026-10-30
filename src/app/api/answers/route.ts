import { createAuthClient, requireUserId } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { AppError, checkProtocol, handle } from "@/lib/http";
import { isCalendarDate } from "@/content/puzzle";
import { searchAnswers } from "@/game/answers";

// A played question's answers, searched by the signed-in player (docs/milestones/M14-14b-12-answer-lists.md): ?date
// and ?index name the question, ?q the text (empty for the most given). Security change (DECISIONS.md Log,
// 2026-10-30): private.search_answers decides who may, and answers 403 answers_closed otherwise.
export const GET = handle(async (request) => {
  checkProtocol(request);
  const userId = await requireUserId(await createAuthClient());
  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  const index = params.get("index");
  const q = params.get("q") ?? "";
  if (!isCalendarDate(date)) throw new AppError("bad_request", 400, "date");
  if (index === null || !/^\d+$/.test(index)) throw new AppError("bad_request", 400, "index");
  return Response.json({ ok: true, answers: await searchAnswers(getPool(), userId, date, Number(index), q) });
});
