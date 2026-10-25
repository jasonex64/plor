// The categories (docs/milestones/M13-13e-growing-the-categories.md): data/categories.json lists every category the
// answer database defines, each a recipe over one source's tree (13a): its root, and optionally a thing its members are
// member_of. `npm run base -- load all` defines them; content:validate refuses a bank question asking one not listed.
// Pure and relative-imported, as both scripts use it.
import { CATEGORY_KEY, checkKeys, isObject, isText } from "./puzzle.ts";

export type CategoryDef = { key: string; name: string; source: "oewn" | "wikidata"; root: string; member_of?: string };

export const CATEGORIES_FILE = "data/categories.json";

// The file's shape, every error naming where. Keys are unique.
export function parseCategories(file: string, text: string): { categories: CategoryDef[] | null; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { categories: null, errors: [`${file}: not valid JSON (${(err as Error).message})`] };
  }
  if (!Array.isArray(data)) return { categories: null, errors: [`${file}: must be a list of categories`] };
  const errors: string[] = [];
  data.forEach((v, i) => {
    const where = `${file} category ${i + 1}`;
    if (!isObject(v)) return errors.push(`${where}: must be an object`);
    checkKeys(errors, where, v, ["key", "name", "source", "root"], ["member_of"]);
    if ("key" in v && !(typeof v.key === "string" && CATEGORY_KEY.test(v.key))) errors.push(`${where}: "key" must be a category key (lower-case letters and _)`);
    if ("name" in v && !isText(v.name)) errors.push(`${where}: "name" must be text`);
    if ("source" in v && v.source !== "oewn" && v.source !== "wikidata") errors.push(`${where}: "source" must be "oewn" or "wikidata"`);
    if ("root" in v && !isText(v.root)) errors.push(`${where}: "root" must be the source's ID`);
    if ("member_of" in v && !isText(v.member_of)) errors.push(`${where}: "member_of" must be the source's ID`);
  });
  const keys = data.map((v) => (isObject(v) ? v.key : undefined));
  for (const key of new Set(keys.filter((k, i) => k !== undefined && keys.indexOf(k) !== i))) errors.push(`${file}: category "${key}" is listed twice`);
  return errors.length ? { categories: null, errors } : { categories: data as CategoryDef[], errors: [] };
}
