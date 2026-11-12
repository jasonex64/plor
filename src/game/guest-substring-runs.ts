// A guest's game 2 run (docs/milestones/M18-guest-play.md, Design). The same rules as a signed-in run (substring-runs.ts: the
// database judges every try and decides every clock), held on the guest tables by the hash of the guest's token and judged by
// private.guest_judge_word and private.guest_round_examples. A run's rows go when it ends (end_guest_run), so what a retry
// finds after the end is no run: 409 run_over. Game 2 keeps no rarity count (Design, "Game 2 has no rarity count"), so
// nothing of a guest's words outlives the run.
import { DatabaseError } from "pg";
import type { SubstringDay } from "@/content/substrings";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { SUBSTRINGS_ID } from "@/platform/game";
import { guestStandingToday } from "./substring-places";
import { buildRun, ROUND_RUNNING, OUT_OF_ORDER, RUN_OVER, todaysDay, type PlayedWord } from "./substring-runs";
import type { SubstringRun, TryOutcome } from "./substring-state";
import { cleanedTry, plainText, tryKey } from "./substring-try";

// The state of the token's run on a date, as substring-runs.ts's stateOf builds it. A run that is over is read once and then
// ended: its result is in this return and its rows are gone. The status, the words and the examples are one statement, so one
// snapshot: another request's end_guest_run can't delete the words between two reads of a finished run (as guest-runs.ts's
// stateOf). A null hash is a visitor with no run.
async function stateOf(db: Db, tokenHash: string | null, date: string, day: SubstringDay): Promise<SubstringRun> {
  const { rows } = await db.query<{ status: string | null; answered: number | null; ms_left: number | null; words: PlayedWord[]; examples: { round_idx: number; words: string[] }[] }>(
    `select s.status, s.answered,
            case when s.deadline is null then null
                 else greatest(0, floor(extract(epoch from s.deadline - statement_timestamp()) * 1000))::int end as ms_left,
            coalesce((select json_agg(json_build_object('round_idx', w.round_idx, 'word_key', w.word_key, 'word', w.word))
                      from private.guest_round_word w
                      where s.status is not null and w.token_hash = $1 and w.game_id = $2 and w.puzzle_date = $3::date), '[]'::json) as words,
            coalesce((select json_agg(json_build_object('round_idx', x.round_idx, 'words', x.words))
                      from private.guest_round_examples($1, $3::date) x where s.status = 'survived'), '[]'::json) as examples
     from (select 1) as one
     left join private.guest_run_status s on s.token_hash = $1 and s.game_id = $2 and s.puzzle_date = $3::date`,
    [tokenHash, SUBSTRINGS_ID, date],
  );
  const { status, answered, ms_left: msLeft, words, examples } = rows[0];
  if (status === null) return buildRun(date, day, null, [], [], null);
  const run = buildRun(date, day, { status, answered: answered!, msLeft }, words, examples, null);
  if (run.status === "finished") {
    run.standing = await guestStandingToday(db, date, run.score!.total);
    await db.query("select private.end_guest_run($1, $2)", [tokenHash, SUBSTRINGS_ID]);
  }
  return run;
}

// The guest's run, or today's game 2 not started; null when nothing is approved for today.
export async function guestSubstringState(db: Db, tokenHash: string | null): Promise<SubstringRun | null> {
  const today = await todaysDay(db);
  return today && stateOf(db, tokenHash, today.date, today.day);
}

// Starts a run, or returns the one that is open. Every start first deletes the guest runs of days that have closed, as
// startGuestRun does for game 1. A run of this token that is over is ended by reading it, so a replay is a new run.
export async function startGuestSubstringRun(db: Db, tokenHash: string): Promise<SubstringRun> {
  await db.query("select private.purge_guest_days()");
  const today = await todaysDay(db);
  if (!today) throw new AppError("no_puzzle_today", 404);
  const open = await stateOf(db, tokenHash, today.date, today.day);
  if (open.status === "in_progress") return open;
  await db.query(
    `insert into private.guest_run (token_hash, game_id, puzzle_date) values ($1, $2, $3::date)
     on conflict do nothing`,
    [tokenHash, SUBSTRINGS_ID, today.date],
  );
  return stateOf(db, tokenHash, today.date, today.day);
}

// One try at the open round. No run is 409 run_over: it ended, or its day closed, and a retried final try lands here.
export async function tryGuestWord(db: Db, tokenHash: string, typed: string): Promise<{ outcome: TryOutcome; word?: string; run: SubstringRun }> {
  const today = await todaysDay(db);
  if (!today) throw new AppError("no_puzzle_today", 404);
  const clean = cleanedTry(typed);
  const { rows } = await db.query<{ result: { outcome: TryOutcome | "no_run"; word?: string } }>(
    "select private.guest_judge_word($1, $2::date, $3, $4, $5) as result",
    [tokenHash, today.date, tryKey(typed), clean, plainText(clean)],
  );
  const { outcome, word } = rows[0].result;
  if (outcome === "no_run") throw new AppError("run_over", 409);
  return { outcome, word, run: await stateOf(db, tokenHash, today.date, today.day) };
}

// Opens the next round. A second tap returns the same state; the database refuses it while a round's clock runs.
export async function nextGuestRound(db: Db, tokenHash: string): Promise<SubstringRun> {
  const today = await todaysDay(db);
  if (!today) throw new AppError("no_puzzle_today", 404);
  const { rows } = await db.query<{ answered: number }>(
    "select answered from private.guest_run_status where token_hash = $1 and game_id = $2 and puzzle_date = $3::date",
    [tokenHash, SUBSTRINGS_ID, today.date],
  );
  if (rows.length === 0) throw new AppError("run_over", 409);
  try {
    await db.query(
      `insert into private.guest_question_open (token_hash, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, $4)
       on conflict (token_hash, game_id, puzzle_date, question_idx) do nothing`,
      [tokenHash, SUBSTRINGS_ID, today.date, rows[0].answered],
    );
  } catch (err) {
    if (!(err instanceof DatabaseError)) throw err;
    // The run ended between our read and our insert: its rows, and the foreign key, are gone.
    if (err.code === RUN_OVER || err.code === "23503") throw new AppError("run_over", 409);
    if (err.code === ROUND_RUNNING || err.code === OUT_OF_ORDER) throw new AppError("round_running", 409);
    // question_idx must be over 0: round 1 opens with Start, so Next during it has nothing to open.
    if (err.code === "23514" && err.constraint === "guest_question_open_question_idx_check") throw new AppError("round_running", 409);
    throw err;
  }
  return stateOf(db, tokenHash, today.date, today.day);
}
