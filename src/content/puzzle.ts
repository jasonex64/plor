// Puzzle content format 4, a day on a clock, and its validator (DECISIONS.md: Puzzle content format, Answer model;
// M00-data-design.md §4; docs/milestones/M13-13a-the-base.md, "13a-2 and 13a-3"). A day names each question's category in the
// answer database instead of listing its answers; the server resolves typed text against the base as of the day's approval
// (src/game/matching.ts). Hand-written checks, no schema library (human, 2026-10-18). The server imports this same module,
// so content is checked one way.
import { GAME_ID } from "../platform/game.ts";
import { QUESTIONS_PER_CLOCK_DAY, RARE_PER_CLOCK_QUESTION } from "../config/tunables.ts";

// The drafting session's first guess at how many players give an answer (M13 D5). Members it doesn't name are rare.
export type Level = "common" | "uncommon";
// An answer's tier: its level, and rare for every member the levels don't name.
export type Tier = Level | "rare";
export const tierOf = (levels: Record<string, Level>, id: string): Tier => levels[id] ?? "rare";

// Thing IDs are the answer database's permanent IDs (M13 D3).
// A day on a clock (format 4; docs/milestones/M23-23c-the-run-on-a-clock.md), as the run reads it once approved: three
// questions, each with its category, root and tiers (`levels`: common or uncommon by answer, rare for every other
// member). The stored day also holds approved_at, which only SQL reads, so it is left out here.
// rare: RARE_PER_CLOCK_QUESTION rare answers in an order picked when the day is drafted, which the result shows first
// to last, skipping the ones the player gave (answers 48 and 49: no granted function lists a category's members for a
// player). size: the list's count of answers when drafted, for the result's "and N more" (docs/milestones/M23-23d-the-screens.md,
// "Found 2026-11-25").
export type ClockQuestion = {
  prompt: string;
  category: string;
  root: string;
  member_of: string | null;
  levels: Record<string, Level>;
  rare: string[];
  size: number;
};
export const CLOCK_FORMAT = 4; // docs/milestones/M23-23c-the-run-on-a-clock.md, Design (a day is on a clock by its format)
export type ClockPuzzle = { format: typeof CLOCK_FORMAT; game_id: typeof GAME_ID; date: string; questions: ClockQuestion[] };
// A day as it is drafted (docs/milestones/M23-23e-drafting-and-approving.md, 23e-1), in content/offbeat/<date>.json and in the
// approve request's building: as the run reads it, but for the root and member_of, which approval adds (private.build_puzzle).
export type ClockDraftQuestion = Omit<ClockQuestion, "root" | "member_of">;
export type ClockDraft = { format: typeof CLOCK_FORMAT; game_id: typeof GAME_ID; date: string; questions: ClockDraftQuestion[] };

// Normalization of names and typed text (human-approved format, 2026-10-18; SOURCES.md: Unicode normalization).
// Lowercase first: lowercasing can produce combining marks (e.g. U+0130), which NFKD + \p{M} then remove.
// Latin letters NFKD leaves whole, folded to what a player types on a plain keyboard, so "lodz" is "Łódź" and the typo
// rule needn't reach them (M13 13f-1, from 13a-2's review): the ones the base's names hold (2026-10-27).
const FOLDED: Record<string, string> = { ł: "l", ı: "i", ß: "ss", đ: "d", ø: "o", æ: "ae", œ: "oe", þ: "th", ð: "d", ħ: "h" };

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[łıßđøæœþðħ]/g, (c) => FOLDED[c])
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
  return !Number.isNaN(d.getTime()) && d.toISOString().split("T")[0] === v;
}

function duplicates(ids: string[]): string[] {
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
}

// The rules a day holds its questions to, for the result (docs/milestones/M23-23d-the-screens.md, "Found
// 2026-11-25"): `rare` is exactly RARE_PER_CLOCK_QUESTION thing IDs with no repeat and none a key of `levels`, and `size` is a
// positive integer. `where` prefixes each message.
export function checkClockPuzzle(where: string, puzzle: Pick<ClockDraft, "questions">): string[] {
  return puzzle.questions.flatMap((q, i) => {
    const at = `${where} q${i + 1}`;
    const out: string[] = [];
    const bag = q as Partial<ClockQuestion>;
    if (!("rare" in bag)) out.push(`${at}: missing "rare"`);
    else if (!isThingIdList(bag.rare) || bag.rare.length !== RARE_PER_CLOCK_QUESTION) out.push(`${at}: "rare" must be ${RARE_PER_CLOCK_QUESTION} thing IDs`);
    else {
      for (const id of duplicates(bag.rare)) out.push(`${at} thing "${id}": listed twice in rare`);
      for (const id of bag.rare) if (id in q.levels) out.push(`${at} thing "${id}": rare, but it is in levels`);
    }
    if (!("size" in bag)) out.push(`${at}: missing "size"`);
    else if (!Number.isInteger(bag.size) || bag.size! < 1) out.push(`${at}: "size" must be a positive integer`);
    return out;
  });
}

// --- a drafted day ---

function checkClockQuestion(errors: string[], where: string, v: unknown) {
  if (!isObject(v)) {
    errors.push(`${where}: must be an object`);
    return;
  }
  checkKeys(errors, where, v, ["prompt", "category", "levels", "rare", "size"]);
  if ("prompt" in v && !isText(v.prompt)) errors.push(`${where}: "prompt" must be a non-empty string`);
  if ("category" in v && (typeof v.category !== "string" || !CATEGORY_KEY.test(v.category))) {
    errors.push(`${where}: "category" must be a category key (lower-case letters and _)`);
  }
  if ("levels" in v) {
    const levels = v.levels;
    if (!isObject(levels) || !Object.entries(levels).every(([id, level]) => UUID.test(id) && (level === "common" || level === "uncommon"))) {
      errors.push(`${where}: "levels" must map thing IDs to "common" or "uncommon"`);
    }
  }
  if ("rare" in v && !isThingIdList(v.rare)) errors.push(`${where}: "rare" must be a list of thing IDs`);
}

// Shape only: the rules between fields are checkClockDay's. The file is untrusted input from disk.
export function parseClockDraft(file: string, text: string): { puzzle: ClockDraft; errors: [] } | { puzzle: null; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { puzzle: null, errors: [`${file}: not valid JSON (${(err as Error).message})`] };
  }
  if (!isObject(data)) return { puzzle: null, errors: [`${file}: must be a JSON object`] };
  const errors: string[] = [];
  checkKeys(errors, file, data, ["format", "game_id", "date", "questions"]);
  if ("format" in data && data.format !== CLOCK_FORMAT) errors.push(`${file}: "format" must be ${CLOCK_FORMAT}`);
  if ("game_id" in data && data.game_id !== GAME_ID) errors.push(`${file}: "game_id" must be "${GAME_ID}"`);
  if ("date" in data && !isCalendarDate(data.date)) errors.push(`${file}: "date" must be a calendar date YYYY-MM-DD`);
  if ("questions" in data) {
    if (!Array.isArray(data.questions)) errors.push(`${file}: "questions" must be a list`);
    else data.questions.forEach((q, i) => checkClockQuestion(errors, `${file} q${i + 1}`, q));
  }
  return errors.length ? { puzzle: null, errors } : { puzzle: data as ClockDraft, errors: [] };
}

// The rules a drafted day holds, wherever it came from (a file, or the approval page's changes): three
// questions of three different lists, each with a wording, and checkClockPuzzle's rules. Whether a list is a researched
// one is the caller's to say, as it knows the lists. `where` prefixes each message.
export function checkClockDay(where: string, day: ClockDraft): string[] {
  const out: string[] = [];
  if (day.questions.length !== QUESTIONS_PER_CLOCK_DAY) out.push(`${where}: has ${day.questions.length} questions, expected ${QUESTIONS_PER_CLOCK_DAY}`);
  day.questions.forEach((q, i) => {
    if (!isText(q.prompt)) out.push(`${where} q${i + 1}: the wording is empty`);
    const first = day.questions.findIndex((x) => x.category === q.category);
    if (first !== i) out.push(`${where} q${i + 1}: "${q.category}" is asked by q${first + 1} too`);
  });
  return [...out, ...checkClockPuzzle(where, day)];
}

// A drafted day's file, checked: `file` is `<game_id>/<date>.json`, the path being the day's identity, so two files can never
// claim the same day (human, 2026-10-18).
export function checkDraftFile(file: string, text: string): string[] {
  const { puzzle, errors } = parseClockDraft(file, text);
  if (!puzzle) return errors;
  const expected = `${puzzle.game_id}/${puzzle.date}.json`;
  return [...(file === expected ? [] : [`${file}: path must be ${expected} to match its game_id and date`]), ...checkClockDay(file, puzzle)];
}
