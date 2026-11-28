// The spoiler-free share text for a finished run (docs/milestones/M05-share.md): never a prompt or an answer. The day is the
// date only; a day number waits for the closed beta's first day (S2).
import type { SubstringRun } from "./substring-state";
import type { ClockState } from "./clock-state";
import { SHARE_SQUARES_PER_LINE } from "@/config/tunables";
import { GAME, SITE, SUBSTRINGS } from "@/platform/game";
import type { Tier } from "@/content/puzzle";

// Placeholders until the look is settled (S1, human, 2026-10-21: "can use placeholder symbols for now").
const SURVIVED = "🟩";
const NOT_SURVIVED = "⬜";

// The run's date is the Pacific day as text ("2026-10-21"); read in UTC so the label can't shift by a day.
const shareDay = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// Fragments' share (docs/milestones/M16-16f-the-shared-pieces.md, 16f-3; human, 2026-11-13, answer 34: "Score and round
// marks"): one mark per round, found or missed, and the score. A
// finished run has played all its rounds. No word, letters or examples.
export function substringShareText(run: SubstringRun): string {
  const rounds = run.rounds.map((round) => (round.word === null ? NOT_SURVIVED : SURVIVED)).join("");
  return `${SUBSTRINGS.name} · ${shareDay(run.date)}\n${rounds} ${run.score!.total}`;
}

// Offbeat's share (docs/milestones/M23-23d-the-screens.md, "The share text"; human, 2026-11-25, answers 43 and 46:
// "Score and squares", "Wrap every 10"): the site's and the game's name, the day and the points, then per question its number
// and one square per answer in the order given, coloured by tier, a line of SHARE_SQUARES_PER_LINE at most with the rest on
// lines indented under the number. A question with no answers keeps its line, its number alone. No answer's name. The link is not
// part of the text: ShareResult (src/app/share.tsx) adds the site's own after it, as for the other games.
const TIER_SQUARE: Record<Tier, string> = { common: "🟩", uncommon: "🟦", rare: "🟪" };

export function clockShareText(run: ClockState): string {
  const lines = Array.from({ length: run.total }, (_, index) => {
    const squares = run.answers.filter((a) => a.index === index).map((a) => TIER_SQUARE[a.tier]);
    const rows = Array.from({ length: Math.max(1, Math.ceil(squares.length / SHARE_SQUARES_PER_LINE)) }, (_, row) =>
      squares.slice(row * SHARE_SQUARES_PER_LINE, (row + 1) * SHARE_SQUARES_PER_LINE).join(""),
    );
    return rows.map((row, at) => `${at === 0 ? index + 1 : " "} ${row}`.trimEnd()).join("\n");
  });
  const points = run.points === 1 ? "1 point" : `${run.points} points`;
  return [`${SITE.name} ${GAME.name}, ${shareDay(run.date)}: ${points}`, ...lines].join("\n");
}
