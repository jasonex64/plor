// The question bank (docs/milestones/M13-13d-the-question-bank.md): content/bank.json, each question's wording and its
// list, by category. A day on a clock takes its wording from it, `npm run base` reads its answers, and `content:validate`
// checks it. Pure and relative-imported: the scripts and the admin pages all use it.
import { CATEGORY_KEY, checkKeys, isObject, isText } from "./puzzle.ts";

// A question as the bank holds it: its answers by name (or "#<thing id>"), resolved when a day is drafted.
export type BankQuestion = {
  id: string;
  prompt: string;
  category: string;
  host_bank: string[];
  uncommon: string[];
};
export type Bank = { format: 1; questions: BankQuestion[] };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isNames(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isText);
}

function checkBankQuestion(errors: string[], where: string, v: unknown) {
  if (!isObject(v)) return errors.push(`${where}: must be an object`);
  checkKeys(errors, where, v, ["id", "prompt", "category", "host_bank", "uncommon"]);
  if ("id" in v && !(typeof v.id === "string" && SLUG.test(v.id))) errors.push(`${where}: "id" must be a lower-case slug`);
  if ("prompt" in v && !isText(v.prompt)) errors.push(`${where}: "prompt" must be text`);
  if ("category" in v && !(typeof v.category === "string" && CATEGORY_KEY.test(v.category))) errors.push(`${where}: "category" must be a category key`);
  if ("host_bank" in v && !isNames(v.host_bank)) errors.push(`${where}: "host_bank" must list names`);
  if ("uncommon" in v && !isNames(v.uncommon)) errors.push(`${where}: "uncommon" must list names`);
}

// The bank's shape, every error naming where: a question by its ID, or by its place when the ID itself is wrong (13e-1
// review; 13f-4c). IDs are unique; no two questions ask one prompt for one category.
export function parseBank(file: string, text: string): { bank: Bank | null; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { bank: null, errors: [`${file}: not valid JSON (${(err as Error).message})`] };
  }
  const errors: string[] = [];
  if (!isObject(data)) return { bank: null, errors: [`${file}: must be an object`] };
  checkKeys(errors, file, data, ["format", "questions"]);
  if ("format" in data && data.format !== 1) errors.push(`${file}: "format" must be 1`);
  if ("questions" in data) {
    if (!Array.isArray(data.questions)) errors.push(`${file}: "questions" must be a list`);
    else {
      data.questions.forEach((q, i) => checkBankQuestion(errors, `${file} question ${isObject(q) && typeof q.id === "string" && SLUG.test(q.id) ? `"${q.id}"` : i + 1}`, q));
      const ids = data.questions.map((q) => (isObject(q) ? q.id : undefined));
      for (const id of new Set(ids.filter((id, i) => id !== undefined && ids.indexOf(id) !== i))) errors.push(`${file}: question id "${id}" is listed twice`);
      const asked = new Map<string, unknown>();
      for (const q of data.questions) {
        if (!isObject(q)) continue;
        const key = JSON.stringify([q.prompt, q.category]);
        const other = asked.get(key);
        if (other !== undefined && other !== q.id) errors.push(`${file}: questions "${String(other)}" and "${String(q.id)}" ask "${String(q.prompt)}" for ${String(q.category)}`);
        else asked.set(key, q.id);
      }
    }
  }
  return errors.length ? { bank: null, errors } : { bank: data as Bank, errors: [] };
}

// Days between two calendar dates.
export function daysApart(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / (24 * 60 * 60 * 1000);
}

// A small stable hash, as the draft seeds its picks with.
export function seed(text: string): number {
  return [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7); // kept as built (human, 2026-11-17, docs/milestones/PROCESS-lint-rules.md answer 26)
}
