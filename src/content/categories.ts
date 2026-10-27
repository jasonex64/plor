// The categories (docs/milestones/M13-13e-growing-the-categories.md): data/categories.json lists every category the
// answer database defines, each a recipe over one source's tree (13a): its root, and optionally a thing its members are
// member_of. A subset (13e-4a, docs/milestones/M13-13e-4-subsets.md) names a base listed before it and one filter: a
// fact, a number at least some value, or the letter what's typed starts with. `npm run base -- load all` defines
// them; content:validate refuses a bank question asking one not listed. Pure and relative-imported, as both scripts use it.
import { CATEGORY_KEY, checkKeys, isObject, isText } from "./puzzle.ts";

// within: an older base category this one sits inside (berry in fruit), so they're one family and a day never asks
// both (human, 2026-10-27: "Allow, never the same day (Recommended)"); `load all` checks the root is under within's.
export type BaseCategory = { key: string; name: string; source: "oewn" | "wikidata"; root: string; member_of?: string; within?: string };
// A1's forms (human, 2026-10-26): a continent or an IUCN status, the continent maybe through the member's country; a
// population at least some value ("At least only (Recommended)"); a letter. A fact lists its values, and a member fits
// with any of them (13e-4b: "Approve: always a list (Recommended)").
export type Fact = { trait: "continent" | "conservation_status" | "genre" | "publisher"; values: string[]; via?: "country" };
export type Subset = { key: string; name: string; of: string } & ({ fact: Fact } | { at_least: { number: "population"; value: number } } | { starts_with: string });
export type CategoryDef = BaseCategory | Subset;

export const CATEGORIES_FILE = "data/categories.json";

export function isSubset(c: CategoryDef): c is Subset {
  return "of" in c;
}

// A subset's filter as private.define_subset takes it, with a fact's value still the source's ID.
export function filterOf(c: Subset): Record<string, string | number | string[]> {
  if ("fact" in c) return { ...c.fact };
  if ("at_least" in c) return { number: c.at_least.number, at_least: c.at_least.value };
  return { starts_with: c.starts_with };
}

// The facts a subset may filter on: 13e-4a's, and 13e-6's genre and publisher (pop culture).
const FACT_TRAITS = ["continent", "conservation_status", "genre", "publisher"];

// A category's family: a subset's base's, a category within another's that one's, else itself. A day holds one question
// per family (human, 2026-10-26: "Separate, not same day"). A key not listed is its own family.
export function familyOf(categories: CategoryDef[]): (key: string) => string {
  const up = new Map(categories.map((c) => [c.key, isSubset(c) ? c.of : c.within]));
  const family = (key: string): string => {
    const next = up.get(key);
    return next ? family(next) : key;
  };
  return family;
}

// The file's shape, every error naming where. Keys are unique; a subset's base is a base category listed before it.
export function parseCategories(file: string, text: string): { categories: CategoryDef[] | null; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { categories: null, errors: [`${file}: not valid JSON (${(err as Error).message})`] };
  }
  if (!Array.isArray(data)) return { categories: null, errors: [`${file}: must be a list of categories`] };
  const errors: string[] = [];
  const bases = new Set<unknown>();
  data.forEach((v, i) => {
    const where = `${file} category ${i + 1}`;
    if (!isObject(v)) return errors.push(`${where}: must be an object`);
    if ("key" in v && !(typeof v.key === "string" && CATEGORY_KEY.test(v.key))) errors.push(`${where}: "key" must be a category key (lower-case letters and _)`);
    if ("name" in v && !isText(v.name)) errors.push(`${where}: "name" must be text`);
    if (!("of" in v)) {
      checkKeys(errors, where, v, ["key", "name", "source", "root"], ["member_of", "within"]);
      if ("within" in v && !bases.has(v.within)) errors.push(`${where}: "within" must be a base category listed before it`);
      if ("source" in v && v.source !== "oewn" && v.source !== "wikidata") errors.push(`${where}: "source" must be "oewn" or "wikidata"`);
      if ("root" in v && !isText(v.root)) errors.push(`${where}: "root" must be the source's ID`);
      if ("member_of" in v && !isText(v.member_of)) errors.push(`${where}: "member_of" must be the source's ID`);
      bases.add(v.key);
      return;
    }
    checkKeys(errors, where, v, ["key", "name", "of"], ["fact", "at_least", "starts_with"]);
    if (!bases.has(v.of)) errors.push(`${where}: "of" must be a base category listed before it`);
    const filters = ["fact", "at_least", "starts_with"].filter((f) => f in v);
    if (filters.length !== 1) errors.push(`${where}: a subset has exactly one of "fact", "at_least" and "starts_with"`);
    if ("fact" in v) {
      const f = v.fact;
      const values = isObject(f) ? f.values : undefined;
      const ok = isObject(f) && FACT_TRAITS.includes(f.trait as string)
        && Array.isArray(values) && values.length > 0 && values.every(isText) && new Set(values).size === values.length
        && Object.keys(f).every((k) => ["trait", "values", "via"].includes(k)) && (!("via" in f) || (f.via === "country" && f.trait === "continent"));
      if (!ok) errors.push(`${where}: "fact" must be {"trait": one of ${FACT_TRAITS.join(", ")}, "values": the source's IDs, each once}, with "via": "country" only for a continent`);
    }
    if ("at_least" in v) {
      const n = v.at_least;
      const ok = isObject(n) && n.number === "population" && Number.isInteger(n.value) && (n.value as number) > 0 && Object.keys(n).length === 2;
      if (!ok) errors.push(`${where}: "at_least" must be {"number": "population", "value": a whole number above 0}`);
    }
    if ("starts_with" in v && !(typeof v.starts_with === "string" && /^[a-z]$/.test(v.starts_with))) errors.push(`${where}: "starts_with" must be one letter, a to z`);
  });
  const keys = data.map((v) => (isObject(v) ? v.key : undefined));
  for (const key of new Set(keys.filter((k, i) => k !== undefined && keys.indexOf(k) !== i))) errors.push(`${file}: category "${key}" is listed twice`);
  return errors.length ? { categories: null, errors } : { categories: data as CategoryDef[], errors: [] };
}
