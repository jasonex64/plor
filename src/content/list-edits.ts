// What an admin does to a researched list on the review page, and how it reaches the list's file (docs/milestones/
// M23-23b-research-and-review.md, Part 3): a strike takes an answer off, an add puts one on, and a seen mark dates the
// review. They wait in the database until `npm run lists -- fold` writes them into content/lists/<category>.json; the
// load's guard asks which of them a file does not hold yet. Pure and relative-imported, as the scripts and the review
// page's server code both use it.
import type { ListAnswer, ResearchList } from "./list.ts";
import { CATEGORY_KEY, isCalendarDate, isObject, isText, normalize } from "./puzzle.ts";

// name: the typed form struck (normalized, as the database keeps it) or the name as the admin wrote it, for an add.
export type ListEdit = { category: string; name: string; kind: "strike" | "add" };
export type ListSeen = { category: string; at: string };
// What private.list_edits returns: the edits not yet folded, and the lists seen.
export type Review = { edits: (ListEdit & { at: string })[]; seen: ListSeen[] };

// Every form an answer is typed as, normalized as typed text is.
export const formsOf = (a: ListAnswer): string[] => [a.name, ...a.aliases].map(normalize);

const has = (list: ResearchList | undefined, name: string) => list?.answers.some((a) => formsOf(a).includes(normalize(name))) ?? false;

// The edits the files do not hold yet: a strike whose answer is still on its file's list, an add that is not on it.
// Whatever else an edit carries (the loader's row ID) stays on it.
export function unfoldedEdits<E extends ListEdit>(edits: E[], lists: ResearchList[]): E[] {
  return edits.filter((e) => has(lists.find((l) => l.category === e.category), e.name) === (e.kind === "strike"));
}

// The list with its category's edits written in: a struck answer's line deleted, an added answer a line of its own (rare,
// no marks) unless the list has it, and, when the list was seen, `seen` (YYYY-MM-DD) as its borderline_seen date.
export function foldList(list: ResearchList, edits: ListEdit[], seen: string | null): ResearchList {
  let answers = list.answers;
  for (const e of edits.filter((x) => x.category === list.category)) {
    const form = normalize(e.name);
    if (e.kind === "strike") answers = answers.filter((a) => !formsOf(a).includes(form));
    else if (!answers.some((a) => formsOf(a).includes(form))) answers = [...answers, { name: e.name, aliases: [], tier: "rare" }];
  }
  return { ...list, borderline_seen: seen ?? list.borderline_seen, answers };
}

// The list as its file holds it, so a fold's diff is the lines it changes: a line for each answer, the rest indented.
export function formatList(list: ResearchList): string {
  const head = (["format", "category", "passes", "borderline_seen"] as const).map((k) => `  "${k}": ${JSON.stringify(list[k])},\n`).join("");
  return `{\n${head}  "answers": [\n${list.answers.map((a) => `    ${JSON.stringify(a)}`).join(",\n")}\n  ]\n}\n`;
}

// The export file a session writes from the hosted database (`npm run lists -- fold --from <file>`) is input from disk.
export function parseReview(file: string, text: string): Review {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`${file}: not valid JSON (${(err as Error).message})`);
  }
  if (!isObject(data) || !Array.isArray(data.edits) || !Array.isArray(data.seen)) throw new Error(`${file}: must be an object with "edits" and "seen" lists`);
  // A time as the database writes one (an ISO timestamp): its calendar date comes before the "T", and a seen mark's becomes the date in the list's file.
  const isTime = (v: unknown) => isText(v) && isCalendarDate(v.split("T")[0]) && !Number.isNaN(Date.parse(v));
  const isKey = (v: unknown) => typeof v === "string" && CATEGORY_KEY.test(v);
  for (const e of data.edits) {
    if (!isObject(e) || !isKey(e.category) || !isText(e.name) || (e.kind !== "strike" && e.kind !== "add") || !isTime(e.at)) {
      throw new Error(`${file}: every edit needs a category, a name, a kind of "strike" or "add", and a time`);
    }
  }
  for (const s of data.seen) {
    if (!isObject(s) || !isKey(s.category) || !isTime(s.at)) throw new Error(`${file}: every seen mark needs a category and a time`);
  }
  return data as Review;
}
