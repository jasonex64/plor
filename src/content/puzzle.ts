// Puzzle content format 3 and its validator (DECISIONS.md: Puzzle content format, Answer model; M00-data-design.md
// §4; docs/milestones/M13-13a-the-base.md, "13a-2 and 13a-3"). A day names each question's category in the answer
// database instead of listing its answers; the server resolves typed text against the base as of the day's approval
// (src/game/matching.ts). Hand-written checks, no schema library (human, 2026-10-18). The server imports this same
// module, so content is checked one way.
import { HOST_ANSWERS_PER_QUESTION, LETTER_SCHEDULE, LETTER_TIERS, QUESTIONS_PER_DAY } from "../config/tunables.ts";

// Permanent: stored with every run and ledger row (DECISIONS.md: Game 1).
export const GAME_ID = "offbeat";

// The drafting session's first guess at how many players give an answer (M13 D5). Members it doesn't name are rare.
export type Level = "common" | "uncommon";

// Thing IDs are the answer database's permanent IDs (M13 D3).
export type Question = {
  prompt: string;
  // The category key (private.category) whose members the question accepts.
  category: string;
  // The few most common answers, which the provisional bonus treats as the common tier (M09 D11 b) until 13c.
  host_bank: string[];
  host_answers: string[];
  levels: Record<string, Level>;
  // The letter the Wind steals at this question (M04 13c-3). It stays gone for the rest of the run.
  steals?: string;
};
export type Puzzle = { format: 3; game_id: typeof GAME_ID; date: string; questions: Question[] };

// What private.approve_puzzle stores: the moment answers are resolved as of, and per question the category's root
// and member_of as approved, its member count, and a subset's filter as `where` (M13 13e-4a, A1; DECISIONS.md,
// Puzzle content format).
export type Where = { trait: string; values: string[]; via?: "country" } | { number: "population"; at_least: number } | { starts_with: string };
export type ApprovedQuestion = Question & { root: string; member_of: string | null; members: number; where?: Where };
export type ApprovedPuzzle = Omit<Puzzle, "questions"> & { questions: ApprovedQuestion[]; approved_at: string };

// The letters gone by question `index`: every letter stolen at it or before it.
export function stolenLetters(puzzle: Pick<Puzzle, "questions">, index: number): string[] {
  return puzzle.questions.slice(0, index + 1).flatMap((q) => (q.steals ? [q.steals] : []));
}

// Whether a name can be typed without the stolen letters, compared after normalization.
export function avoids(name: string, stolen: string[]): boolean {
  const text = normalize(name);
  return !stolen.some((letter) => text.includes(letter));
}

// Normalization of names and typed text (human-approved format, 2026-10-18; SOURCES.md: Unicode normalization).
// Lowercase first: lowercasing can produce combining marks (e.g. U+0130), which NFKD + \p{M} then remove.
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    // Format characters (\p{Cf}, e.g. a zero-width space pasted with a name) are dropped (ROADMAP Next revision, M13).
    .replace(/\p{Cf}/gu, "")
    .replace(/\p{P}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --- shape (the file is untrusted input from disk) ---

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function checkKeys(errors: string[], where: string, obj: Record<string, unknown>, required: string[], optional: string[] = []) {
  for (const key of required) if (!(key in obj)) errors.push(`${where}: missing "${key}"`);
  for (const key of Object.keys(obj)) {
    if (!required.includes(key) && !optional.includes(key)) errors.push(`${where}: unknown field "${key}"`);
  }
}

export function isText(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

// A category key, as private.category's check holds it.
export const CATEGORY_KEY = /^[a-z][a-z_]*$/;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function isThingIdList(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((id) => typeof id === "string" && UUID.test(id));
}

// YYYY-MM-DD naming a real day: the pattern alone lets 2026-02-30 through, which Postgres refuses as a 500 (M02 2f, B2).
export function isCalendarDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function checkQuestion(errors: string[], where: string, v: unknown) {
  if (!isObject(v)) {
    errors.push(`${where}: must be an object`);
    return;
  }
  checkKeys(errors, where, v, ["prompt", "category", "host_bank", "host_answers", "levels"], ["steals"]);
  if ("prompt" in v && !isText(v.prompt)) errors.push(`${where}: "prompt" must be a non-empty string`);
  if ("category" in v && (typeof v.category !== "string" || !CATEGORY_KEY.test(v.category))) {
    errors.push(`${where}: "category" must be a category key (lower-case letters and _)`);
  }
  if ("steals" in v && (typeof v.steals !== "string" || !/^[a-z]$/.test(v.steals))) errors.push(`${where}: "steals" must be one lower-case letter a-z`);
  for (const key of ["host_bank", "host_answers"]) {
    if (key in v && !isThingIdList(v[key])) errors.push(`${where}: "${key}" must be a list of thing IDs`);
  }
  if ("levels" in v) {
    const levels = v.levels;
    if (!isObject(levels) || !Object.entries(levels).every(([id, level]) => UUID.test(id) && (level === "common" || level === "uncommon"))) {
      errors.push(`${where}: "levels" must map thing IDs to "common" or "uncommon"`);
    }
  }
}

// Shape only: types, required and unknown fields. The rules between fields are checked in checkPuzzle; membership in
// the base, when the day is approved (private.approve_puzzle).
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
  if ("format" in data && data.format !== 3) errors.push(`${file}: "format" must be 3`);
  if ("game_id" in data && data.game_id !== GAME_ID) errors.push(`${file}: "game_id" must be "${GAME_ID}"`);
  if ("date" in data && !isCalendarDate(data.date)) errors.push(`${file}: "date" must be a calendar date YYYY-MM-DD`);
  if ("questions" in data) {
    if (!Array.isArray(data.questions)) errors.push(`${file}: "questions" must be a list`);
    else data.questions.forEach((q, i) => checkQuestion(errors, `${file} q${i + 1}`, q));
  }
  return errors.length ? { puzzle: null, errors } : { puzzle: data as Puzzle, errors: [] };
}

// --- rules between fields ---

function duplicates(ids: string[]): string[] {
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
}

// hosts: how many host answers the question's position takes (HOST_ANSWERS_PER_QUESTION), undefined past the 7th.
function checkQuestionRules(where: string, q: Question, hosts: number | undefined): string[] {
  const errors: string[] = [];
  for (const id of duplicates(q.host_bank)) errors.push(`${where} thing "${id}": listed twice in host_bank`);
  if (hosts !== undefined && q.host_answers.length !== hosts) errors.push(`${where}: has ${q.host_answers.length} host answers, expected ${hosts}`);
  for (const id of duplicates(q.host_answers)) errors.push(`${where} thing "${id}": listed twice in host_answers`);
  const bank = new Set(q.host_bank);
  for (const id of q.host_answers) {
    if (!bank.has(id)) errors.push(`${where} thing "${id}": host answer is not in host_bank`);
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
  puzzle.questions.forEach((q, i) => out.push(...checkQuestionRules(`${where} q${i + 1}`, q, HOST_ANSWERS_PER_QUESTION[i])));
  if (puzzle.questions.length === QUESTIONS_PER_DAY) out.push(...checkSchedule(where, puzzle));
  return out;
}

// A host answer's main name must avoid every letter stolen at or before its question, or it adds no danger; an alias
// that avoids them doesn't count, since players type the name (human, 2026-10-21, M06: "make sure the letter overlap
// doesnt happen again"). names: the host answers' main names from the base (src/game/payload.ts, thingNames).
export function checkHostNames(where: string, puzzle: Puzzle, names: Map<string, string>): string[] {
  return puzzle.questions.flatMap((q, i) => {
    const stolen = stolenLetters(puzzle, i);
    return q.host_answers.flatMap((id) => {
      const name = names.get(id);
      if (name === undefined) return [`${where} q${i + 1} thing "${id}": host answer is not in the answer database`];
      return avoids(name, stolen) ? [] : [`${where} q${i + 1} thing "${id}": host answer's name "${name}" can't be typed without ${stolen.join(", ").toUpperCase()}`];
    });
  });
}

// M04 "Rules to build", rule 6: the letters follow schedule A, each letter once. That a host answer can be typed
// past them, and a safe answer is left, needs the base: the approve route and private.approve_puzzle check it.
export function checkSchedule(file: string, puzzle: Puzzle): string[] {
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
  });
  return out;
}
