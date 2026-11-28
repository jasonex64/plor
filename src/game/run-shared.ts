// What a run on a clock needs of the database that is not a move of the run itself (docs/milestones/M23-23f-the-switch.md,
// 23f-3): the SQLSTATEs its triggers raise, the limit on typed text, the time to the next reset and a missed text's log.
import { DatabaseError } from "pg";
import { normalize } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import type { Db } from "@/lib/db";
import { TYPED_ANSWER_MAX_LENGTH } from "@/config/tunables";
import { AppError } from "@/lib/http";
import { STATUS } from "@/lib/status";

// The SQLSTATEs raised by the answer and Next triggers (supabase/migrations/20261028140000_baseline.sql).
export const OUT_OF_ORDER = "OB002";
export const RUN_OVER = "OB003";
export const NOT_OPEN = "OB006";

// Refuses typed text over the limit before any matching: the typo check builds every one-edit spelling of what it is
// given (audit W1, docs/audits/2026-11-11-weekly-audit.md).
export function assertTypedLength(typed: string): void {
  // A NUL character can't be stored in Postgres text (it fails with 22021 when the miss is logged), so it is refused too (19b).
  if (typed.length > TYPED_ANSWER_MAX_LENGTH || typed.includes("\0")) throw new AppError("text_invalid", STATUS.badRequest);
}

// Milliseconds to the next reset, for a page with no run state of its own: a group's (M11 H6).
export async function msToReset(db: Db): Promise<number> {
  const { rows } = await db.query<{ ms: number }>(
    "select floor(extract(epoch from private.next_reset() - statement_timestamp()) * 1000)::int as ms",
  );
  return rows[0].ms;
}

// Logs typed text that named no entry for the question the player is on, at no cost to the run (human, 2026-10-18). On a day
// on a clock private.record_miss only stores the text and decides nothing from it (supabase/migrations/20261126081829_
// clock_day_misses.sql), so the arguments it takes for judging a miss are passed as nothing. The table's check allows 1 to 40
// characters; longer text is rejected and nothing is stored.
export async function logMiss(db: Db, userId: string, date: string, index: number, typed: string): Promise<void> {
  let logged: boolean;
  try {
    ({
      rows: [{ logged }],
    } = await db.query<{ logged: boolean }>("select private.record_miss($1, $2, $3::date, $4, $5, $6, false, false, 0, 0) as logged", [
      userId,
      GAME_ID,
      date,
      index,
      typed,
      normalize(typed),
    ]));
  } catch (err) {
    if (err instanceof DatabaseError && err.code === "23514" && err.constraint === "missed_answer_typed_length") {
      throw new AppError("text_invalid", STATUS.badRequest);
    }
    throw err;
  }
  if (!logged) throw new AppError("not_current_question", STATUS.conflict);
}
