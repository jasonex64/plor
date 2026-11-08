// What a game 2 run looks like to a player (docs/milestones/M16-16d-playing-it.md). No server imports, as the screen is
// client code. A round's letters are here only once it's open, and examples only once the run has ended.
import type { RunScore } from "./substring-scoring";

// points: the word's, and bonus: the bonus letter's, both 0 for a missed round (M16 16e).
export type PlayedRound = { letters: string; word: string | null; points: number; bonus: number; examples: string[] };
export type OpenRound = { index: number; letters: string; msLeft: number };
export type SubstringRun = {
  date: string;
  status: "not_started" | "in_progress" | "finished";
  total: number;
  bonusLetter: string | null;
  // The rounds done, in order.
  rounds: PlayedRound[];
  // The round with its clock going; null between rounds, where Next opens the next.
  open: OpenRound | null;
  // The score so far, its different letters cashed in at the end (M16 16e); null before the start.
  score: RunScore | null;
  // Where a finished run stands so far today (16e-2); null until it's finished.
  standing: Standing | null;
};

// percent: better than this share of today's other finished players, null under the day's minimum; friends: the
// player's rank among themselves and their friends who've finished, null until a friend has.
export type Standing = { percent: number | null; friends: { rank: number; of: number } | null };

export type TryOutcome = "accepted" | "empty" | "locked" | "not_a_word" | "needs_letters" | "already_used" | "already_answered" | "time_up";
