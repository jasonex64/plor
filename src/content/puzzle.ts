// Puzzle content format 2 and its validator (DECISIONS.md: Puzzle content format, Answer model;
// M00-data-design.md §4). Hand-written checks, no schema library (human, 2026-10-18). The M02 server
// imports this same module, so content is checked one way.
import pluralize from "pluralize";
import { LETTER_SCHEDULE, LETTER_TIERS, QUESTIONS_PER_DAY } from "../config/tunables.ts";

// Permanent: stored with every run and ledger row (DECISIONS.md: Game 1).
export const GAME_ID = "offbeat";

export type Entry = { id: string; name: string; aliases: string[]; plural?: string };
export type Question = {
  prompt: string;
  entries: Entry[];
  host_bank: string[];
  host_answers: string[];
  match_groups: Record<string, string[]>;
  // The letter the Wind steals at this question (format 2; M04 13c-3). It stays gone for the rest of the run.
  steals?: string;
};
export type Puzzle = { format: 2; game_id: typeof GAME_ID; date: string; questions: Question[] };

// The letters gone by question `index`: every letter stolen at it or before it.
export function stolenLetters(puzzle: Puzzle, index: number): string[] {
  return puzzle.questions.slice(0, index + 1).flatMap((q) => (q.steals ? [q.steals] : []));
}

// Whether a name can be typed without the stolen letters, compared after normalization.
export function avoids(name: string, stolen: string[]): boolean {
  const text = normalize(name);
  return !stolen.some((letter) => text.includes(letter));
}

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

// YYYY-MM-DD naming a real day: the pattern alone lets 2026-02-30 through, which Postgres refuses as a 500 (M02 2f, B2).
export function isCalendarDate(v: unknown): v is string {
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
  checkKeys(errors, where, v, ["prompt", "entries", "host_bank", "host_answers", "match_groups"], ["steals"]);
  if ("prompt" in v && !isText(v.prompt)) errors.push(`${where}: "prompt" must be a non-empty string`);
  if ("steals" in v && (typeof v.steals !== "string" || !/^[a-z]$/.test(v.steals))) errors.push(`${where}: "steals" must be one lower-case letter a-z`);
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
  if ("format" in data && data.format !== 2) errors.push(`${file}: "format" must be 2`);
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

function checkQuestionRules(where: string, q: Question): string[] {
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
  // The count varies by question; difficulty is the share of players the answers catch (DECISIONS.md: Game 1).
  if (q.host_answers.length === 0) errors.push(`${where}: has no host answers`);
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
  return [...out, ...checkPuzzle(file, puzzle)];
}

// The content rules for a parsed puzzle, wherever it came from: a file, or a drafted day whose host answers an admin
// changed before approving it (docs/milestones/M06-puzzle-entry.md). `where` prefixes each message.
export function checkPuzzle(where: string, puzzle: Puzzle): string[] {
  const out: string[] = [];
  if (puzzle.questions.length !== QUESTIONS_PER_DAY) {
    out.push(`${where}: has ${puzzle.questions.length} questions, expected ${QUESTIONS_PER_DAY}`);
  }
  puzzle.questions.forEach((q, i) => out.push(...checkQuestionRules(`${where} q${i + 1}`, q)));
  if (puzzle.questions.length === QUESTIONS_PER_DAY) out.push(...checkStolenLetters(where, puzzle));
  return out;
}

// M04 "Rules to build", rule 6: the letters follow schedule A, and stealing them never makes a question pointless
// (a host answer nobody can type adds no danger) or impossible (no safe answer left to type). A host answer's name
// must avoid the stolen letters, not just one of its aliases: "chamomile" passed through "camomile", yet players type
// the name (human, 2026-10-21, M06: "make sure the letter overlap doesnt happen again").
export function checkStolenLetters(file: string, puzzle: Puzzle): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  puzzle.questions.forEach((q, i) => {
    const where = `${file} q${i + 1}`;
    const tier = LETTER_SCHEDULE[i];
    if (tier === null && q.steals) out.push(`${where}: steals "${q.steals}", but schedule A steals nothing at question ${i + 1}`);
    if (tier !== null && !q.steals) out.push(`${where}: schedule A steals a ${tier.replace("_", " ")} letter here, and "steals" is missing`);
    if (tier !== null && q.steals && !LETTER_TIERS[tier].includes(q.steals)) {
      out.push(`${where}: steals "${q.steals}", which is not a ${tier.replace("_", " ")} letter (${LETTER_TIERS[tier]})`);
    }
    if (q.steals && seen.has(q.steals)) out.push(`${where}: steals "${q.steals}", which an earlier question already stole`);
    if (q.steals) seen.add(q.steals);
    const stolen = stolenLetters(puzzle, i);
    if (stolen.length === 0) return;
    const typeable = (e: Entry) => [e.name, ...e.aliases].some((n) => avoids(n, stolen));
    for (const id of q.host_answers) {
      const host = q.entries.find((e) => e.id === id);
      if (host && !avoids(host.name, stolen)) {
        out.push(`${where} entry "${id}": host answer's name "${host.name}" can't be typed without ${stolen.join(", ").toUpperCase()}`);
      }
    }
    const caught = new Set(q.host_answers.flatMap((id) => [id, ...(q.match_groups[id] ?? [])]));
    if (!q.entries.some((e) => !caught.has(e.id) && typeable(e))) {
      out.push(`${where}: no safe answer can be typed without ${stolen.join(", ").toUpperCase()}`);
    }
  });
  return out;
}
