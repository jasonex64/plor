// What the answer box offers as the player types. Only suggestions: the player still taps an entry, and the server
// still receives an exact entry ID (DECISIONS.md: Answer model). Every comparison uses the normalization the
// content was authored with.
import { normalize } from "@/content/puzzle";
import { SUGGEST_MAX_TYPOS, SUGGEST_MIN_LETTERS_FOR_TYPOS } from "@/config/tunables";
import type { PublicEntry } from "./payload";

export type Suggestions = {
  // Entries with a word that starts with the typed text.
  matches: PublicEntry[];
  // "Did you mean": entries a typo away, when nothing starts with the typed text.
  typos: PublicEntry[];
  // The entry the typed text names exactly, if any (Enter picks it).
  exact: PublicEntry | null;
};

function texts(entry: PublicEntry): string[] {
  return [entry.name, ...entry.aliases].map(normalize);
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

export function suggest(entries: PublicEntry[], typed: string): Suggestions {
  const query = normalize(typed);
  if (!query) return { matches: [], typos: [], exact: null };
  const matches = entries.filter((e) => texts(e).some((t) => t.startsWith(query) || t.includes(` ${query}`)));
  const exact = entries.find((e) => texts(e).includes(query)) ?? null;
  // Typos only when nothing starts with the text, and only for longer text: one change to a short word lands on
  // many other words (human, 2026-10-19; src/config/tunables.ts).
  const typos =
    matches.length === 0 && query.length >= SUGGEST_MIN_LETTERS_FOR_TYPOS
      ? entries.filter((e) => texts(e).some((t) => editDistanceAtMost(query, t, SUGGEST_MAX_TYPOS)))
      : [];
  return { matches, typos, exact };
}
