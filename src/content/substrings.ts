// Game 2's day, format 1, and its validator (docs/milestones/M16-16b-run-model-and-format.md, "Content format";
// DECISIONS.md, Game 2). Format numbers count per game, so this is the first of game 2's. Hand-written checks, as for
// game 1 (src/content/puzzle.ts). The rounds' word bands aren't here: they're the picker's rule, not something a day
// stores (scripts/substrings.ts).
import { SUBSTRING_REPEAT_GAP_DAYS, SUBSTRING_ROUNDS } from "../config/tunables.ts";
import { SUBSTRINGS_ID } from "../platform/game.ts";
import { daysApart } from "./bank.ts";
import { checkKeys, isCalendarDate, isObject } from "./puzzle.ts";

export type SubstringDay = { format: 1; game_id: typeof SUBSTRINGS_ID; date: string; rounds: string[]; bonus_letter: string };

// Shape only: the rules between fields are in checkSubstringDay.
export function parseSubstringDay(file: string, text: string): { day: SubstringDay; errors: [] } | { day: null; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { day: null, errors: [`${file}: not valid JSON (${(err as Error).message})`] };
  }
  if (!isObject(data)) return { day: null, errors: [`${file}: must be a JSON object`] };
  const errors: string[] = [];
  checkKeys(errors, file, data, ["format", "game_id", "date", "rounds", "bonus_letter"]);
  if ("format" in data && data.format !== 1) errors.push(`${file}: "format" must be 1`);
  if ("game_id" in data && data.game_id !== SUBSTRINGS_ID) errors.push(`${file}: "game_id" must be "${SUBSTRINGS_ID}"`);
  if ("date" in data && !isCalendarDate(data.date)) errors.push(`${file}: "date" must be a calendar date YYYY-MM-DD`);
  if ("rounds" in data) {
    if (!Array.isArray(data.rounds)) errors.push(`${file}: "rounds" must be a list`);
    else if (!data.rounds.every((r) => typeof r === "string" && /^[a-z]+$/.test(r))) errors.push(`${file}: every round must be lower-case letters`);
  }
  if ("bonus_letter" in data && !(typeof data.bonus_letter === "string" && /^[a-z]$/.test(data.bonus_letter))) {
    errors.push(`${file}: "bonus_letter" must be one lower-case letter`);
  }
  return errors.length ? { day: null, errors } : { day: data as SubstringDay, errors: [] };
}

// The rules between fields, for a file or a day the picker just drew. `where` prefixes each message.
export function checkSubstringDay(where: string, day: SubstringDay): string[] {
  const out: string[] = [];
  if (day.rounds.length !== SUBSTRING_ROUNDS.length) out.push(`${where}: has ${day.rounds.length} rounds, expected ${SUBSTRING_ROUNDS.length} rounds`);
  day.rounds.forEach((set, i) => {
    const letters = SUBSTRING_ROUNDS[i]?.letters;
    if (letters !== undefined && set.length !== letters) out.push(`${where} round ${i + 1}: "${set}" must be ${letters} letters`);
    day.rounds.forEach((other, j) => {
      // A word can't be used twice in a run (S10), so a set inside another would share its words: answer 4.
      if (i !== j && other.includes(set) && (set !== other || i < j)) out.push(`${where}: "${set}" is inside "${other}"`);
    });
  });
  const holding = day.rounds.find((set) => set.includes(day.bonus_letter));
  if (holding) out.push(`${where}: bonus letter "${day.bonus_letter}" is in "${holding}"`);
  return out;
}

export function checkSubstringsFile(file: string, text: string): string[] {
  const { day, errors } = parseSubstringDay(file, text);
  if (!day) return errors;
  const expected = `${day.game_id}/${day.date}.json`;
  return [...(file === expected ? [] : [`${file}: path must be ${expected} to match its game_id and date`]), ...checkSubstringDay(file, day)];
}

// The sets of `days` within the repeat gap of `date`, its own day left out: what the picker can't use there.
export function setsNear(date: string, days: SubstringDay[]): Set<string> {
  return new Set(days.filter((d) => d.date !== date && daysApart(d.date, date) < SUBSTRING_REPEAT_GAP_DAYS).flatMap((d) => d.rounds));
}

export function substringGapProblems(days: SubstringDay[]): string[] {
  const out: string[] = [];
  days.forEach((day, i) => {
    for (const later of days.slice(i + 1)) {
      if (daysApart(day.date, later.date) >= SUBSTRING_REPEAT_GAP_DAYS) continue;
      const sets = new Set(later.rounds);
      for (const set of day.rounds) if (sets.has(set)) out.push(`"${set}" is used on ${day.date} and ${later.date}, less than ${SUBSTRING_REPEAT_GAP_DAYS} days apart`);
    }
  });
  return out;
}
