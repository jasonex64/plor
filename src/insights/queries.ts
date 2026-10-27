// What the insights report reads (docs/milestones/M03-puzzle-insights.md). No query selects a user ID, so the report
// can't name players (D4). Dates are read as text and "today" is private.today() (M00 data design §8).
import { type ApprovedPuzzle } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import type { Db } from "@/lib/db";
import { thingNames } from "@/game/payload";
import { AppError } from "@/lib/http";
import { buildInsights, type AnswerRow, type DayInsights, type MissRow } from "./report";

export async function isAdmin(db: Db, userId: string): Promise<boolean> {
  const { rows } = await db.query("select 1 from private.admin where user_id = $1", [userId]);
  return rows.length > 0;
}

// Days the report can show: every published day up to today (D5), newest first.
export async function reportDays(db: Db): Promise<string[]> {
  const { rows } = await db.query<{ date: string }>(
    "select puzzle_date::text as date from private.puzzle where game_id = $1 and puzzle_date <= private.today() order by puzzle_date desc",
    [GAME_ID],
  );
  return rows.map((r) => r.date);
}

// One day's report; `date` defaults to the newest day in reportDays: today if it has a puzzle, else the last finished
// day, so the report stays reachable on days with no puzzle (M03 D5; M02 2f, B3). A day that hasn't started, or has no
// puzzle, is not available.
export async function dayInsights(db: Db, date: string | null): Promise<DayInsights> {
  const { rows } = await db.query<{ date: string; finished: boolean; content: ApprovedPuzzle }>(
    `select p.puzzle_date::text as date, p.puzzle_date < private.today() as finished, p.content
     from private.puzzle p
     where p.game_id = $1 and p.puzzle_date <= private.today()
       and p.puzzle_date = coalesce($2::date,
         (select max(puzzle_date) from private.puzzle where game_id = $1 and puzzle_date <= private.today()))`,
    [GAME_ID, date],
  );
  if (rows.length === 0) throw new AppError("not_available", 404);
  const day = rows[0];
  const answers = await db.query<AnswerRow>(
    "select question_idx, entry_id, matched from private.run_event where game_id = $1 and puzzle_date = $2::date",
    [GAME_ID, day.date],
  );
  const misses = await db.query<MissRow>(
    "select question_idx, typed from private.missed_answer where game_id = $1 and puzzle_date = $2::date",
    [GAME_ID, day.date],
  );
  const names = await thingNames(db, [...answers.rows.map((a) => a.entry_id), ...day.content.questions.flatMap((q) => q.host_answers)]);
  return buildInsights(day.date, day.finished, day.content, answers.rows, misses.rows, names);
}
