// A researched list's file, content/lists/<category key>.json (docs/milestones/M23-23a-researched-lists.md): the answers
// of one everyday question, each with the names players type for it and a starting tier. Disk input, so every field is
// checked; `npm run content:validate` and `npm run base -- load research` both read it through here.
import { CATEGORY_KEY, checkKeys, isCalendarDate, isObject, isText, normalize } from "./puzzle.ts";
import { thingId } from "./thing-id.ts";

export type ListTier = "common" | "uncommon" | "rare";
// brand and borderline are for the human's review only; the game treats such an answer like any other (M23 answers 20, 23).
export type ListAnswer = { name: string; aliases: string[]; tier: ListTier; brand?: true; borderline?: true };
export type ResearchList = { format: 1; category: string; passes: 0 | 1 | 2; borderline_seen: string | null; answers: ListAnswer[] };

export const LISTS_DIR = "lists";
export const listPath = (category: string) => `${LISTS_DIR}/${category}.json`;
export const TIERS: string[] = ["common", "uncommon", "rare"];

// A list's answers are things of this source, each named by its list and its name as typed text is normalized, so the
// same list gives the same thing IDs in every database (src/content/thing-id.ts). The loader (scripts/base.ts) and a
// day built from a list (src/content/clock-day.ts) both name an answer here, so a day's IDs are the loaded things'.
export const RESEARCH_SOURCE = "research";
export const researchKey = (category: string, name: string) => `${category}/${normalize(name)}`;
export const answerId = (category: string, name: string) => thingId(RESEARCH_SOURCE, researchKey(category, name));

// The file's problems, each naming where (`file` is its path under the content root). `categories` is the categories file
// and the keys it lists, or null when that file is itself broken (reported elsewhere), which skips the category check.
export function parseList(file: string, text: string, categories: { file: string; keys: Set<string> } | null): { list: ResearchList | null; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { list: null, errors: [`${file}: not valid JSON (${(err as Error).message})`] };
  }
  if (!isObject(data)) return { list: null, errors: [`${file}: must be an object`] };
  const errors: string[] = [];
  checkKeys(errors, file, data, ["format", "category", "passes", "borderline_seen", "answers"]);
  if ("format" in data && data.format !== 1) errors.push(`${file}: "format" must be 1`);
  if ("passes" in data && ![0, 1, 2].includes(data.passes as number)) errors.push(`${file}: "passes" must be 0, 1 or 2`);
  if ("borderline_seen" in data && data.borderline_seen !== null && !isCalendarDate(data.borderline_seen)) {
    errors.push(`${file}: "borderline_seen" must be null or a real date, YYYY-MM-DD`);
  }
  if ("category" in data) {
    const category = data.category;
    if (typeof category !== "string" || !CATEGORY_KEY.test(category)) errors.push(`${file}: "category" must be a category key (lower-case letters and _)`);
    else {
      if (file !== listPath(category)) errors.push(`${file}: "category" is "${category}", but the path must be ${listPath(category)}`);
      if (categories && !categories.keys.has(category)) errors.push(`${file}: category "${category}" is not in ${categories.file}`);
    }
  }
  if ("answers" in data) {
    if (!Array.isArray(data.answers)) errors.push(`${file}: "answers" must be a list`);
    else checkAnswers(errors, file, data.answers);
  }
  return errors.length ? { list: null, errors } : { list: data as ResearchList, errors: [] };
}

function checkAnswers(errors: string[], file: string, answers: unknown[]) {
  const owner = new Map<string, number>(); // a typed form, and the answer that first has it
  answers.forEach((a, i) => {
    const where = `${file} answer ${i + 1}`;
    if (!isObject(a)) return errors.push(`${where}: must be an object`);
    checkKeys(errors, where, a, ["name", "aliases", "tier"], ["brand", "borderline"]);
    if ("tier" in a && !TIERS.includes(a.tier as string)) errors.push(`${where}: "tier" must be "common", "uncommon" or "rare"`);
    for (const flag of ["brand", "borderline"]) if (flag in a && a[flag] !== true) errors.push(`${where}: "${flag}" must be true, or left out`);
    if ("aliases" in a && !(Array.isArray(a.aliases) && a.aliases.every(isText))) errors.push(`${where}: "aliases" must be a list of non-empty strings`);
    if ("name" in a && !isText(a.name)) return errors.push(`${where}: "name" must be a non-empty string`);
    if (!isText(a.name) || !Array.isArray(a.aliases) || !a.aliases.every(isText)) return;
    for (const text of [a.name, ...a.aliases]) {
      const form = normalize(text);
      if (!form) {
        errors.push(`${where}: ${text === a.name ? "name" : "alias"} "${text}" has no letters or digits to type`);
        continue;
      }
      const first = owner.get(form);
      if (first === undefined) owner.set(form, i);
      else if (first !== i) errors.push(`${file}: "${form}" is typed for both "${(answers[first] as ListAnswer).name}" and "${a.name}"`);
    }
  });
}
