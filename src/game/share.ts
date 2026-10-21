// The spoiler-free share text for a finished run (docs/milestones/M05-share.md): the day and the rounds survived,
// never a prompt or an answer. No points and no "how it ended": points follow from the rounds, so the rounds are
// enough (S1, human, 2026-10-21). The day is the date only; a day number waits for the closed beta's first day (S2).
import type { RunState } from "./runs";

// Placeholders until the look is settled (S1, human, 2026-10-21: "can use placeholder symbols for now").
const SURVIVED = "🟩";
const NOT_SURVIVED = "⬜";

export function shareText(run: RunState): string {
  const survived = run.answered.filter((a) => !a.matched).length;
  // The run's date is the Pacific day as text ("2026-10-21"); read in UTC so the label can't shift by a day.
  const day = new Date(`${run.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const rounds = SURVIVED.repeat(survived) + NOT_SURVIVED.repeat(run.total - survived);
  return `Offbeat · ${day}\n${rounds} ${survived}/${run.total}`;
}
