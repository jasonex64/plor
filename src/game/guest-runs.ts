// A guest's game 1 run (docs/milestones/M18-guest-play.md, Design). The same rules as a signed-in run (runs.ts: the
// database's triggers decide order and clock, the matching and stolen letters are the same functions), held on the guest
// tables by the hash of the guest's token. A run's rows are kept after it ends, until the day's purge
// (private.purge_guest_days, run at any guest's Start once the day has closed; M19 answers 2, 3 and 10), so its result can
// be read again and a Start on it shows it. What a retry finds after the end is as a player's: the stored result for a
// repeat of the last answer, else a 4xx from the database's rules. Text that names no entry is a free retry and is stored
// nowhere (answer 19).
import { DatabaseError } from "pg";
import { avoids, stolenLetters, type ApprovedPuzzle } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { dayLookup, resolveTyped } from "./matching";
import { dayCounts, pooledCounts } from "./ledger";
import { thingNames } from "./payload";
import { assertTypedLength, buildState, NOT_OPEN, OUT_OF_ORDER, RUN_OVER, TIME_UP, todaysPuzzle, type RunState, type StoredEvent } from "./runs";
import { FINISHED, type RunStatus } from "./status";

// The guest's run, which is always today's: one left over midnight is not resumed, it waits for the purge (Design, "Same
// rules as a signed-in run"). null when there is none: never started, or left by a day that has closed.
async function todaysRun(db: Db, tokenHash: string): Promise<{ date: string; puzzle: ApprovedPuzzle } | null> {
  const { rows } = await db.query<{ date: string; content: ApprovedPuzzle }>(
    `select r.puzzle_date::text as date, p.content
     from private.guest_run r join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
     where r.token_hash = $1 and r.game_id = $2 and r.puzzle_date = private.today()`,
    [tokenHash, GAME_ID],
  );
  return rows.length ? { date: rows[0].date, puzzle: rows[0].content } : null;
}

async function events(db: Db, tokenHash: string, date: string): Promise<StoredEvent[]> {
  const { rows } = await db.query<StoredEvent>(
    `select question_idx, entry_id, matched, private.day_of(created_at) = puzzle_date as in_day from private.guest_run_event
     where token_hash = $1 and game_id = $2 and puzzle_date = $3::date order by question_idx`,
    [tokenHash, GAME_ID, date],
  );
  return rows;
}

// The state of the token's run on a date, as runs.ts's stateOf builds it. A run that is over is not ended by a read: its
// rows stay until the day's purge, so every read gives the result. A null hash is a visitor with no run: the day not started.
// The status and the events are one statement, so one snapshot: the purge can't delete the events between two reads.
async function stateOf(db: Db, tokenHash: string | null, date: string, puzzle: ApprovedPuzzle): Promise<RunState> {
  const { rows } = await db.query<{ status: RunStatus | null; ms_left: number | null; ms_to_reset: number; day_over: boolean; events: StoredEvent[] }>(
    `select s.status,
            case when s.deadline is null then null
                 else greatest(0, floor(extract(epoch from s.deadline - statement_timestamp()) * 1000))::int end as ms_left,
            floor(extract(epoch from private.next_reset() - statement_timestamp()) * 1000)::int as ms_to_reset,
            $3::date < private.today() as day_over,
            coalesce((select json_agg(json_build_object('question_idx', e.question_idx, 'entry_id', e.entry_id, 'matched', e.matched,
                                                        'in_day', private.day_of(e.created_at) = e.puzzle_date) order by e.question_idx)
                      from private.guest_run_event e
                      where s.status is not null and e.token_hash = $1 and e.game_id = $2 and e.puzzle_date = $3::date), '[]'::json) as events
     from (select 1) as one
     left join private.guest_run_status s on s.token_hash = $1 and s.game_id = $2 and s.puzzle_date = $3::date`,
    [tokenHash, GAME_ID, date],
  );
  const { status, ms_left, ms_to_reset, day_over, events: stored } = rows[0];
  const over = status !== null && FINISHED.includes(status);
  const counts = over ? (await dayCounts(db, [date])).get(date)! : null;
  const names = await thingNames(db, stored.flatMap((e) => [e.entry_id, ...puzzle.questions[e.question_idx].host_answers]));
  const pooled = await pooledCounts(db, puzzle, false);
  return buildState(date, puzzle, stored, { status, msLeft: ms_left, msToReset: ms_to_reset, dayOver: day_over }, counts, pooled, names);
}

// The guest's run, or today's puzzle not started; null when nothing is approved for today (as todaysState).
export async function guestTodaysState(db: Db, tokenHash: string | null): Promise<RunState | null> {
  const run = tokenHash === null ? null : await todaysRun(db, tokenHash);
  if (run) return stateOf(db, tokenHash, run.date, run.puzzle);
  const today = await todaysPuzzle(db);
  return today && stateOf(db, null, today.date, today.puzzle);
}

// Starts a run, or returns today's run of this token, open or over: one play a day per browser session (M19 answer 2). Every
// start first deletes the guest runs of days that have closed: nothing is scheduled, and a run left at a reveal never ends
// by itself (Design, "When a guest run ends").
export async function startGuestRun(db: Db, tokenHash: string): Promise<RunState> {
  await db.query("select private.purge_guest_days()");
  const open = await guestTodaysState(db, tokenHash);
  if (open && open.status !== "not_started") return open;
  try {
    await db.query(
      `insert into private.guest_run (token_hash, game_id, puzzle_date) values ($1, $2, private.today())
       on conflict do nothing`,
      [tokenHash, GAME_ID],
    );
  } catch (err) {
    // The foreign key to private.puzzle: nothing is published for today.
    if (err instanceof DatabaseError && err.code === "23503" && err.constraint === "guest_run_game_id_puzzle_date_fkey") {
      throw new AppError("no_puzzle_today", 404);
    }
    throw err;
  }
  const state = await guestTodaysState(db, tokenHash);
  if (!state) throw new AppError("no_puzzle_today", 404);
  return state;
}

// Answers one question of the guest's run, as runs.ts's answer does for a player. No run today is 409 run_over: its day
// closed. A retry after the end meets the database's rules, as a player's does.
export async function answerGuest(db: Db, tokenHash: string, index: number, typed: string): Promise<{ run: RunState; notInList: boolean }> {
  const found = await todaysRun(db, tokenHash);
  if (!found) throw new AppError("run_over", 409);
  const { date, puzzle } = found;
  if (index >= puzzle.questions.length) throw new AppError("bad_request", 400, "no such question");

  const { rows: current } = await db.query<{ status: RunStatus; answered: number; started: boolean }>(
    `select status, answered, deadline is not null as started
     from private.guest_run_status where token_hash = $1 and game_id = $2 and puzzle_date = $3::date`,
    [tokenHash, GAME_ID, date],
  );
  // The purge can take the run between the two reads, at the day's close.
  if (current.length === 0) throw new AppError("run_over", 409);
  const isCurrent = current[0].status === "in_progress" && current[0].answered === index;
  // As a signed-in answer: no answer before Next, and a stolen letter only counts on the question in play, so a client
  // can't probe the letters or the list of a question it hasn't reached.
  if (isCurrent && !current[0].started) throw new AppError("not_open", 409);
  const stolen = isCurrent ? stolenLetters(puzzle, index) : [];
  if (!avoids(typed, stolen)) throw new AppError("stolen_letter", 400);
  assertTypedLength(typed);
  const resolved = await resolveTyped(dayLookup(db, puzzle), puzzle, index, typed, stolen);
  if (!resolved) {
    // A free retry on the question in play; a run whose time ran out shows its ending; anything else isn't a question to retry.
    if (isCurrent) return { run: await stateOf(db, tokenHash, date, puzzle), notInList: true };
    const run = await stateOf(db, tokenHash, date, puzzle);
    if (run.status === "timed_out") return { run, notInList: false };
    throw new AppError("not_current_question", 409);
  }
  const entryId = resolved.thingId;
  // A retry reads the stored answer first: the database's order rule would refuse the second insert (OB002) before
  // `on conflict` could skip it, and the tally must not count it twice (ROADMAP, Next revision, 18b).
  if (await settledAnswer(db, tokenHash, date, index, entryId)) return { run: await stateOf(db, tokenHash, date, puzzle), notInList: false };

  try {
    await db.query(
      `insert into private.guest_run_event (token_hash, game_id, puzzle_date, question_idx, entry_id, matched)
       values ($1, $2, $3::date, $4, $5, $6)`,
      [tokenHash, GAME_ID, date, index, entryId, resolved.caught],
    );
  } catch (err) {
    if (!(err instanceof DatabaseError)) throw err;
    if (err.code === TIME_UP) return { run: await stateOf(db, tokenHash, date, puzzle), notInList: false };
    if (err.code === NOT_OPEN) throw new AppError("not_open", 409);
    // The purge took the run between our read and our insert, at the day's close: its rows, and the foreign key, are gone.
    if (err.code === "23503") throw new AppError("run_over", 409);
    if (err.code === OUT_OF_ORDER || err.code === RUN_OVER) {
      if (await settledAnswer(db, tokenHash, date, index, entryId)) return { run: await stateOf(db, tokenHash, date, puzzle), notInList: false };
      throw new AppError(err.code === RUN_OVER ? "run_over" : "out_of_order", 409);
    }
    throw err;
  }
  return { run: await stateOf(db, tokenHash, date, puzzle), notInList: false };
}

// "Next" after a reveal, as openNext: opens the question after the last answer, and tapping twice returns the same state.
export async function openNextGuest(db: Db, tokenHash: string): Promise<RunState> {
  const { rows } = await db.query<{ date: string; answered: number; content: ApprovedPuzzle }>(
    `select s.puzzle_date::text as date, s.answered, p.content
     from private.guest_run_status s join private.puzzle p on p.game_id = s.game_id and p.puzzle_date = s.puzzle_date
     where s.token_hash = $1 and s.game_id = $2 and s.puzzle_date = private.today()`,
    [tokenHash, GAME_ID],
  );
  if (rows.length === 0) throw new AppError("run_over", 409);
  const { date, answered, content: puzzle } = rows[0];
  try {
    await db.query(
      `insert into private.guest_question_open (token_hash, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, $4)
       on conflict (token_hash, game_id, puzzle_date, question_idx) do nothing`,
      [tokenHash, GAME_ID, date, answered],
    );
  } catch (err) {
    if (!(err instanceof DatabaseError)) throw err;
    if (err.code === RUN_OVER || err.code === "23503") throw new AppError("run_over", 409);
    // question_idx must be over 0: Start opens question 1, so Next before the first answer has nothing to open.
    if (err.code === "23514" && err.constraint === "guest_question_open_question_idx_check") throw new AppError("no_reveal", 409);
    throw err;
  }
  return stateOf(db, tokenHash, date, puzzle);
}

// True if this index already holds this entry; 409 if it holds another; false if it is unanswered.
async function settledAnswer(db: Db, tokenHash: string, date: string, index: number, entryId: string): Promise<boolean> {
  const stored = (await events(db, tokenHash, date)).find((e) => e.question_idx === index);
  if (!stored) return false;
  if (stored.entry_id !== entryId) throw new AppError("already_answered", 409);
  return true;
}
