// A game 2 run, as the routes see it (docs/milestones/M16-16d-playing-it.md; DECISIONS.md, Game 2). The database judges
// every try and decides every clock, and each function here takes the signed-in player's ID from its route, which is
// what keeps a player to their own run: the app's one database role can't tell players apart. A run belongs to its day,
// so one left unfinished at midnight stops there, and the next day starts fresh.
import { DatabaseError } from "pg";
import type { SubstringDay } from "@/content/substrings";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { SUBSTRINGS_ID } from "@/platform/game";
import type { PlayedRound, SubstringRun, TryOutcome } from "./substring-state";
import { cleanedTry, plainText, tryKey } from "./substring-try";

const OUT_OF_ORDER = "OB002";
const RUN_OVER = "OB003";
const ROUND_RUNNING = "OB014";

async function todaysDay(db: Db): Promise<{ date: string; day: SubstringDay } | null> {
  const { rows } = await db.query<{ date: string; content: SubstringDay | null }>(
    `select private.today()::text as date,
            (select content from private.puzzle where game_id = $1 and puzzle_date = private.today()) as content`,
    [SUBSTRINGS_ID],
  );
  const { date, content } = rows[0];
  return content ? { date, day: content } : null;
}

async function stateOf(db: Db, userId: string, date: string, day: SubstringDay): Promise<SubstringRun> {
  const total = day.rounds.length;
  const { rows } = await db.query<{ status: string; answered: number; ms_left: number | null }>(
    `select status, answered,
            case when deadline is null then null
                 else greatest(0, floor(extract(epoch from deadline - statement_timestamp()) * 1000))::int end as ms_left
     from private.run_status where user_id = $1 and game_id = $2 and puzzle_date = $3::date`,
    [userId, SUBSTRINGS_ID, date],
  );
  if (rows.length === 0) return { date, status: "not_started", total, bonusLetter: null, rounds: [], open: null };
  const { status, answered, ms_left: msLeft } = rows[0];
  const finished = status === "survived";
  const words = await db.query<{ round_idx: number; word: string }>(
    "select round_idx, word from private.round_word where user_id = $1 and game_id = $2 and puzzle_date = $3::date",
    [userId, SUBSTRINGS_ID, date],
  );
  const wordOf = new Map(words.rows.map((r) => [r.round_idx, r.word]));
  const examples = finished ? await db.query<{ round_idx: number; words: string[] }>("select round_idx, words from private.round_examples($1, $2::date)", [userId, date]) : null;
  const examplesOf = new Map(examples?.rows.map((r) => [r.round_idx, r.words]) ?? []);
  const rounds: PlayedRound[] = day.rounds.slice(0, answered).map((letters, i) => ({ letters, word: wordOf.get(i) ?? null, examples: examplesOf.get(i) ?? [] }));
  return {
    date,
    status: finished ? "finished" : "in_progress",
    total,
    bonusLetter: day.bonus_letter,
    rounds,
    open: msLeft === null ? null : { index: answered, letters: day.rounds[answered], msLeft },
  };
}

// null when nothing is approved for today.
export async function todaysRun(db: Db, userId: string): Promise<SubstringRun | null> {
  const today = await todaysDay(db);
  return today && stateOf(db, userId, today.date, today.day);
}

// Starting twice returns the same run.
export async function startSubstringRun(db: Db, userId: string): Promise<SubstringRun> {
  const today = await todaysDay(db);
  if (!today) throw new AppError("no_puzzle_today", 404);
  await db.query(
    `insert into private.run (user_id, game_id, puzzle_date) values ($1, $2, $3::date)
     on conflict (user_id, game_id, puzzle_date) do nothing`,
    [userId, SUBSTRINGS_ID, today.date],
  );
  return stateOf(db, userId, today.date, today.day);
}

export async function tryWord(db: Db, userId: string, typed: string): Promise<{ outcome: TryOutcome; word?: string; run: SubstringRun }> {
  const today = await todaysDay(db);
  if (!today) throw new AppError("no_puzzle_today", 404);
  const clean = cleanedTry(typed);
  const { rows } = await db.query<{ result: { outcome: TryOutcome | "no_run"; word?: string } }>(
    "select private.judge_word($1, $2::date, $3, $4, $5) as result",
    [userId, today.date, tryKey(typed), clean, plainText(clean)],
  );
  const { outcome, word } = rows[0].result;
  if (outcome === "no_run") throw new AppError("no_run", 404);
  return { outcome, word, run: await stateOf(db, userId, today.date, today.day) };
}

// Opens the next round. A second tap returns the same state; the database refuses it while a round's clock runs.
export async function nextRound(db: Db, userId: string): Promise<SubstringRun> {
  const today = await todaysDay(db);
  if (!today) throw new AppError("no_puzzle_today", 404);
  const { rows } = await db.query<{ answered: number }>(
    "select answered from private.run_status where user_id = $1 and game_id = $2 and puzzle_date = $3::date",
    [userId, SUBSTRINGS_ID, today.date],
  );
  if (rows.length === 0) throw new AppError("no_run", 404);
  try {
    await db.query(
      `insert into private.question_open (user_id, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, $4)
       on conflict (user_id, game_id, puzzle_date, question_idx) do nothing`,
      [userId, SUBSTRINGS_ID, today.date, rows[0].answered],
    );
  } catch (err) {
    if (!(err instanceof DatabaseError)) throw err;
    if (err.code === RUN_OVER) throw new AppError("run_over", 409);
    if (err.code === ROUND_RUNNING || err.code === OUT_OF_ORDER) throw new AppError("round_running", 409);
    // question_idx must be over 0: round 1 opens with Start, so Next during it has nothing to open.
    if (err.code === "23514" && err.constraint === "question_open_question_idx_check") throw new AppError("round_running", 409);
    throw err;
  }
  return stateOf(db, userId, today.date, today.day);
}
