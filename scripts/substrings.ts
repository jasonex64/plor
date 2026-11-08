// Drafting game 2's days (docs/milestones/M16-16c-a-day-of-game-2.md): `npm run substrings -- draft <first date>
// [--not <set>,…] [--root <folder>]`. It reads the dictionary's snapshot and the days already drafted, needing no
// database; draws SUBSTRING_BATCH_DAYS days, each within its rounds' bands, floor and repeat gap, with no set inside
// another and a bonus letter none of them holds; writes each to content/substrings/<date>.json; and prints the table the
// PR carries, as the admin page has no word counts before 16d (answer 5). --not redraws around sets the human turned
// down. --root writes elsewhere, so a trial leaves no day in content/ (human: "App first, no publishing").
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { SUBSTRING_BATCH_DAYS, SUBSTRING_EVERYDAY_FLOOR, SUBSTRING_ROUNDS, SUBSTRING_SAMPLE_WORDS } from "../src/config/tunables.ts";
import { isCalendarDate } from "../src/content/puzzle.ts";
import { checkSubstringDay, checkSubstringsFile, setsNear, type SubstringDay } from "../src/content/substrings.ts";
import { isListedWord } from "../src/game/misses.ts";
import { SUBSTRINGS_ID } from "../src/platform/game.ts";
import { DICTIONARY_SET, readSnapshot } from "./base.ts";
import type { DictionaryEntry } from "./dictionary.ts";

export type SetStat = { words: number; everyday: number };
export type SetStats = Map<string, SetStat>;

const LENGTHS = [...new Set(SUBSTRING_ROUNDS.map((r) => r.letters))];
// Short forms of slurs that no offensive list holds as words (human, 2026-11-07: "Refuse those two (Recommended)").
const REFUSED_SETS = new Set(["abo", "nig"]);

// How many words hold each set, and how many of those are everyday. A key with two spellings is one word.
export function setStats(entries: DictionaryEntry[]): SetStats {
  const everyday = new Map<string, boolean>();
  for (const e of entries) everyday.set(e.key, (everyday.get(e.key) ?? false) || e.everyday === true);
  const stats: SetStats = new Map();
  for (const [key, common] of everyday) {
    const sets = new Set(LENGTHS.flatMap((n) => Array.from({ length: Math.max(key.length - n + 1, 0) }, (_, i) => key.slice(i, i + n))));
    for (const set of sets) {
      const stat = stats.get(set) ?? { words: 0, everyday: 0 };
      stat.words += 1;
      if (common) stat.everyday += 1;
      stats.set(set, stat);
    }
  }
  return stats;
}

// The sets a round may draw from, in code-point order so a draw can be repeated. A set that spells a listed word, or
// is refused by name, stays off the screen, whatever its counts.
export function eligibleSets(round: number, stats: SetStats): string[] {
  const { letters, atLeast, below } = SUBSTRING_ROUNDS[round];
  return [...stats.entries()]
    .filter(([set, s]) => set.length === letters && s.words >= atLeast && s.words < below && s.everyday >= SUBSTRING_EVERYDAY_FLOOR && !isListedWord(set) && !REFUSED_SETS.has(set))
    .map(([set]) => set)
    .sort();
}

// Each choice gets its own hash and the lowest wins, so taking a set away changes a draw only if that set had won: a
// veto leaves the other days as they were. Not src/content/bank.ts's `seed`, whose rolling sum moves by the same step
// from one date to the next, which would walk the days through the list in order.
function draw(label: string, from: string[]): string {
  const hash = (choice: string) => createHash("sha256").update(`${label} ${choice}`).digest("hex");
  return from.reduce((best, choice) => (hash(choice) < hash(best) ? choice : best));
}

export function pickDay(date: string, stats: SetStats, near: Set<string>, not: Set<string>): SubstringDay {
  const rounds: string[] = [];
  SUBSTRING_ROUNDS.forEach((_, i) => {
    const open = eligibleSets(i, stats).filter((set) => !near.has(set) && !not.has(set) && !rounds.some((r) => r.includes(set) || set.includes(r)));
    if (!open.length) throw new Error(`${date} round ${i + 1}: no set left under the rules`);
    rounds.push(draw(`${date} round ${i}`, open));
  });
  const used = new Set(rounds.join(""));
  const free = [..."abcdefghijklmnopqrstuvwxyz"].filter((c) => !used.has(c));
  return { format: 1, game_id: SUBSTRINGS_ID, date, rounds, bonus_letter: draw(`${date} bonus`, free) };
}

const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

// In date order, each day seeing the ones before it. Dates already drafted are replaced, so the batch's own old days
// don't count against it.
export function draftBatch(first: string, stats: SetStats, drafted: SubstringDay[], not: Set<string>): SubstringDay[] {
  const dates = Array.from({ length: SUBSTRING_BATCH_DAYS }, (_, i) => addDays(first, i));
  const others = drafted.filter((d) => !dates.includes(d.date));
  const out: SubstringDay[] = [];
  for (const date of dates) {
    const day = pickDay(date, stats, setsNear(date, [...others, ...out]), not);
    const problems = checkSubstringDay(date, day);
    if (problems.length) throw new Error(`the picker made a day its own validator refuses:\n${problems.join("\n")}`);
    out.push(day);
  }
  return out;
}

// The shortest everyday words holding a set, for the human's review.
export function samples(set: string, entries: DictionaryEntry[], count: number): string[] {
  const words = entries.filter((e) => e.everyday && e.key.includes(set)).map((e) => e.spelling);
  return [...new Set(words)].sort((a, b) => a.length - b.length || (a < b ? -1 : 1)).slice(0, count);
}

function readDays(root: string): SubstringDay[] {
  const dir = join(root, SUBSTRINGS_ID);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith(".json")).map((name) => {
    const text = readFileSync(join(dir, name), "utf8");
    const errors = checkSubstringsFile(`${SUBSTRINGS_ID}/${name}`, text);
    if (errors.length) throw new Error(errors.join("\n"));
    return JSON.parse(text) as SubstringDay;
  });
}

function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { not: { type: "string", default: "" }, root: { type: "string", default: "content" } } });
  const [command, first] = positionals;
  if (command !== "draft" || !isCalendarDate(first)) {
    console.error("usage: npm run substrings -- draft <first date> [--not <set>,…] [--root <folder>]");
    process.exit(2);
  }
  const { items } = readSnapshot<DictionaryEntry>(DICTIONARY_SET);
  const stats = setStats(items);
  const days = draftBatch(first, stats, readDays(values.root), new Set(values.not.split(",").filter(Boolean)));
  mkdirSync(join(values.root, SUBSTRINGS_ID), { recursive: true });
  for (const day of days) {
    writeFileSync(join(values.root, SUBSTRINGS_ID, `${day.date}.json`), `${JSON.stringify(day, null, 2)}\n`);
    console.log(`\n**${day.date}**, bonus letter \`${day.bonus_letter}\`\n\n| Round | Letters | Words | Everyday | Samples |\n|---|---|---|---|---|`);
    day.rounds.forEach((set, i) => {
      const { words, everyday } = stats.get(set) as SetStat;
      console.log(`| ${i + 1} | \`${set}\` | ${words} | ${everyday} | ${samples(set, items, SUBSTRING_SAMPLE_WORDS).join(", ")} |`);
    });
  }
  console.log(`\nDRAFTED ${days.length} days, ${days[0].date} to ${days[days.length - 1].date}, in ${join(values.root, SUBSTRINGS_ID)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
