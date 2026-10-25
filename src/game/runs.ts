// Runs, answers and logged misses (docs/milestones/M00-data-design.md §5). The database enforces the rules
// (one run per day, order, the day boundary, append-only); this module asks it and shapes the responses.
// Dates are always read as text: "today" is decided by private.today() alone, never by TypeScript (§8).
import { DatabaseError } from "pg";
import { GAME_ID, avoids, normalize, stolenLetters, type ApprovedPuzzle } from "@/content/puzzle";
import type { Db } from "@/lib/db";
import { ANSWER_SHARE_MIN_PLAYERS, MISS_ACCEPT_MIN_PLAYERS, MISS_ACCEPT_SHARE_PERCENT, POINTS_PER_QUESTION } from "@/config/tunables";
import { AppError } from "@/lib/http";
import { isNearTypo, resolveTyped } from "./matching";
import { isListed } from "./misses";
import { dayCounts } from "./ledger";
import { hostAnswers, named, publicQuestion, thingNames, type Named, type Names, type PublicQuestion } from "./payload";
import { scoreRun, type DayCounts } from "./scoring";
import { getStreak } from "./streak";

// "timed_out": the current question's 20 seconds ran out, which ends the run (M04 13c-2; the database decides). The
// timer, not midnight, ends an unfinished run: a run started before midnight can be finished after it (human,
// 2026-10-21; its points count, but its answers after midnight earn no rarity bonus: M09 D1, D8).
export type RunStatus = "not_started" | "in_progress" | "died" | "survived" | "timed_out";

// points: what surviving this question earned, 0 when caught (DECISIONS.md, Game 1: POINTS_PER_QUESTION). bonus: its
// provisional rarity bonus, from the expectation alone; the final one comes once the day is over (M09). share: once the
// run is over, the fraction of the players who answered this question before the day's midnight who gave this answer,
// from the counts the bonus uses (docs/milestones/M11-home-screen.md, H5); null while the run goes on, or while fewer
// than ANSWER_SHARE_MIN_PLAYERS have answered it, so a share can't give away one player's answer.
export type AnsweredQuestion = {
  index: number;
  prompt: string;
  answer: Named;
  matched: boolean;
  hostAnswers: Named[];
  points: number;
  bonus: number;
  share: number | null;
};

export type RunState = {
  date: string;
  status: RunStatus;
  total: number;
  answered: AnsweredQuestion[];
  // The question in play, otherwise null (also while the reveal waits for Next).
  question: PublicQuestion | null;
  // Milliseconds left on that question's timer, measured by the database when this state was read; null when
  // there is no question. The client counts down from it, and the database stays the judge.
  msLeft: number | null;
  // While the reveal waits for Next (G5): the letter the Wind steals at the next question, or null for none.
  next: { steals: string | null } | null;
  // Points so far: the sum over answered questions, and the provisional rarity bonus so far (capped, M09).
  points: number;
  bonus: number;
  // Milliseconds until the next reset at midnight Pacific (private.next_reset), for the countdown.
  msToReset: number;
  // Days played in a row (src/game/streak.ts; M11 H4).
  streak: number;
};

// in_day: given before the run's day ended at midnight (M09 D8).
type StoredEvent = { question_idx: number; entry_id: string; matched: boolean; in_day: boolean };

// The SQLSTATEs raised by the answer and Next triggers (supabase/migrations/20261019074108_create_game_tables.sql, as
// changed by 20261021081057_question_timer.sql and 20261021084917_reveal_next_and_reset.sql).
const OUT_OF_ORDER = "OB002";
const RUN_OVER = "OB003";
const TIME_UP = "OB005";
const NOT_OPEN = "OB006";

// null when nothing is approved for today.
async function todaysPuzzle(db: Db): Promise<{ date: string; puzzle: ApprovedPuzzle } | null> {
  const { rows } = await db.query<{ date: string; content: ApprovedPuzzle | null }>(
    `select private.today()::text as date,
            (select content from private.puzzle where game_id = $1 and puzzle_date = private.today()) as content`,
    [GAME_ID],
  );
  const { date, content } = rows[0];
  return content ? { date, puzzle: content } : null;
}

async function events(db: Db, userId: string, date: string): Promise<StoredEvent[]> {
  const { rows } = await db.query<StoredEvent>(
    `select question_idx, entry_id, matched, private.day_of(created_at) = puzzle_date as in_day from private.run_event
     where user_id = $1 and game_id = $2 and puzzle_date = $3::date order by question_idx`,
    [userId, GAME_ID, date],
  );
  return rows;
}

type Clock = { status: RunStatus | null; msLeft: number | null; msToReset: number };

// The states of a run that's over, which open the day's thread and reactions (M08) and the shares (M11 H5).
export const FINISHED: RunStatus[] = ["died", "survived", "timed_out"];

// The share of the question's players who gave this entry, or null below the minimum (H5).
function shareOf(counts: DayCounts | null, index: number, entryId: string): number | null {
  const question = counts?.get(index);
  if (!question || question.answered < ANSWER_SHARE_MIN_PLAYERS) return null;
  return (question.byEntry.get(entryId) ?? 0) / question.answered;
}

// counts: the day's counts once the run is over, otherwise null. names: the main names of the answers and host answers.
function buildState(date: string, puzzle: ApprovedPuzzle, stored: StoredEvent[], clock: Clock, counts: DayCounts | null, streak: number, names: Names): RunState {
  const score = scoreRun(
    puzzle,
    stored.map((e) => ({ index: e.question_idx, entryId: e.entry_id, matched: e.matched, inDay: e.in_day })),
    null,
  );
  const answered = stored.map((e, i) => {
    const question = puzzle.questions[e.question_idx];
    return {
      index: e.question_idx,
      prompt: question.prompt,
      answer: named(names, e.entry_id),
      matched: e.matched,
      hostAnswers: hostAnswers(question, names),
      points: e.matched ? 0 : POINTS_PER_QUESTION[e.question_idx],
      bonus: score.bonuses[i],
      share: shareOf(counts, e.question_idx, e.entry_id),
    };
  });
  const status = clock.status ?? "not_started";
  // In progress with no deadline: the reveal is waiting for Next (the database gives no clock until it's tapped).
  const waiting = status === "in_progress" && clock.msLeft === null;
  const question = status === "in_progress" && !waiting ? publicQuestion(puzzle, stored.length) : null;
  return {
    date,
    status,
    total: puzzle.questions.length,
    answered,
    question,
    msLeft: question ? clock.msLeft : null,
    next: waiting ? { steals: puzzle.questions[stored.length].steals ?? null } : null,
    points: answered.reduce((sum, a) => sum + a.points, 0),
    bonus: score.bonus,
    msToReset: clock.msToReset,
    streak,
  };
}

// Milliseconds to the next reset, for a page with no run state of its own: a group's (M11 H6).
export async function msToReset(db: Db): Promise<number> {
  const { rows } = await db.query<{ ms: number }>(
    "select floor(extract(epoch from private.next_reset() - statement_timestamp()) * 1000)::int as ms",
  );
  return rows[0].ms;
}

async function stateOf(db: Db, userId: string, date: string, puzzle: ApprovedPuzzle): Promise<RunState> {
  // One statement, so the time left and the time to the reset are measured at the same instant.
  const { rows } = await db.query<{ status: RunStatus | null; ms_left: number | null; ms_to_reset: number }>(
    `select s.status,
            case when s.deadline is null then null
                 else greatest(0, floor(extract(epoch from s.deadline - statement_timestamp()) * 1000))::int end as ms_left,
            floor(extract(epoch from private.next_reset() - statement_timestamp()) * 1000)::int as ms_to_reset
     from (select 1) as one
     left join private.run_status s on s.user_id = $1 and s.game_id = $2 and s.puzzle_date = $3::date`,
    [userId, GAME_ID, date],
  );
  const { status, ms_left, ms_to_reset } = rows[0];
  const stored = status === null ? [] : await events(db, userId, date);
  const counts = status !== null && FINISHED.includes(status) ? (await dayCounts(db, [date])).get(date)! : null;
  const names = await thingNames(db, stored.flatMap((e) => [e.entry_id, ...puzzle.questions[e.question_idx].host_answers]));
  return buildState(date, puzzle, stored, { status, msLeft: ms_left, msToReset: ms_to_reset }, counts, await getStreak(db, userId), names);
}

// The player's run in progress, if any, otherwise today's puzzle. After midnight it can be yesterday's, waiting at a
// reveal or with a question in play: it's finished first, then today's puzzle shows (G13; human, 2026-10-21: "Resume
// yesterday's run"). null when there's neither: nothing is approved for today, an expected state the page shows as
// such (docs/milestones/M12-12f-review-fixes.md, F2).
export async function todaysState(db: Db, userId: string): Promise<RunState | null> {
  const { rows } = await db.query<{ date: string; content: ApprovedPuzzle }>(
    `select s.puzzle_date::text as date, p.content
     from private.run_status s join private.puzzle p on p.game_id = s.game_id and p.puzzle_date = s.puzzle_date
     where s.user_id = $1 and s.game_id = $2 and s.status = 'in_progress'
     order by s.puzzle_date desc limit 1`,
    [userId, GAME_ID],
  );
  if (rows.length) return stateOf(db, userId, rows[0].date, rows[0].content);
  const today = await todaysPuzzle(db);
  return today && stateOf(db, userId, today.date, today.puzzle);
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
  // Read back as "today" again: if midnight passed since the insert, the player sees the new day (not started), which
  // may have no puzzle.
  const state = await todaysState(db, userId);
  if (!state) throw new AppError("no_puzzle_today", 404);
  return state;
}

// Answers one question of the player's latest run with typed text, which the server turns into a thing of the
// question's category (matching.ts, resolveTyped). Text that names none is logged as a miss and costs nothing: the
// player tries again (human, 2026-10-21). A retry naming the same thing returns the stored result; a different one for
// an answered question is 409 already_answered (§5). After the question's 20 seconds the run_event trigger refuses
// the insert with time_up, and the run has ended.
export async function answer(db: Db, userId: string, index: number, typed: string): Promise<{ run: RunState; notInList: boolean }> {
  const { rows } = await db.query<{ date: string; content: ApprovedPuzzle }>(
    `select r.puzzle_date::text as date, p.content
     from private.run r join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
     where r.user_id = $1 and r.game_id = $2
     order by r.puzzle_date desc limit 1`,
    [userId, GAME_ID],
  );
  if (rows.length === 0) throw new AppError("no_run", 404);
  const { date, content: puzzle } = rows[0];
  if (index >= puzzle.questions.length) throw new AppError("bad_request", 400, "no such question");

  // A stolen letter can't be typed in the answer box (G11), so text with one comes from a bypassed client. Letters
  // count only on the question in play: checking another index would let a client probe the letters of questions
  // it hasn't reached, and a run that has ended answers with its own errors below.
  const { rows: current } = await db.query<{ status: RunStatus; answered: number; started: boolean }>(
    `select status, answered, deadline is not null as started
     from private.run_status where user_id = $1 and game_id = $2 and puzzle_date = $3::date`,
    [userId, GAME_ID, date],
  );
  const isCurrent = current[0]?.status === "in_progress" && current[0].answered === index;
  // At the reveal the next question isn't open yet: no answer and no miss before Next, so its list can't be probed
  // and no miss is logged for a question the player hasn't seen (13c-4 review). The trigger also refuses (OB006).
  if (isCurrent && !current[0].started) throw new AppError("not_open", 409);
  const stolen = isCurrent ? stolenLetters(puzzle, index) : [];
  if (!avoids(typed, stolen)) throw new AppError("stolen_letter", 400);
  const resolved = await resolveTyped(db, puzzle, index, typed, stolen);
  if (!resolved) {
    try {
      await logMiss(db, userId, puzzle, index, typed);
    } catch (err) {
      // logMiss only logs for a run in progress; one whose time ran out shows its ending instead of a 409.
      const run = await stateOf(db, userId, date, puzzle);
      if (err instanceof AppError && err.code === "not_current_question" && run.status === "timed_out") return { run, notInList: false };
      throw err;
    }
    return { run: await stateOf(db, userId, date, puzzle), notInList: true };
  }
  const entryId = resolved.thingId;
  const settled = await settledAnswer(db, userId, date, index, entryId);
  if (settled) return { run: await stateOf(db, userId, date, puzzle), notInList: false };

  try {
    await db.query(
      `insert into private.run_event (user_id, game_id, puzzle_date, question_idx, entry_id, matched)
       values ($1, $2, $3::date, $4, $5, $6)`,
      [userId, GAME_ID, date, index, entryId, resolved.caught],
    );
  } catch (err) {
    if (!(err instanceof DatabaseError)) throw err;
    // Too late for this question: the run has ended, and the state says so (rule 3; the trigger decides).
    if (err.code === TIME_UP) return { run: await stateOf(db, userId, date, puzzle), notInList: false };
    // The question hasn't been opened with Next: the client is behind, and a reload shows the reveal.
    if (err.code === NOT_OPEN) throw new AppError("not_open", 409);
    // A concurrent request may have answered this index between our read and our insert (ROADMAP: never 500).
    if (err.code === "23505" || err.code === OUT_OF_ORDER || err.code === RUN_OVER) {
      if (await settledAnswer(db, userId, date, index, entryId)) return { run: await stateOf(db, userId, date, puzzle), notInList: false };
      throw new AppError(err.code === RUN_OVER ? "run_over" : "out_of_order", 409);
    }
    throw err;
  }
  return { run: await stateOf(db, userId, date, puzzle), notInList: false };
}

// Opens the next question of the player's latest run when they tap Next after a reveal (G5). Tapping again returns
// the same state; the database refuses a run that has ended (run_over) and Next before the first answer.
export async function openNext(db: Db, userId: string): Promise<RunState> {
  const { rows } = await db.query<{ date: string; answered: number; content: ApprovedPuzzle }>(
    `select s.puzzle_date::text as date, s.answered, p.content
     from private.run_status s join private.puzzle p on p.game_id = s.game_id and p.puzzle_date = s.puzzle_date
     where s.user_id = $1 and s.game_id = $2
     order by s.puzzle_date desc limit 1`,
    [userId, GAME_ID],
  );
  if (rows.length === 0) throw new AppError("no_run", 404);
  const { date, answered, content: puzzle } = rows[0];
  try {
    await db.query(
      `insert into private.question_open (user_id, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, $4)
       on conflict (user_id, game_id, puzzle_date, question_idx) do nothing`,
      [userId, GAME_ID, date, answered],
    );
  } catch (err) {
    if (!(err instanceof DatabaseError)) throw err;
    if (err.code === RUN_OVER) throw new AppError("run_over", 409);
    // question_idx must be over 0: Start opens question 1, so Next before the first answer has nothing to open.
    if (err.code === "23514" && err.constraint === "question_open_question_idx_check") throw new AppError("no_reveal", 409);
    throw err;
  }
  return stateOf(db, userId, date, puzzle);
}

// True if this index already holds this entry; 409 if it holds another; false if it is unanswered.
async function settledAnswer(db: Db, userId: string, date: string, index: number, entryId: string): Promise<boolean> {
  const stored = (await events(db, userId, date)).find((e) => e.question_idx === index);
  if (!stored) return false;
  if (stored.entry_id !== entryId) throw new AppError("already_answered", 409);
  return true;
}

// Logs typed text that named no entry for the question the player is on, at no cost to the run (human, 2026-10-18),
// and lets private.record_miss learn from it once enough players typed it (M13 13b). The table's check allows 1 to 40
// characters; longer text is rejected and nothing is stored.
async function logMiss(db: Db, userId: string, puzzle: ApprovedPuzzle, index: number, typed: string): Promise<void> {
  const text = normalize(typed);
  let logged: boolean;
  try {
    ({
      rows: [{ logged }],
    } = await db.query<{ logged: boolean }>("select private.record_miss($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10) as logged", [
      userId,
      GAME_ID,
      puzzle.date,
      index,
      typed,
      text,
      await isNearTypo(db, puzzle, index, typed),
      isListed(text),
      MISS_ACCEPT_MIN_PLAYERS,
      MISS_ACCEPT_SHARE_PERCENT,
    ]));
  } catch (err) {
    if (err instanceof DatabaseError && err.code === "23514" && err.constraint === "missed_answer_typed_length") {
      throw new AppError("text_invalid", 400);
    }
    throw err;
  }
  if (!logged) throw new AppError("not_current_question", 409);
}
