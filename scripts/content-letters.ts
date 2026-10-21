// Picks the letters the Wind steals for each day that has none yet: `npm run content:letters [-- <root>]` (default
// `content`). A stand-in until the daily letter picker exists, which waits for the answer database (human,
// 2026-10-21; M04 "Rules to build", rule 6: "Claude picks them for the test days and the human reviews them").
// It follows schedule A (src/config/tunables.ts) and keeps only choices the validator accepts (checkStolenLetters):
// every host answer stays typeable and every question keeps a safe answer. The order it tries each tier's letters in
// depends on the date, so days differ; the result is deterministic, printed, and reviewed in the git diff.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { checkStolenLetters, parsePuzzle, type Puzzle } from "../src/content/puzzle.ts";
import { LETTER_SCHEDULE, LETTER_TIERS } from "../src/config/tunables.ts";
import { listPuzzleFiles } from "./content-validate.ts";

// A small stable hash of the date, so the letter order differs from day to day but not from run to run.
function seed(text: string): number {
  return [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}

// Fills "steals" on the scheduled questions, trying letters depth first, or returns null when no choice passes.
export function pickLetters(puzzle: Puzzle): Puzzle | null {
  const slots = LETTER_SCHEDULE.flatMap((tier, i) => (tier ? [{ i, letters: LETTER_TIERS[tier] }] : []));
  const base = seed(puzzle.date);
  function search(n: number, chosen: string[]): string[] | null {
    if (n === slots.length) return chosen;
    const { letters } = slots[n];
    const start = (base + n) % letters.length;
    for (let k = 0; k < letters.length; k++) {
      const letter = letters[(start + k) % letters.length];
      if (chosen.includes(letter)) continue;
      const next = [...chosen, letter];
      // Check the questions whose letters are all known now: those before the next scheduled theft.
      const trial = withLetters(puzzle, slots.slice(0, n + 1).map((s, j) => ({ i: s.i, letter: next[j] })));
      const upTo = n + 1 < slots.length ? slots[n + 1].i : trial.questions.length;
      if (checkStolenLetters("", { ...trial, questions: trial.questions.slice(0, upTo) }).length) continue;
      const done = search(n + 1, next);
      if (done) return done;
    }
    return null;
  }
  const letters = search(0, []);
  return letters ? withLetters(puzzle, slots.map((s, j) => ({ i: s.i, letter: letters[j] }))) : null;
}

function withLetters(puzzle: Puzzle, picks: { i: number; letter: string }[]): Puzzle {
  return {
    ...puzzle,
    questions: puzzle.questions.map((q, i) => {
      const pick = picks.find((p) => p.i === i);
      return pick ? { ...q, steals: pick.letter } : q;
    }),
  };
}

// Returns one line per day that got letters. Throws on a file whose shape is invalid, or a day no letters fit.
export function addLetters(root: string): string[] {
  const lines: string[] = [];
  for (const file of listPuzzleFiles(root)) {
    const path = join(root, file);
    const { puzzle, errors } = parsePuzzle(file, readFileSync(path, "utf8"));
    if (!puzzle) throw new Error(`cannot pick letters for an invalid file:\n${errors.join("\n")}`);
    if (puzzle.questions.some((q) => q.steals)) continue;
    const picked = pickLetters(puzzle);
    if (!picked) throw new Error(`${file}: no letters from schedule A keep every host answer typeable and a safe answer left`);
    writeFileSync(path, JSON.stringify(picked, null, 2) + "\n");
    lines.push(`${file}: ${picked.questions.map((q, i) => (q.steals ? `q${i + 1} ${q.steals.toUpperCase()}` : null)).filter(Boolean).join(", ")}`);
  }
  return lines;
}

function main() {
  const root = process.argv[2] ?? "content";
  const lines = addLetters(root);
  for (const line of lines) console.log(line);
  console.log(`LETTERS ${root}: ${lines.length} days given letters. Review them in the diff.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
