// Puzzle content format 1 and its validator (DECISIONS.md: Puzzle content format, Answer model;
// M00-data-design.md §4). Hand-written checks, no schema library (human, 2026-10-18). The M02 server
// imports this same module, so content is checked one way.
import pluralize from "pluralize";
import { HOST_ANSWERS_BY_QUESTION, QUESTIONS_PER_DAY } from "../config/tunables.ts";

// Permanent: stored with every run and ledger row (DECISIONS.md: Game 1).
export const GAME_ID = "offbeat";

export type Entry = { id: string; name: string; aliases: string[]; plural?: string };
export type Question = {
  prompt: string;
  entries: Entry[];
  host_bank: string[];
  host_answers: string[];
  match_groups: Record<string, string[]>;
};
export type Puzzle = { format: 1; game_id: typeof GAME_ID; date: string; questions: Question[] };

// Authoring-time normalization (human-approved format, 2026-10-18; SOURCES.md: Unicode normalization).
// Lowercase first: lowercasing can produce combining marks (e.g. U+0130), which NFKD + \p{M} then remove.
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\p{P}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// The plural an entry must carry as an alias: the human's override, else pluralize 8.0.0's output.
// Generated plurals are written into the file by `npm run content:plurals` and reviewed in the diff.
export function expectedPlural(entry: Entry): string {
  return entry.plural ?? pluralize(entry.name);
}

export function hasPlural(entry: Entry): boolean {
  const plural = normalize(expectedPlural(entry));
  return plural === normalize(entry.name) || entry.aliases.some((a) => normalize(a) === plural);
}

// --- shape (the file is untrusted input from disk) ---

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function checkKeys(errors: string[], where: string, obj: Record<string, unknown>, required: string[], optional: string[] = []) {
  for (const key of required) if (!(key in obj)) errors.push(`${where}: missing "${key}"`);
  for (const key of Object.keys(obj)) {
    if (!required.includes(key) && !optional.includes(key)) errors.push(`${where}: unknown field "${key}"`);
  }
}

function isText(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

function isTextList(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isText);
}

function isCalendarDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function checkEntry(errors: string[], where: string, v: unknown) {
  if (!isObject(v)) {
    errors.push(`${where}: must be an object`);
    return;
  }
  checkKeys(errors, where, v, ["id", "name", "aliases"], ["plural"]);
  if ("id" in v && !isText(v.id)) errors.push(`${where}: "id" must be a non-empty string`);
  if ("name" in v && !isText(v.name)) errors.push(`${where}: "name" must be a non-empty string`);
  if ("aliases" in v && !isTextList(v.aliases)) errors.push(`${where}: "aliases" must be a list of non-empty strings`);
  if ("plural" in v && !isText(v.plural)) errors.push(`${where}: "plural" must be a non-empty string`);
}

function checkQuestion(errors: string[], where: string, v: unknown) {
  if (!isObject(v)) {
    errors.push(`${where}: must be an object`);
    return;
  }
  checkKeys(errors, where, v, ["prompt", "entries", "host_bank", "host_answers", "match_groups"]);
  if ("prompt" in v && !isText(v.prompt)) errors.push(`${where}: "prompt" must be a non-empty string`);
  if ("entries" in v) {
    if (!Array.isArray(v.entries)) errors.push(`${where}: "entries" must be a list`);
    else v.entries.forEach((entry, i) => checkEntry(errors, `${where} entries[${i}]`, entry));
  }
  for (const key of ["host_bank", "host_answers"]) {
    if (key in v && !isTextList(v[key])) errors.push(`${where}: "${key}" must be a list of entry IDs`);
  }
  if ("match_groups" in v) {
    const groups = v.match_groups;
    if (!isObject(groups) || !Object.values(groups).every(isTextList)) {
      errors.push(`${where}: "match_groups" must map a host answer ID to a list of entry IDs`);
    }
  }
}

// Shape only: types, required and unknown fields. Cross-references are checked in checkPuzzleFile.
export function parsePuzzle(file: string, text: string): { puzzle: Puzzle; errors: [] } | { puzzle: null; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { puzzle: null, errors: [`${file}: not valid JSON (${(err as Error).message})`] };
  }
  if (!isObject(data)) return { puzzle: null, errors: [`${file}: must be a JSON object`] };
  const errors: string[] = [];
  checkKeys(errors, file, data, ["format", "game_id", "date", "questions"]);
  if ("format" in data && data.format !== 1) errors.push(`${file}: "format" must be 1`);
  if ("game_id" in data && data.game_id !== GAME_ID) errors.push(`${file}: "game_id" must be "${GAME_ID}"`);
  if ("date" in data && !isCalendarDate(data.date)) errors.push(`${file}: "date" must be a calendar date YYYY-MM-DD`);
  if ("questions" in data) {
    if (!Array.isArray(data.questions)) errors.push(`${file}: "questions" must be a list`);
    else data.questions.forEach((q, i) => checkQuestion(errors, `${file} q${i + 1}`, q));
  }
  return errors.length ? { puzzle: null, errors } : { puzzle: data as Puzzle, errors: [] };
}

// --- answer-model rules ---

function duplicates(ids: string[]): string[] {
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
}

// `expectedAnswers` is undefined past the last position; the question-count error already covers that.
function checkQuestionRules(where: string, q: Question, expectedAnswers: number | undefined): string[] {
  const errors: string[] = [];
  const ids = q.entries.map((e) => e.id);
  for (const id of duplicates(ids)) errors.push(`${where} entry "${id}": ID used by more than one entry`);
  const known = new Set(ids);

  // Every name and alias must normalize to exactly one entry, or a typed answer would be ambiguous.
  const owner = new Map<string, { id: string; raw: string }>();
  for (const entry of q.entries) {
    for (const raw of [entry.name, ...entry.aliases]) {
      const key = normalize(raw);
      const prev = owner.get(key);
      if (key === "") errors.push(`${where} entry "${entry.id}": "${raw}" is empty after normalization`);
      else if (prev) errors.push(`${where} entry "${entry.id}": "${raw}" collides with "${prev.raw}" of entry "${prev.id}" (both normalize to "${key}")`);
      else owner.set(key, { id: entry.id, raw });
    }
  }

  for (const entry of q.entries) {
    if (!hasPlural(entry)) {
      errors.push(`${where} entry "${entry.id}": no plural alias "${expectedPlural(entry)}" (run npm run content:plurals, or set "plural" to override)`);
    }
  }

  for (const id of duplicates(q.host_bank)) errors.push(`${where} entry "${id}": listed twice in host_bank`);
  for (const id of q.host_bank) {
    if (!known.has(id)) errors.push(`${where} entry "${id}": in host_bank but not in the accepted bank`);
  }

  const bank = new Set(q.host_bank);
  if (expectedAnswers !== undefined && q.host_answers.length !== expectedAnswers) {
    errors.push(`${where}: has ${q.host_answers.length} host answers, expected ${expectedAnswers}`);
  }
  for (const id of duplicates(q.host_answers)) errors.push(`${where} entry "${id}": listed twice in host_answers`);
  for (const id of q.host_answers) {
    if (!bank.has(id)) errors.push(`${where} entry "${id}": host answer is not in host_bank`);
  }

  // Groups are keyed by host answer: only a host answer's group is ever used for matching. A host answer
  // always matches itself, so its group lists only the other entries it covers (human, 2026-10-18).
  const answers = new Set(q.host_answers);
  for (const [key, members] of Object.entries(q.match_groups)) {
    if (!known.has(key)) errors.push(`${where} entry "${key}": match group key is not in the accepted bank`);
    else if (!answers.has(key)) errors.push(`${where} entry "${key}": match group key is not a host answer`);
    if (members.includes(key)) errors.push(`${where} entry "${key}": listed in its own match group (a host answer always matches itself)`);
    for (const id of members) {
      if (!known.has(id)) errors.push(`${where} entry "${id}": in match group "${key}" but not in the accepted bank`);
    }
  }
  return errors;
}

// `file` is the path relative to the content root, with "/" separators: `<game_id>/<date>.json`.
export function checkPuzzleFile(file: string, text: string): string[] {
  const { puzzle, errors } = parsePuzzle(file, text);
  if (!puzzle) return errors;
  const out: string[] = [];
  // The path is the puzzle's identity, so two files can never claim the same day (human, 2026-10-18).
  const expected = `${puzzle.game_id}/${puzzle.date}.json`;
  if (file !== expected) out.push(`${file}: path must be ${expected} to match its game_id and date`);
  if (puzzle.questions.length !== QUESTIONS_PER_DAY) {
    out.push(`${file}: has ${puzzle.questions.length} questions, expected ${QUESTIONS_PER_DAY}`);
  }
  puzzle.questions.forEach((q, i) => out.push(...checkQuestionRules(`${file} q${i + 1}`, q, HOST_ANSWERS_BY_QUESTION[i])));
  return out;
}
