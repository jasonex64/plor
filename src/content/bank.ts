// The question bank (docs/milestones/M13-13d-the-question-bank.md): content/bank.json, the questions a day's 7 are
// picked from and the themes set for dates (human, 2026-10-24: "A file, like drafts (Recommended)"). Its shape, the
// 30-day gap between uses of a category, and the pick. Pure and relative-imported: content:validate, npm run draft
// and the admin bank page all use it.
import { HOST_ANSWERS_PER_QUESTION, QUESTIONS_PER_DAY, REPEAT_GAP_DAYS } from "../config/tunables.ts";
import { GAME_ID } from "../platform/game.ts";
import { CATEGORY_KEY, checkKeys, isCalendarDate, isObject, isText, type Puzzle } from "./puzzle.ts";

// A question as the bank holds it: its answers by name (or "#<thing id>"), resolved when a day is drafted.
export type BankQuestion = {
  id: string;
  prompt: string;
  category: string;
  host_bank: string[];
  uncommon: string[];
  themes: string[];
  added_by: "human" | "claude";
};
export type Bank = { format: 1; questions: BankQuestion[]; themes: Record<string, string> };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// A question can land at any position, so its host bank holds at least the most host answers any position takes (13e;
// DECISIONS.md, Puzzle drafting).
const HOST_BANK_MIN = Math.max(...HOST_ANSWERS_PER_QUESTION);

function isNames(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isText);
}

function checkBankQuestion(errors: string[], where: string, v: unknown) {
  if (!isObject(v)) return errors.push(`${where}: must be an object`);
  checkKeys(errors, where, v, ["id", "prompt", "category", "host_bank", "uncommon", "themes", "added_by"]);
  if ("id" in v && !(typeof v.id === "string" && SLUG.test(v.id))) errors.push(`${where}: "id" must be a lower-case slug`);
  if ("prompt" in v && !isText(v.prompt)) errors.push(`${where}: "prompt" must be text`);
  if ("category" in v && !(typeof v.category === "string" && CATEGORY_KEY.test(v.category))) errors.push(`${where}: "category" must be a category key`);
  if ("host_bank" in v && !isNames(v.host_bank)) errors.push(`${where}: "host_bank" must list names`);
  else if (isNames(v.host_bank) && v.host_bank.length < HOST_BANK_MIN) errors.push(`${where}: "host_bank" lists ${v.host_bank.length} names, at least ${HOST_BANK_MIN} needed`);
  if ("uncommon" in v && !isNames(v.uncommon)) errors.push(`${where}: "uncommon" must list names`);
  if ("themes" in v && !(Array.isArray(v.themes) && v.themes.every((t) => typeof t === "string" && SLUG.test(t)))) {
    errors.push(`${where}: "themes" must list lower-case slugs`);
  }
  if ("added_by" in v && v.added_by !== "human" && v.added_by !== "claude") errors.push(`${where}: "added_by" must be "human" or "claude"`);
}

// The bank's shape, every error naming where. IDs are unique; a theme set for a date is a slug.
export function parseBank(file: string, text: string): { bank: Bank | null; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { bank: null, errors: [`${file}: not valid JSON (${(err as Error).message})`] };
  }
  const errors: string[] = [];
  if (!isObject(data)) return { bank: null, errors: [`${file}: must be an object`] };
  checkKeys(errors, file, data, ["format", "questions", "themes"]);
  if ("format" in data && data.format !== 1) errors.push(`${file}: "format" must be 1`);
  if ("questions" in data) {
    if (!Array.isArray(data.questions)) errors.push(`${file}: "questions" must be a list`);
    else {
      data.questions.forEach((q, i) => checkBankQuestion(errors, `${file} question ${i + 1}`, q));
      const ids = data.questions.map((q) => (isObject(q) ? q.id : undefined));
      for (const id of new Set(ids.filter((id, i) => id !== undefined && ids.indexOf(id) !== i))) errors.push(`${file}: question id "${id}" is listed twice`);
    }
  }
  if ("themes" in data) {
    if (!isObject(data.themes)) errors.push(`${file}: "themes" must map dates to themes`);
    else {
      for (const [date, theme] of Object.entries(data.themes)) {
        if (!isCalendarDate(date) || !(typeof theme === "string" && SLUG.test(theme))) errors.push(`${file}: theme "${date}": "${String(theme)}" must map a date to a slug`);
      }
    }
  }
  return errors.length ? { bank: null, errors } : { bank: data as Bank, errors: [] };
}

// Days between two calendar dates.
export function daysApart(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

// Drafted days that ask a category less than REPEAT_GAP_DAYS apart (human, 2026-10-24, M13 D7: "at least 30 days";
// 13d: "Same category (Recommended)"), one message per pair. Within one day, the same category twice too, or two of one
// family (a base and its subsets: human, 2026-10-26, "Separate, not same day"), as family names it.
export function gapProblems(days: Puzzle[], family: (key: string) => string): string[] {
  const uses = days.flatMap((d) => d.questions.map((q) => ({ date: d.date, category: q.category })));
  const out: string[] = [];
  uses.forEach((u, i) => {
    for (const v of uses.slice(i + 1)) {
      if (u.category === v.category && daysApart(u.date, v.date) < REPEAT_GAP_DAYS) {
        out.push(`${u.category} is asked on ${u.date} and ${v.date}, less than ${REPEAT_GAP_DAYS} days apart`);
      } else if (u.date === v.date && u.category !== v.category && family(u.category) === family(v.category)) {
        out.push(`${u.category} and ${v.category} are both asked on ${u.date}, one family (${family(u.category)})`);
      }
    }
  });
  return out;
}

// The dates a bank question ran: drafted days holding a question with its prompt and category.
export function usesOf(q: BankQuestion, days: Puzzle[]): string[] {
  return days.filter((d) => d.questions.some((x) => x.prompt === q.prompt && x.category === q.category)).map((d) => d.date).sort();
}

// A small stable hash, as the draft seeds its letters and hosts with.
export function seed(text: string): number {
  return [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}

// The day's 7 bank questions for a date (13d): only questions whose category no other drafted day asks within
// REPEAT_GAP_DAYS, and each family once (family: a subset's base, else the category); the date's theme first, then questions never used, then the least recently
// used; ties in a date-seeded order. Throws, saying how many are missing, when fewer are eligible ("Stop and ask
// (Recommended)"). days: every drafted day; the date's own, if drafted before, is left out, as a redraft replaces it.
// leftOut: question IDs the draft swapped out for this date because no letters fit with them (13e-10b), skipped as if
// they weren't in the bank, so the next choice is the one the pick would make without them.
export function pickQuestions(bank: Bank, days: Puzzle[], date: string, family: (key: string) => string, leftOut: ReadonlySet<string> = new Set()): BankQuestion[] {
  const others = days.filter((d) => d.date !== date);
  const theme = bank.themes[date];
  const blocked = new Set(others.flatMap((d) => (daysApart(d.date, date) < REPEAT_GAP_DAYS ? d.questions.map((q) => q.category) : [])));
  const ranked = bank.questions
    .filter((q) => !blocked.has(q.category) && !leftOut.has(q.id))
    .map((q) => ({ q, themed: theme !== undefined && q.themes.includes(theme), last: usesOf(q, others).at(-1) ?? "", tie: seed(`${date}:${q.id}`) }))
    .sort((a, b) => Number(b.themed) - Number(a.themed) || a.last.localeCompare(b.last) || a.tie - b.tie);
  const picked: BankQuestion[] = [];
  for (const { q } of ranked) if (picked.length < QUESTIONS_PER_DAY && !picked.some((p) => family(p.category) === family(q.category))) picked.push(q);
  if (picked.length < QUESTIONS_PER_DAY) {
    throw new Error(`${date}: only ${picked.length} bank questions ask a category not used within ${REPEAT_GAP_DAYS} days; ${QUESTIONS_PER_DAY - picked.length} more needed`);
  }
  return picked;
}

// The 7 named bank questions for a date, in that order (human, 2026-10-24: "Pick its 7 yourself (Recommended)"),
// refused when an ID is unknown or a category breaks the gap or shares a family with another that day.
export function namedQuestions(bank: Bank, days: Puzzle[], date: string, ids: string[], family: (key: string) => string): BankQuestion[] {
  if (ids.length !== QUESTIONS_PER_DAY) throw new Error(`--questions takes ${QUESTIONS_PER_DAY} IDs, got ${ids.length}`);
  const questions = ids.map((id) => {
    const q = bank.questions.find((x) => x.id === id);
    if (!q) throw new Error(`no bank question "${id}"`);
    return q;
  });
  const day: Puzzle = { format: 3, game_id: GAME_ID, date, questions: questions.map((q) => ({ prompt: q.prompt, category: q.category, host_bank: [], host_answers: [], levels: {} })) };
  const problems = gapProblems([...days.filter((d) => d.date !== date), day], family).filter((p) => p.includes(date));
  if (problems.length) throw new Error(problems.join("\n"));
  return questions;
}

// Easiest first ("Easiest first (Recommended)"): by each question's expected catch rate, lowest first; ties keep their order.
export function easiestFirst<T>(items: T[], catchRate: (item: T) => number): T[] {
  return items.map((item, i) => ({ item, i, c: catchRate(item) })).sort((a, b) => a.c - b.c || a.i - b.i).map((x) => x.item);
}
