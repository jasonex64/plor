// What a game 2 run looks like to a player (docs/milestones/M16-16d-playing-it.md). No server imports, as the screen is
// client code. A round's letters are here only once it's open, and examples only once the run has ended.
export type PlayedRound = { letters: string; word: string | null; examples: string[] };
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
};

export type TryOutcome = "accepted" | "empty" | "locked" | "not_a_word" | "needs_letters" | "already_used" | "already_answered" | "time_up";
