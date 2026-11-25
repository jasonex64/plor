// The state of a run on a clock, as a signed-in player or a guest is given it (docs/milestones/M23-23c-the-run-on-a-clock.md,
// Design, "The state the server returns"). Pure: the database's reads come in as arguments, so one builder serves
// both (src/game/clock-play.ts reads them). While the run is live it holds only the open question's prompt and the
// answers the player has given; the day's other answers appear once the run is over, as `missed`.
import { CLOCK_FORMAT, tierOf, type ClockPuzzle, type Tier } from "@/content/puzzle";
import { named, type Named, type Names } from "./payload";
import type { RunStatus } from "./status";

export type ClockStatus = "not_started" | "in_progress" | "over";
export type ClockAnswer = { index: number; answer: Named; tier: Tier; addedMs: number; points: number };
// A levelled answer of the day (common or uncommon) that the player did not give. Rare answers are not listed: no
// granted function reads a category's members for a player, and the day holds only the levelled ones.
export type MissedQuestion = { index: number; prompt: string; answers: (Named & { tier: Tier })[] };

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

const RANK: Record<Tier, number> = { common: 0, uncommon: 1, rare: 2 };

const statusOf = (status: RunStatus | null): ClockStatus => (status === null ? "not_started" : status === "in_progress" ? "in_progress" : "over");

// The things whose names the state needs: the answers given, and once the run is over the day's levelled answers.
export function clockNameIds(puzzle: ClockPuzzle, stored: StoredClockAnswer[], status: RunStatus | null): string[] {
  const given = stored.map((a) => a.entry_id);
  return statusOf(status) === "over" ? [...given, ...puzzle.questions.flatMap((q) => Object.keys(q.levels))] : given;
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
    missed: status === "over" ? missed(puzzle, stored, names) : null,
  };
}

function missed(puzzle: ClockPuzzle, stored: StoredClockAnswer[], names: Names): MissedQuestion[] {
  return puzzle.questions.map((q, index) => {
    const given = new Set(stored.filter((a) => a.question_idx === index).map((a) => a.entry_id));
    const answers = Object.keys(q.levels)
      .filter((id) => !given.has(id))
      .map((id) => ({ ...named(names, id), tier: tierOf(q.levels, id) }))
      .sort((a, b) => RANK[a.tier] - RANK[b.tier] || a.name.localeCompare(b.name));
    return { index, prompt: q.prompt, answers };
  });
}
