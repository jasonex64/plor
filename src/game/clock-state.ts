// The state of a run on a clock, as a signed-in player or a guest is given it (docs/milestones/M23-23c-the-run-on-a-clock.md,
// Design, "The state the server returns"). Pure: the database's reads come in as arguments, so one builder serves
// both (src/game/clock-play.ts reads them). While the run is live it holds only the open question's prompt and the
// answers the player has given; the day's other answers appear once the run is over, as `missed`.
import { createHash } from "node:crypto";
import { CLOCK_FORMAT, tierOf, type ClockPuzzle, type Tier } from "@/content/puzzle";
import { MISSED_PER_TIER } from "@/config/tunables";
import { named, type Named, type Names } from "./payload";
import type { RunStatus } from "./status";

export type ClockStatus = "not_started" | "in_progress" | "over";
export type ClockAnswer = { index: number; answer: Named; tier: Tier; addedMs: number; points: number };
// The answers a player did not give that the result shows for a question (docs/milestones/M23-23d-the-screens.md, answers 45,
// 48 and 49): up to three common, three uncommon and three rare, in that order, the same for every player on a day but for
// the ones this player gave. `more` counts the rest of the question's list.
export type MissedQuestion = { index: number; prompt: string; answers: (Named & { tier: Tier })[]; more: number };

export type ClockState = {
  format: typeof CLOCK_FORMAT;
  date: string;
  status: ClockStatus;
  total: number;
  // The open question, otherwise null (never a later one).
  question: { index: number; prompt: string } | null;
  // Milliseconds left on the run's clock, measured by the database when this state was read; null unless in progress.
  msLeft: number | null;
  // Each accepted answer, in the order it was given.
  answers: ClockAnswer[];
  points: number;
  // Milliseconds until the next reset at midnight Pacific, for the countdown.
  msToReset: number;
  // The run's day is over: what it answers now counts for nothing on the boards.
  dayOver: boolean;
  // Null while the run is not over.
  missed: MissedQuestion[] | null;
};

// What the database holds of a run's answer (private.clock_answer), in the order given.
export type StoredClockAnswer = { question_idx: number; entry_id: string; tier: Tier; added_ms: number; points: number };

// answered: the open question's index while the run is in progress (private.run_status); null with no run.
export type ClockRead = { status: RunStatus | null; answered: number | null; msLeft: number | null; msToReset: number; dayOver: boolean };

const statusOf = (status: RunStatus | null): ClockStatus => (status === null ? "not_started" : status === "in_progress" ? "in_progress" : "over");

// The things whose names the state needs: the answers given, and once the run is over the ones the result shows as missed.
export function clockNameIds(date: string, puzzle: ClockPuzzle, stored: StoredClockAnswer[], status: RunStatus | null): string[] {
  const given = stored.map((a) => a.entry_id);
  return statusOf(status) === "over" ? [...given, ...puzzle.questions.flatMap((q, index) => missedIds(date, q, index, stored).shown)] : given;
}

export function buildClockState(date: string, puzzle: ClockPuzzle, stored: StoredClockAnswer[], read: ClockRead, names: Names): ClockState {
  const status = statusOf(read.status);
  const answers = stored.map((a) => ({
    index: a.question_idx,
    answer: named(names, a.entry_id),
    tier: a.tier,
    addedMs: a.added_ms,
    points: a.points,
  }));
  const question = status === "in_progress" ? { index: read.answered!, prompt: puzzle.questions[read.answered!].prompt } : null;
  return {
    format: CLOCK_FORMAT,
    date,
    status,
    total: puzzle.questions.length,
    question,
    msLeft: status === "in_progress" ? read.msLeft : null,
    answers,
    points: answers.reduce((sum, a) => sum + a.points, 0),
    msToReset: read.msToReset,
    dayOver: read.dayOver,
    missed: status === "over" ? missed(date, puzzle, stored, names) : null,
  };
}

// Fixed by the day and the question, the same for every player: the ids sorted by a hash of the day, the question's number and
// the id, so the order is not alphabetical and no one can read it as a ranking.
export function missedOrder(date: string, index: number, ids: string[]): string[] {
  const key = (id: string) => createHash("sha256").update(`${date}:${index}:${id}`).digest("hex");
  return ids.map((id) => ({ id, key: key(id) })).sort((a, b) => a.key.localeCompare(b.key)).map((x) => x.id);
}

// The ids a question's result shows as missed, with the tier of each: the first MISSED_PER_TIER common and uncommon answers in
// the day's order that the player did not give, then the first rare ones of the day's own list (`rare`) they did not give.
function missedIds(date: string, q: ClockPuzzle["questions"][number], index: number, stored: StoredClockAnswer[]) {
  const given = new Set(stored.filter((a) => a.question_idx === index).map((a) => a.entry_id));
  const levelled = missedOrder(date, index, Object.keys(q.levels)).filter((id) => !given.has(id));
  const first = (ids: string[]) => ids.slice(0, MISSED_PER_TIER);
  const common = first(levelled.filter((id) => tierOf(q.levels, id) === "common"));
  const uncommon = first(levelled.filter((id) => tierOf(q.levels, id) === "uncommon"));
  const rare = first(q.rare.filter((id) => !given.has(id)));
  return { common, uncommon, rare, shown: [...common, ...uncommon, ...rare], given: given.size };
}

function missed(date: string, puzzle: ClockPuzzle, stored: StoredClockAnswer[], names: Names): MissedQuestion[] {
  return puzzle.questions.map((q, index) => {
    const { common, uncommon, rare, shown, given } = missedIds(date, q, index, stored);
    const tiered = (ids: string[], tier: Tier) => ids.map((id) => ({ ...named(names, id), tier }));
    return { index, prompt: q.prompt, answers: [...tiered(common, "common"), ...tiered(uncommon, "uncommon"), ...tiered(rare, "rare")], more: q.size - given - shown.length };
  });
}
