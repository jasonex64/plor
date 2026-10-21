// Typed answers and the host (DECISIONS.md: Answer model). Pure: the content decides. The player types free text
// and the server alone turns it into an entry; the only runtime rule is the deterministic one-typo auto-correct
// (human, 2026-10-21; docs/milestones/M04-game-mechanics.md, "Rules to build", rule 2).
import { avoids, normalize, type Question } from "../content/puzzle.ts";
import { TYPO_MAX_EDITS, TYPO_MIN_LETTERS } from "../config/tunables.ts";

export type MatchResult = "matched" | "not_matched";

export function matchAnswer(question: Question, entryId: string): MatchResult {
  for (const host of question.host_answers) {
    // A host answer always matches itself; its group lists only the other entries it covers. Most questions
    // have no group for a host answer, which is the format's "no other entries" (human, 2026-10-18).
    if (entryId === host || (question.match_groups[host] ?? []).includes(entryId)) return "matched";
  }
  return "not_matched";
}

// Optimal string alignment distance (a letter missing, extra or wrong, or two neighbours swapped), stopping early
// once it is certain to exceed `max`.
export function editDistanceAtMost(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  const rows: number[][] = [Array.from({ length: b.length + 1 }, (_, j) => j)];
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(rows[i - 1][j] + 1, row[j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) best = Math.min(best, rows[i - 2][j - 2] + 1);
      row.push(best);
    }
    if (Math.min(...row) > max) return false;
    rows.push(row);
  }
  return rows[a.length][b.length] <= max;
}

// The entry the typed text names, or null when it names none ("not in our list, try again"). The caller has
// already refused text with a stolen letter. An exact name or alias wins before any typo, so "moose" is never read
// as a typo of "mouse"; the validator guarantees no two entries share a normalized name. A typo counts only for
// text of 4+ letters (spaces aren't letters, M02 2f B4), only onto a name that avoids every stolen letter (G12:
// "hors" is not horse once E is gone), and only when exactly one entry is that close: when two are, the server
// would be guessing which one the player meant.
export function resolveTyped(question: Question, typed: string, stolen: string[]): string | null {
  const query = normalize(typed);
  if (!query) return null;
  const texts = (names: string[]) => names.map(normalize);
  const exact = question.entries.find((e) => texts([e.name, ...e.aliases]).includes(query));
  if (exact) return exact.id;
  if (query.replaceAll(" ", "").length < TYPO_MIN_LETTERS) return null;
  const near = question.entries.filter((e) =>
    texts([e.name, ...e.aliases]).some((t) => avoids(t, stolen) && editDistanceAtMost(query, t, TYPO_MAX_EDITS)),
  );
  return near.length === 1 ? near[0].id : null;
}
