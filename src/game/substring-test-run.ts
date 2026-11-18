// A test run of a game 2 day (docs/milestones/M15-15f-fragments-test-run.md, 15f-2): an admin plays any day, a draft too,
// and nothing is saved (the ticket's answer 3). The browser holds the run and sends all of it each time, as game 1's test
// run does (src/game/runs.ts, testRun): words, one for each round done, the text typed that was accepted or null for a
// round that timed out; open, whether the round after them has been opened with Start or Next; text, a new try at it,
// if any. The word list is read through private.judge_test_word alone, which writes nothing; the rest of the rules a real
// round holds a try to are here, from the moves: letters alone, the letters the round gives, not used earlier in the run,
// and the score. The clock is the browser's, as in game 1's test run; a test run has no lockout, as nothing is stored
// for it to count from.
import type { SubstringDay } from "@/content/substrings";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { buildRun, type PlayedWord } from "./substring-runs";
import type { SubstringRun, TryOutcome } from "./substring-state";
import { cleanedTry, plainText, tryKey } from "./substring-try";
import { STATUS } from "@/lib/status";

export type SubstringTestMoves = { words: (string | null)[]; open: boolean; text: string | null };

type WordList = { word: string | null; examples: string[][] };

async function wordList(db: Db, userId: string, typed: string | null, missed: string[]): Promise<WordList> {
  const clean = typed === null ? null : cleanedTry(typed);
  const { rows } = await db.query<{ list: WordList }>("select private.judge_test_word($1, $2, $3, $4, $5::text[]) as list", [
    userId,
    typed === null ? null : tryKey(typed),
    clean,
    clean === null ? null : plainText(clean),
    missed,
  ]);
  return rows[0].list;
}

// A try at a round, as private.judge_core judges it once the clock and the lockout are past: nothing typed, not a word,
// not holding the round's letters, used earlier, or accepted with the word as the game shows it.
async function judge(db: Db, userId: string, letters: string, used: Set<string>, typed: string): Promise<{ outcome: TryOutcome; key: string; word?: string }> {
  const key = tryKey(typed);
  if (key === "") return { outcome: "empty", key };
  const { word } = await wordList(db, userId, typed, []);
  if (word === null) return { outcome: "not_a_word", key };
  if (!key.includes(letters)) return { outcome: "needs_letters", key };
  if (used.has(key)) return { outcome: "already_used", key };
  return { outcome: "accepted", key, word };
}

export async function substringTestRun(db: Db, userId: string, day: SubstringDay, moves: SubstringTestMoves): Promise<{ run: SubstringRun; outcome?: TryOutcome; word?: string }> {
  const total = day.rounds.length;
  if (moves.words.length > total) throw new AppError("bad_request", STATUS.badRequest, "words");
  const played: PlayedWord[] = [];
  const used = new Set<string>();
  const take = (index: number, key: string, word: string) => {
    played.push({ round_idx: index, word_key: key, word });
    used.add(key);
  };
  // Every word again, as the real game's judge would have taken it, so a run that couldn't have happened is refused.
  for (const [index, typed] of moves.words.entries()) {
    if (typed === null) continue;
    const verdict = await judge(db, userId, day.rounds[index], used, typed);
    if (verdict.outcome !== "accepted") throw new AppError("bad_request", STATUS.badRequest, "words");
    take(index, verdict.key, verdict.word!);
  }
  let done = moves.words.length;
  let open = moves.open && done < total;
  let tried: { outcome: TryOutcome; word?: string } | undefined;
  if (moves.text !== null) {
    if (!open) throw new AppError("not_open", STATUS.conflict);
    const verdict = await judge(db, userId, day.rounds[done], used, moves.text);
    tried = { outcome: verdict.outcome, word: verdict.word };
    if (verdict.outcome === "accepted") {
      take(done, verdict.key, verdict.word!);
      done += 1;
      open = false;
    }
  }
  const finished = done === total;
  const missed = day.rounds.map((letters, index) => ({ letters, index })).filter(({ index }) => index < done && !played.some((p) => p.round_idx === index));
  // A missed round's examples come only once the run is over, as the real game's do.
  const examples = finished && missed.length ? (await wordList(db, userId, null, missed.map((m) => m.letters))).examples : [];
  // A round's 20 seconds from the database's own rule (private.question_deadline), as if opened now: the browser counts
  // them down, and keeps counting through a refused try.
  const { rows } = await db.query<{ ms_left: number }>(
    "select floor(extract(epoch from private.question_deadline(statement_timestamp()) - statement_timestamp()) * 1000)::int as ms_left",
  );
  const facts = done === 0 && !open ? null : { status: finished ? "survived" : "in_progress", answered: done, msLeft: open ? rows[0].ms_left : null };
  const run = buildRun(day.date, day, facts, played, examples.map((words, i) => ({ round_idx: missed[i].index, words })), null);
  return { run, ...tried };
}
