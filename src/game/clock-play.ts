// The database's side of a run on a clock (docs/milestones/M23-23c-the-run-on-a-clock.md), once, for a signed-in player and
// for a guest: they differ only in the tables and the key column (a Side), so the reads, the answer, Next and Finish are
// the same lines. src/game/clock-runs.ts and src/game/guest-clock-runs.ts say who is playing. The database's triggers
// judge every move (private.check_clock_answer and its siblings, which raise the OB codes below); this module resolves
// typed text as a run always has, asks, and shapes the result. "Today" is private.today() alone, never TypeScript's.
import { DatabaseError } from "pg";
import { CLOCK_FORMAT, type ApprovedPuzzle, type ClockPuzzle } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { STATUS } from "@/lib/status";
import { dayLookup, resolveTyped } from "./matching";
import { thingNames } from "./payload";
import { assertTypedLength, NOT_OPEN, OUT_OF_ORDER, RUN_OVER } from "./runs";
import { buildClockState, clockNameIds, type ClockState, type StoredClockAnswer } from "./clock-state";
import type { RunStatus } from "./status";

// The SQLSTATEs the clock triggers raise (supabase/migrations/20261124235832_clock_run.sql); OB002, OB003 and OB006 are
// runs.ts's, and an answer's three rules are the same as there.
export const NOT_LAST_QUESTION = "OB019";

// Who is playing, and where their rows are. The identifiers are fixed here, never from a request.
export type Side = {
  key: string | null;
  keyColumn: "user_id" | "token_hash";
  run: string;
  status: string;
  answer: string;
  finish: string;
  open: string;
  // A guest's run is always today's; a player's is the latest one (and a run in progress from before midnight is resumed).
  onlyToday: boolean;
  // The error for a run that isn't there.
  noRun: () => AppError;
};

export const playerSide = (userId: string): Side => ({
  key: userId,
  keyColumn: "user_id",
  run: "run",
  status: "run_status",
  answer: "clock_answer",
  finish: "clock_finish",
  open: "question_open",
  onlyToday: false,
  noRun: () => new AppError("no_run", STATUS.notFound),
});

// A guest with no run or a closed day's run has no run to play: run_over, as guest-runs.ts.
export const guestSide = (tokenHash: string | null): Side => ({
  key: tokenHash,
  keyColumn: "token_hash",
  run: "guest_run",
  status: "guest_run_status",
  answer: "guest_clock_answer",
  finish: "guest_clock_finish",
  open: "guest_question_open",
  onlyToday: true,
  noRun: () => new AppError("run_over", STATUS.conflict),
});

type Played = { date: string; puzzle: ApprovedPuzzle | ClockPuzzle };

// The day a run is read for: a player's run in progress, even from before midnight (runs.ts, todaysState), else today. null
// when nothing is approved for that day.
export async function playedDay(db: Db, side: Side): Promise<Played | null> {
  const { rows } = side.onlyToday
    ? await db.query<{ date: string; content: Played["puzzle"] }>(
        "select p.puzzle_date::text as date, p.content from private.puzzle p where p.game_id = $1 and p.puzzle_date = private.today()",
        [GAME_ID],
      )
    : await db.query<{ date: string; content: Played["puzzle"] }>(
        `select p.puzzle_date::text as date, p.content
         from private.puzzle p
         where p.game_id = $2 and p.puzzle_date = coalesce(
           (select s.puzzle_date from private.${side.status} s where s.${side.keyColumn} = $1 and s.game_id = $2 and s.status = 'in_progress'
            order by s.puzzle_date desc limit 1),
           private.today())`,
        [side.key, GAME_ID],
      );
  return rows.length ? { date: rows[0].date, puzzle: rows[0].content } : null;
}

// The day's run is on a clock: the route's choice between this module and the seven-question game's.
export async function isClockDay(db: Db, side: Side): Promise<boolean> {
  return (await playedDay(db, side))?.puzzle.format === CLOCK_FORMAT;
}

// The side's latest clock run, which a move acts on: a player's latest, a guest's today's. null when there is none.
async function latestRun(db: Db, side: Side): Promise<{ date: string; puzzle: ClockPuzzle } | null> {
  const { rows } = await db.query<{ date: string; content: ClockPuzzle }>(
    `select r.puzzle_date::text as date, p.content
     from private.${side.run} r join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
     where r.${side.keyColumn} = $1 and r.game_id = $2 and p.content ->> 'format' = '4'
       ${side.onlyToday ? "and r.puzzle_date = private.today()" : ""}
     order by r.puzzle_date desc limit 1`,
    [side.key, GAME_ID],
  );
  return rows.length ? { date: rows[0].date, puzzle: rows[0].content } : null;
}

// The state of the side's run on a date. One statement reads the status, the clock, the time to the reset and the answers,
// so they are of one instant (and a guest's purge can't take the rows between two reads).
export async function stateOf(db: Db, side: Side, date: string, puzzle: ClockPuzzle): Promise<ClockState> {
  const { rows } = await db.query<{
    status: RunStatus | null;
    answered: number | null;
    ms_left: number | null;
    ms_to_reset: number;
    day_over: boolean;
    answers: StoredClockAnswer[];
  }>(
    `select s.status, s.answered,
            case when s.deadline is null then null
                 else greatest(0, floor(extract(epoch from s.deadline - statement_timestamp()) * 1000))::int end as ms_left,
            floor(extract(epoch from private.next_reset() - statement_timestamp()) * 1000)::int as ms_to_reset,
            $3::date < private.today() as day_over,
            coalesce((select json_agg(json_build_object('question_idx', a.question_idx, 'entry_id', a.entry_id, 'tier', a.tier,
                                                        'added_ms', a.added_ms, 'points', a.points) order by a.created_at)
                      from private.${side.answer} a
                      where s.status is not null and a.${side.keyColumn} = $1 and a.game_id = $2 and a.puzzle_date = $3::date), '[]'::json) as answers
     from (select 1) as one
     left join private.${side.status} s on s.${side.keyColumn} = $1 and s.game_id = $2 and s.puzzle_date = $3::date`,
    [side.key, GAME_ID, date],
  );
  const { status, answered, ms_left, ms_to_reset, day_over, answers } = rows[0];
  const names = await thingNames(db, clockNameIds(date, puzzle, answers, status));
  return buildClockState(date, puzzle, answers, { status, answered, msLeft: ms_left, msToReset: ms_to_reset, dayOver: day_over }, names);
}

// The side's run in progress or today's day, not started: null when nothing is approved for it.
export async function todaysClockState(db: Db, side: Side): Promise<ClockState | null> {
  const day = await playedDay(db, side);
  return day && stateOf(db, side, day.date, day.puzzle as ClockPuzzle);
}

// Starts today's run, or returns it if it exists: the primary key allows one a day, and the date is pinned by private.today()
// in the insert itself.
export async function startClockRun(db: Db, side: Side): Promise<ClockState> {
  try {
    await db.query(
      `insert into private.${side.run} (${side.keyColumn}, game_id, puzzle_date) values ($1, $2, private.today())
       on conflict do nothing`,
      [side.key, GAME_ID],
    );
  } catch (err) {
    // The foreign key to private.puzzle: nothing is published for today.
    if (err instanceof DatabaseError && err.code === "23503" && err.constraint === `${side.run}_game_id_puzzle_date_fkey`) {
      throw new AppError("no_puzzle_today", STATUS.notFound);
    }
    throw err;
  }
  const state = await todaysClockState(db, side);
  if (!state) throw new AppError("no_puzzle_today", STATUS.notFound);
  return state;
}

// What logging a miss is for this side: a player's is logged (runs.ts, logMiss), a guest's is stored nowhere (M19 answer 19).
export type LogMiss = ((puzzle: ClockPuzzle, index: number, typed: string) => Promise<void>) | null;

export type ClockAnswerResult = { run: ClockState; notInList: boolean; repeat: boolean };

// Answers the open question with typed text. The text is resolved only for the open question of a live run, so a later
// question's list can't be probed. A run that is over (the clock passed zero, or Finish) returns its state, as a question's
// time_up does in the seven-question game; text that names nothing, and a repeat, change nothing, and the first is a miss.
export async function answerClock(db: Db, side: Side, index: number, typed: string, logMiss: LogMiss): Promise<ClockAnswerResult> {
  const found = await latestRun(db, side);
  if (!found) throw side.noRun();
  const { date, puzzle } = found;
  if (index >= puzzle.questions.length) throw new AppError("bad_request", STATUS.badRequest, "no such question");
  assertTypedLength(typed);
  const over = async (): Promise<ClockAnswerResult> => ({ run: await stateOf(db, side, date, puzzle), notInList: false, repeat: false });

  const { rows: current } = await db.query<{ status: RunStatus; answered: number }>(
    `select status, answered from private.${side.status} where ${side.keyColumn} = $1 and game_id = $2 and puzzle_date = $3::date`,
    [side.key, GAME_ID, date],
  );
  // A guest's purge can take the run between the two reads, at the day's close.
  if (current.length === 0) throw side.noRun();
  if (current[0].status !== "in_progress") return over();
  if (current[0].answered !== index) throw new AppError("not_open", STATUS.conflict);

  // No letter is taken on a clock day.
  const resolved = await resolveTyped(dayLookup(db, puzzle), (ids) => thingNames(db, ids), puzzle, index, typed, []);
  if (resolved !== null && "needs" in resolved) throw new Error("a clock day takes no letters, so no text needs one");
  if (resolved === null) {
    if (logMiss) {
      try {
        await logMiss(puzzle, index, typed);
      } catch (err) {
        // logMiss logs only for a run in progress; one whose clock ran out between the reads shows its ending.
        if (err instanceof AppError && err.code === "not_current_question" && (await stateOf(db, side, date, puzzle)).status === "over") return over();
        throw err;
      }
    }
    return { run: await stateOf(db, side, date, puzzle), notInList: true, repeat: false };
  }

  try {
    // The trigger fills the tier, the time added and the points, and stores nothing for a repeat.
    const { rowCount } = await db.query(
      `insert into private.${side.answer} (${side.keyColumn}, game_id, puzzle_date, question_idx, entry_id) values ($1, $2, $3::date, $4, $5)`,
      [side.key, GAME_ID, date, index, resolved.thingId],
    );
    return { run: await stateOf(db, side, date, puzzle), notInList: false, repeat: rowCount === 0 };
  } catch (err) {
    if (!(err instanceof DatabaseError)) throw err;
    // The clock ran out, or Finish was pressed, between our read and our insert: the state says so.
    if (err.code === RUN_OVER) return over();
    // Another tab opened the next question between them.
    if (err.code === NOT_OPEN) throw new AppError("not_open", STATUS.conflict);
    // The run is gone: a guest's purge, at the day's close.
    if (err.code === "23503") throw side.noRun();
    throw err;
  }
}

// Opens the question after the one the tab is showing (fromIndex), while the run is live. Tapping again, or a second tab
// that shows the same question, returns the same state.
export async function nextClock(db: Db, side: Side, fromIndex: number): Promise<ClockState> {
  const found = await latestRun(db, side);
  if (!found) throw side.noRun();
  const { date, puzzle } = found;
  if (fromIndex >= puzzle.questions.length) throw new AppError("bad_request", STATUS.badRequest, "no such question");
  try {
    await db.query(
      `insert into private.${side.open} (${side.keyColumn}, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, $4)
       on conflict do nothing`,
      [side.key, GAME_ID, date, fromIndex + 1],
    );
  } catch (err) {
    if (!(err instanceof DatabaseError)) throw err;
    // Over, or there is no question after the last.
    if (err.code === RUN_OVER) throw new AppError("run_over", STATUS.conflict);
    // The tab is behind: not the question after the open one.
    if (err.code === OUT_OF_ORDER) throw new AppError("out_of_order", STATUS.conflict);
    if (err.code === "23503") throw side.noRun();
    throw err;
  }
  return stateOf(db, side, date, puzzle);
}

// Ends the run now, with the score as it stands, which the database allows only on the last question of a live run. A second
// Finish returns the state.
export async function finishClock(db: Db, side: Side): Promise<ClockState> {
  const found = await latestRun(db, side);
  if (!found) throw side.noRun();
  const { date, puzzle } = found;
  try {
    await db.query(`insert into private.${side.finish} (${side.keyColumn}, game_id, puzzle_date) values ($1, $2, $3::date)`, [side.key, GAME_ID, date]);
  } catch (err) {
    if (!(err instanceof DatabaseError)) throw err;
    if (err.code === NOT_LAST_QUESTION) throw new AppError("not_last_question", STATUS.conflict);
    if (err.code === RUN_OVER) throw new AppError("run_over", STATUS.conflict);
    if (err.code === "23503") throw side.noRun();
    throw err;
  }
  return stateOf(db, side, date, puzzle);
}
