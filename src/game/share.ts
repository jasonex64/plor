// The spoiler-free share text for a finished run (docs/milestones/M05-share.md): the day and the rounds survived,
// never a prompt or an answer. No points and no "how it ended": points follow from the rounds, so the rounds are
// enough (S1, human, 2026-10-21). The day is the date only; a day number waits for the closed beta's first day (S2).
import type { RunState } from "./runs";
import type { SubstringRun } from "./substring-state";
import { GAME, SUBSTRINGS } from "@/platform/game";

// Placeholders until the look is settled (S1, human, 2026-10-21: "can use placeholder symbols for now").
const SURVIVED = "🟩";
const NOT_SURVIVED = "⬜";

// How many questions the run survived, for the share text and the result screen (M05 review: one count for both).
export function survivedCount(run: RunState): number {
  return run.answered.filter((a) => !a.matched).length;
}

// The run's date is the Pacific day as text ("2026-10-21"); read in UTC so the label can't shift by a day.
const shareDay = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function shareText(run: RunState): string {
  const survived = survivedCount(run);
  const day = shareDay(run.date);
  const rounds = SURVIVED.repeat(survived) + NOT_SURVIVED.repeat(run.total - survived);
  return `${GAME.name} · ${day}\n${rounds} ${survived}/${run.total}`;
}

// Fragments' share (docs/milestones/M16-16f-the-shared-pieces.md, 16f-3; human, 2026-11-13, answer 34: "Score and round
// marks"): as Offbeat's, with one mark per round, found or missed, and the score where Offbeat's count of rounds is. A
// finished run has played all its rounds. No word, letters or examples.
export function substringShareText(run: SubstringRun): string {
  const rounds = run.rounds.map((round) => (round.word === null ? NOT_SURVIVED : SURVIVED)).join("");
  return `${SUBSTRINGS.name} · ${shareDay(run.date)}\n${rounds} ${run.score!.total}`;
}
