// Runs, answers and logged misses (docs/milestones/M00-data-design.md §5). The database enforces the rules
// (one run per day, order, the day boundary, append-only); this module asks it and shapes the responses.
// Dates are always read as text: "today" is decided by private.today() alone, never by TypeScript (§8).
import { DatabaseError } from "pg";
import { GAME_ID, avoids, stolenLetters, type Puzzle } from "@/content/puzzle";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { matchAnswer, resolveTyped } from "./matching";
import { hostAnswers, named, publicQuestion, type Named, type PublicQuestion } from "./payload";

// "timed_out": the current question's 20 seconds ran out, which ends the run (M13 13c-2; the database decides). The
// timer, not midnight, ends an unfinished run: a run started before midnight can be finished after it (human,
// 2026-10-21; its score won't count for leaderboards, M08).
export type RunStatus = "not_started" | "in_progress" | "died" | "survived" | "timed_out";

export type AnsweredQuestion = { index: number; prompt: string; answer: Named; matched: boolean; hostAnswers: Named[] };

export type RunState = {
  date: string;
  status: RunStatus;
  total: number;
  answered: AnsweredQuestion[];
  // The next question while the run is in progress, otherwise null.
  question: PublicQuestion | null;
  // Milliseconds left on that question's timer, measured by the database when this state was read; null when
  // there is no question. The client counts down from it, and the database stays the judge.
  msLeft: number | null;
};

type StoredEvent = { question_idx: number; entry_id: string; matched: boolean };

// The SQLSTATEs raised by the answer trigger (supabase/migrations/20261019074108_create_game_tables.sql, as changed by
// 20261021081057_question_timer.sql).
const OUT_OF_ORDER = "OB002";
const RUN_OVER = "OB003";
const TIME_UP = "OB005";

async function todaysPuzzle(db: Db): Promise<{ date: string; puzzle: Puzzle }> {
  const { rows } = await db.query<{ date: string; content: Puzzle | null }>(
    `select private.today()::text as date,
            (select content from private.puzzle where game_id = $1 and puzzle_date = private.today()) as content`,
    [GAME_ID],
  );
  const { date, content } = rows[0];
  if (!content) throw new AppError("no_puzzle_today", 404);
  return { date, puzzle: content };
}

async function events(db: Db, userId: string, date: string): Promise<StoredEvent[]> {
  const { rows } = await db.query<StoredEvent>(
    `select question_idx, entry_id, matched from private.run_event
     where user_id = $1 and game_id = $2 and puzzle_date = $3::date order by question_idx`,
    [userId, GAME_ID, date],
  );
  return rows;
}

function buildState(date: string, puzzle: Puzzle, status: RunStatus, stored: StoredEvent[], msLeft: number | null): RunState {
  const answered = stored.map((e) => {
    const question = puzzle.questions[e.question_idx];
    return {
      index: e.question_idx,
      prompt: question.prompt,
      answer: named(question, e.entry_id),
      matched: e.matched,
      hostAnswers: hostAnswers(question),
    };
  });
  const question = status === "in_progress" ? publicQuestion(puzzle, stored.length) : null;
  return { date, status, total: puzzle.questions.length, answered, question, msLeft: question ? msLeft : null };
}

async function stateOf(db: Db, userId: string, date: string, puzzle: Puzzle): Promise<RunState> {
  const { rows } = await db.query<{ status: RunStatus; ms_left: number }>(
    `select status, greatest(0, floor(extract(epoch from deadline - statement_timestamp()) * 1000))::int as ms_left
     from private.run_status where user_id = $1 and game_id = $2 and puzzle_date = $3::date`,
    [userId, GAME_ID, date],
  );
  if (rows.length === 0) return buildState(date, puzzle, "not_started", [], null);
  return buildState(date, puzzle, rows[0].status, await events(db, userId, date), rows[0].ms_left);
}

// The player's run still in progress, if any (after midnight it can be yesterday's), otherwise today's puzzle.
export async function todaysState(db: Db, userId: string): Promise<RunState> {
  const { rows } = await db.query<{ date: string; content: Puzzle }>(
    `select s.puzzle_date::text as date, p.content
     from private.run_status s join private.puzzle p on p.game_id = s.game_id and p.puzzle_date = s.puzzle_date
     where s.user_id = $1 and s.game_id = $2 and s.status = 'in_progress'
     order by s.puzzle_date desc limit 1`,
    [userId, GAME_ID],
  );
  if (rows.length) return stateOf(db, userId, rows[0].date, rows[0].content);
  const { date, puzzle } = await todaysPuzzle(db);
  return stateOf(db, userId, date, puzzle);
}

// Starts today's run, or returns it if it already exists: the primary key allows one per player per day,
// and the date is pinned by private.today() in the insert itself (§5).
export async function startRun(db: Db, userId: string): Promise<RunState> {
  try {
    await db.query(
      `insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, private.today())
       on conflict (user_id, game_id, puzzle_date) do nothing`,
      [userId, GAME_ID],
    );
  } catch (err) {
    // The foreign key to private.puzzle: nothing is published for today. The run's other foreign key, to
    // auth.users, raises 23503 too and stays a 500 (M02 2f, B1).
    if (err instanceof DatabaseError && err.code === "23503" && err.constraint === "run_game_id_puzzle_date_fkey") {
      throw new AppError("no_puzzle_today", 404);
    }
    throw err;
  }
  // Read back as "today" again: if midnight passed since the insert, the player sees the new day (not started).
  return todaysState(db, userId);
}

// Answers one question of the player's latest run with typed text, which the server turns into an entry
// (matching.ts, resolveTyped). Text that names no entry is logged as a miss and costs nothing: the player tries
// again (human, 2026-10-21). A retry naming the same entry returns the stored result; a different entry for an
// answered question is 409 already_answered (§5). After the question's 20 seconds the run_event trigger refuses
// the insert with time_up, and the run has ended.
export async function answer(db: Db, userId: string, index: number, typed: string): Promise<{ run: RunState; notInList: boolean }> {
  const { rows } = await db.query<{ date: string; content: Puzzle }>(
    `select r.puzzle_date::text as date, p.content
     from private.run r join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
     where r.user_id = $1 and r.game_id = $2
     order by r.puzzle_date desc limit 1`,
    [userId, GAME_ID],
  );
  if (rows.length === 0) throw new AppError("no_run", 404);
  const { date, content: puzzle } = rows[0];
  if (index >= puzzle.questions.length) throw new AppError("bad_request", 400, "no such question");

  // A stolen letter can't be typed in the answer box (G11), so text with one comes from a bypassed client.
  const stolen = stolenLetters(puzzle, index);
  if (!avoids(typed, stolen)) throw new AppError("stolen_letter", 400);
  const entryId = resolveTyped(puzzle.questions[index], typed, stolen);
  if (!entryId) {
    try {
      await logMiss(db, userId, date, index, typed);
    } catch (err) {
      // logMiss only logs for a run in progress; one whose time ran out shows its ending instead of a 409.
      const run = await stateOf(db, userId, date, puzzle);
      if (err instanceof AppError && err.code === "not_current_question" && run.status === "timed_out") return { run, notInList: false };
      throw err;
    }
    return { run: await stateOf(db, userId, date, puzzle), notInList: true };
  }
  const settled = await settledAnswer(db, userId, date, index, entryId);
  if (settled) return { run: await stateOf(db, userId, date, puzzle), notInList: false };

  const result = matchAnswer(puzzle.questions[index], entryId);
  try {
    await db.query(
      `insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
       values ($1, $2, $3::date, $4, $5, $6)`,
      [userId, GAME_ID, date, index, entryId, result === "matched"],
    );
  } catch (err) {
    if (!(err instanceof DatabaseError)) throw err;
    // Too late for this question: the run has ended, and the state says so (rule 3; the trigger decides).
    if (err.code === TIME_UP) return { run: await stateOf(db, userId, date, puzzle), notInList: false };
    // A concurrent request may have answered this index between our read and our insert (ROADMAP: never 500).
    if (err.code === "23505" || err.code === OUT_OF_ORDER || err.code === RUN_OVER) {
      if (await settledAnswer(db, userId, date, index, entryId)) return { run: await stateOf(db, userId, date, puzzle), notInList: false };
      throw new AppError(err.code === RUN_OVER ? "run_over" : "out_of_order", 409);
    }
    throw err;
  }
  return { run: await stateOf(db, userId, date, puzzle), notInList: false };
}

// True if this index already holds this entry; 409 if it holds another; false if it is unanswered.
async function settledAnswer(db: Db, userId: string, date: string, index: number, entryId: string): Promise<boolean> {
  const stored = (await events(db, userId, date)).find((e) => e.question_idx === index);
  if (!stored) return false;
  if (stored.entry_id !== entryId) throw new AppError("already_answered", 409);
  return true;
}

// Logs typed text that named no entry for the question the player is on, at no cost to the run (human, 2026-10-18).
// The table's check allows 1 to 40 characters; longer text is rejected and nothing is stored.
export async function logMiss(db: Db, userId: string, date: string, index: number, typed: string): Promise<void> {
  let rowCount: number | null;
  try {
    ({ rowCount } = await db.query(
      `insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed)
       select s.user_id, s.game_id, s.puzzle_date, $3::smallint, $4
       from private.run_status s
       where s.user_id = $1 and s.game_id = $2 and s.puzzle_date = $5::date
         and s.status = 'in_progress' and s.answered = $3::smallint`,
      [userId, GAME_ID, index, typed, date],
    ));
  } catch (err) {
    if (err instanceof DatabaseError && err.code === "23514" && err.constraint === "missed_answer_typed_length") {
      throw new AppError("text_invalid", 400);
    }
    throw err;
  }
  if (rowCount === 0) throw new AppError("not_current_question", 409);
}
