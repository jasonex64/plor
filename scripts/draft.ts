// Drafting a day from the question bank and the answer database (DECISIONS.md, Puzzle drafting; M13 13a–13d):
// `npm run draft -- <date> [--questions <id>,…]`, `npm run draft -- simulate` and `npm run draft -- check-bank` (below). It picks the day's 7 questions from content/bank.json (src/content/bank.ts:
// the 30-day gap per category, the date's theme first, never used or least recently used first), or takes the 7 named
// ones in that order; orders picked ones easiest first, moving a question that blocks the letters earlier (13e-3); turns each name into the category's thing (or takes
// "#<thing id>" for one a name can't single out); picks the letters the Wind steals (schedule A) and, for each choice,
// draws each question's host answers at random among its bank answers the host can still say past the letters stolen
// so far (13c; letters first, 13e-2), so 3 familiar answers stay typeable and safe; checks the day; writes
// content/offbeat/<date>.json for the human to approve on /admin/puzzles; and prints the soft guide: each question's
// expected catch rate against its target. The local stack only (13a: "Local only"); thing IDs are the same on every
// database (src/content/thing-id.ts), so the draft holds wherever the same snapshots are loaded. A day holds one
// question per family, a base category and its subsets (13e-4a: "Separate, not same day"); a letter subset's names
// count only when they start with its letter, its host answers' names included (O4), so a day that steals the letter
// at or before it leaves no familiar answer typeable, and the letters skip it ("Yes, the draft skips it").
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type pg from "pg";
import { CATCH_TARGETS, FAMILIAR_SAFE_MIN, HOST_ANSWERS_PER_QUESTION, LETTER_SCHEDULE, LETTER_TIERS } from "../src/config/tunables.ts";
import { easiestFirst, namedQuestions, parseBank, pickQuestions, seed, type Bank, type BankQuestion } from "../src/content/bank.ts";
import { CATEGORIES_FILE, familyOf, parseCategories } from "../src/content/categories.ts";
import { avoids, checkHostNames, checkPuzzle, checkPuzzleFile, isCalendarDate, normalize, parsePuzzle, stolenLetters, type Level, type Puzzle } from "../src/content/puzzle.ts";
import { GAME_ID } from "../src/platform/game.ts";
import { pooledCounts } from "../src/game/ledger.ts";
import { blendedShare, firstGuess } from "../src/game/scoring.ts";
import { localClient } from "./base.ts";

// The host answers for question index: HOST_ANSWERS_PER_QUESTION[index] of the bank, drawn at random but the same for
// a date every time (human, 2026-10-24: "1 1 1 1 2 2 3", "Random from the host bank"). The draft passes only the bank
// answers whose names avoid the letters stolen so far (human, 2026-10-25: "Back to 3 (Recommended)" with letters first).
export function pickHosts(date: string, index: number, bank: string[]): string[] {
  const count = HOST_ANSWERS_PER_QUESTION[index];
  if (bank.length < count) throw new Error(`q${index + 1}: the host bank holds ${bank.length}, and the host names ${count}`);
  let h = seed(`${date}:${index}`);
  const left = [...bank];
  const picked: string[] = [];
  while (picked.length < count) {
    h = (h * 1103515245 + 12345) >>> 0;
    picked.push(...left.splice(h % left.length, 1));
  }
  return picked;
}

// The day with these letters (steals, by question), each question's host answers drawn among its bank answers whose
// names (by thing ID) avoid the letters stolen up to it: letters first (13e-2). null when a question has fewer such
// answers than the host names there.
export function withHosts(date: string, questions: Puzzle["questions"], steals: (string | undefined)[], names: Map<string, string>): Puzzle | null {
  const lettered = questions.map((q, i) => (steals[i] ? { ...q, steals: steals[i] } : q));
  const out: Puzzle["questions"] = [];
  for (const [i, q] of lettered.entries()) {
    const stolen = stolenLetters({ questions: lettered }, i);
    const sayable = q.host_bank.filter((id) => avoids(names.get(id)!, stolen));
    if (sayable.length < HOST_ANSWERS_PER_QUESTION[i]) return null;
    out.push({ ...q, host_answers: pickHosts(date, i, sayable) });
  }
  return { format: 3, game_id: GAME_ID, date, questions: out };
}

// The questions the letters were checking when they stopped: pickLetters checks them a slot at a time, up to the next
// slot's question, so a held of 4 means questions 5 and 6 (indexes 4 and 5), which lose the same letters.
export function blockRange(held: number, count: number): [number, number] {
  const ends = [...LETTER_SCHEDULE.slice(0, count).flatMap((tier, i) => (tier ? [i] : [])).slice(1), count];
  return [held, ends.find((end) => end > held) ?? count];
}

// The questions with the one at index from moved to index to (earlier), the others in order.
export function moveTo<T>(questions: T[], from: number, to: number): T[] {
  const out = [...questions];
  out.splice(to, 0, ...out.splice(from, 1));
  return out;
}

type Letters = { steals: (string | undefined)[] | null; held: number };

// An order of the questions whose letters fit (human, 2026-10-25: "soup can be in the questions 1-6 or wherever it can
// work and just not have it as q7", "Move any blocker earlier (Recommended)"): easiest first as given; if no letters
// fit, each question where the letters stopped, last first, moves to each earlier place, nearest first, until one
// fits. Returns the given order and its result when none does.
export async function fitOrder<T>(questions: T[], tryOrder: (questions: T[]) => Promise<Letters>): Promise<Letters & { questions: T[] }> {
  const first = await tryOrder(questions);
  if (first.steals) return { questions, ...first };
  const [from, to] = blockRange(first.held, questions.length);
  for (let i = to - 1; i >= from; i--) {
    for (let place = i - 1; place >= 0; place--) {
      const next = moveTo(questions, i, place);
      const result = await tryOrder(next);
      if (result.steals) return { questions: next, ...result };
    }
  }
  return { questions, ...first };
}

// The expected share of players finishing a day, from each question's expected catch rate: each must be survived.
export function finishRate(catches: number[]): number {
  return catches.reduce((p, c) => p * (1 - c), 1);
}

// The soft guide in the draft's summary (human, 2026-10-24: "Keep as a soft guide", "Show, never warn
// (Recommended)"): each question's expected catch rate next to its target, and the finish rate next to the targets'.
export function softGuide(catches: number[]): string[] {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return [
    ...catches.map((c, i) => `  q${i + 1}: expected catch ${pct(c)} (target ${pct(CATCH_TARGETS[i])})`),
    `  expected finish ${pct(finishRate(catches))} (the targets': ${pct(finishRate(CATCH_TARGETS))})`,
  ];
}

// The letters for schedule A's slots, tried depth first in a date-seeded order; fits(upTo, steals) says whether the
// questions before upTo hold with those letters. null when no choice fits.
export async function pickLetters(date: string, count: number, fits: (upTo: number, steals: (string | undefined)[]) => Promise<boolean>): Promise<(string | undefined)[] | null> {
  const slots = LETTER_SCHEDULE.slice(0, count).flatMap((tier, i) => (tier ? [{ i, letters: LETTER_TIERS[tier] }] : []));
  const base = seed(date);
  const steals = (chosen: string[]) => Array.from({ length: count }, (_, i) => chosen[slots.findIndex((s) => s.i === i)]);
  async function search(n: number, chosen: string[]): Promise<string[] | null> {
    if (n === slots.length) return chosen;
    const { letters } = slots[n];
    const start = (base + n) % letters.length;
    for (let k = 0; k < letters.length; k++) {
      const letter = letters[(start + k) % letters.length];
      if (chosen.includes(letter)) continue;
      const next = [...chosen, letter];
      const upTo = n + 1 < slots.length ? slots[n + 1].i : count;
      if (!(await fits(upTo, steals(next)))) continue;
      const done = await search(n + 1, next);
      if (done) return done;
    }
    return null;
  }
  const chosen = await search(0, []);
  return chosen ? steals(chosen) : null;
}

// The names (normalized) among texts that don't start with the category's letter, as private.alias_starts decides it, the
// one place the letter rule lives (O4); none for a category that isn't a letter subset.
async function offLetter(db: pg.Client, category: string, texts: string[]): Promise<Set<string>> {
  const { rows } = await db.query<{ t: string }>(
    `select t from unnest($2::text[]) t, private.category c where c.key = $1 and c.starts_with is not null and not private.alias_starts(t, c.starts_with)`,
    [category, texts],
  );
  return new Set(rows.map((r) => r.t));
}

// Each name's candidates among the category's members: "#<id>" as given (a retired ID read as its thing's current one,
// 13e-5b), else the members bearing that name (for a letter subset, a name starting with its letter). The one way a
// bank answer is matched, for the draft and for check-bank.
async function nameCandidates(db: pg.Client, category: string, names: string[]): Promise<Map<string, { id: string; name: string }[]>> {
  const named = names.filter((n) => !n.startsWith("#")).map(normalize);
  const off = await offLetter(db, category, named);
  const texts = named.filter((t) => !off.has(t));
  const { rows } = await db.query<{ alias: string; id: string; name: string }>(
    `select a.alias, m::text as id, t.name from private.category_members($1) m
     join private.thing_alias a on a.thing_id = m join private.thing t on t.id = m where a.alias = any($2) and a.removed_at is null`,
    [category, texts],
  );
  const { rows: given } = await db.query<{ given: string; id: string; name: string }>(
    `select x::text as given, t.id::text as id, t.name from unnest($2::uuid[]) as x join private.thing t on t.id = private.thing_now(x)
     where t.id in (select private.category_members($1))`,
    [category, names.filter((n) => n.startsWith("#")).map((n) => n.slice(1))],
  );
  const out = new Map<string, { id: string; name: string }[]>();
  for (const name of names) {
    const found = name.startsWith("#") ? given.filter((g) => g.given === name.slice(1)) : rows.filter((r) => r.alias === normalize(name));
    out.set(name, [...new Map(found.map((r) => [r.id, r.name])).entries()].map(([id, n]) => ({ id, name: n })));
  }
  return out;
}

// Each name's thing among the category's members. Throws, listing the candidates, for a name with none or several.
async function resolveNames(db: pg.Client, category: string, names: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const [name, found] of await nameCandidates(db, category, names)) {
    if (found.length !== 1) throw new Error(`${category}: ${nameProblem(name, found)}`);
    out.set(name, found[0].id);
  }
  return out;
}

function nameProblem(name: string, found: { id: string; name: string }[]): string {
  if (name.startsWith("#")) return `${name} is not a member`;
  return `"${name}" names ${found.length === 0 ? "no member" : `several members: ${found.map((f) => `${f.name} #${f.id}`).join(", ")}`}`;
}

// The bank's answers against the loaded base (13e-9; ROADMAP, From 13e-3: the list checks as a command, run by hand
// for each batch since 13e-6): each answer must give one member as the draft reads it, and no two answers of one
// question may name the same thing (13e-8 review: "xylophone" and "marimba").
export async function bankProblems(db: pg.Client, questions: BankQuestion[]): Promise<string[]> {
  const problems: string[] = [];
  for (const q of questions) {
    const answers = [...q.host_bank, ...q.uncommon];
    const candidates = await nameCandidates(db, q.category, answers);
    const seen = new Map<string, string>();
    for (const name of answers) {
      const found = candidates.get(name)!;
      if (found.length !== 1) {
        problems.push(`${q.id}: ${nameProblem(name, found)}`);
        continue;
      }
      const other = seen.get(found[0].id);
      if (other) problems.push(`${q.id}: "${other}" and "${name}" name the same thing`);
      seen.set(found[0].id, name);
    }
  }
  return problems;
}

// A category's members, listed once per connection: a draft can't change them (only loads and misses add members),
// and the letter search asks for them many times, which took seconds a time for a big subset (13e-4b: 7,605
// endangered animals; the 40-day simulator ran over 35 minutes).
const memberLists = new WeakMap<pg.Client, Map<string, Promise<Set<string>>>>();
function membersOf(db: pg.Client, category: string): Promise<Set<string>> {
  let lists = memberLists.get(db);
  if (!lists) memberLists.set(db, (lists = new Map()));
  let members = lists.get(category);
  if (!members) {
    members = db.query<{ id: string }>("select m::text as id from private.category_members($1) m", [category]).then((r) => new Set(r.rows.map((x) => x.id)));
    lists.set(category, members);
  }
  return members;
}

// What the host catches: the host answers and every member under them.
async function caughtMembers(db: pg.Client, category: string, hosts: string[]): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    "select id::text from private.descendants_now($1::uuid[]) as id",
    [hosts],
  );
  const members = await membersOf(db, category);
  return rows.map((r) => r.id).filter((id) => members.has(id));
}

// Whether at least FAMILIAR_SAFE_MIN familiar members (in levels) the host doesn't catch can be typed without the
// letters (human, 2026-10-24: "Typeable and safe (Recommended)"; private.approve_puzzle checks the same), a letter
// subset's names only when they start with its letter.
export async function familiarLeft(db: pg.Client, category: string, hosts: string[], levels: Record<string, Level>, stolen: string[]): Promise<boolean> {
  const caught = new Set(await caughtMembers(db, category, hosts));
  const members = await membersOf(db, category);
  const { rows } = await db.query<{ id: string }>(
    `select distinct m::text as id from unnest($2::uuid[]) m join private.thing_alias a on a.thing_id = m
     cross join (select starts_with from private.category where key = $1) c
     where a.removed_at is null and ($3::text is null or a.alias !~ $3)
       and (c.starts_with is null or private.alias_starts(a.alias, c.starts_with))`,
    [category, Object.keys(levels).filter((id) => members.has(id)), stolen.length ? `[${stolen.join("")}]` : null],
  );
  return rows.filter((r) => !caught.has(r.id)).length >= FAMILIAR_SAFE_MIN;
}

type Question = Puzzle["questions"][number];

// The expected share of players some host answers catch: the blended share (the first guess with the category's pooled
// past days, as the provisional bonus sees them) of every member the host catches.
async function catchRate(db: pg.Client, date: string, q: Question, hosts: string[]): Promise<number> {
  const question = { ...q, host_answers: hosts, root: "", member_of: null, members: (await membersOf(db, q.category)).size };
  const counts = (await pooledCounts(db, { format: 3, game_id: GAME_ID, date, approved_at: "", questions: [question] }, false)).get(0);
  const caught = await caughtMembers(db, q.category, hosts);
  return caught.reduce((sum, id) => sum + (counts ? blendedShare(firstGuess(question, id), counts.byEntry.get(id) ?? 0, counts.answered) : firstGuess(question, id)), 0);
}

// Each question's expected catch rate with its host answers, for the soft guide.
async function expectedCatches(db: pg.Client, day: Puzzle): Promise<number[]> {
  const catches = [];
  for (const q of day.questions) catches.push(await catchRate(db, day.date, q, q.host_answers));
  return catches;
}

// A bank question as the day will hold it, before its host answers are drawn: its host bank and levels as thing IDs.
async function resolveQuestion(db: pg.Client, q: BankQuestion): Promise<Question> {
  const ids = await resolveNames(db, q.category, [...new Set([...q.host_bank, ...q.uncommon])]);
  const levels: Record<string, Level> = {};
  for (const n of q.uncommon) levels[ids.get(n)!] = "uncommon";
  for (const n of q.host_bank) levels[ids.get(n)!] = "common";
  return { prompt: q.prompt, category: q.category, host_bank: q.host_bank.map((n) => ids.get(n)!), host_answers: [], levels };
}

// The order measure ("Easiest first (Recommended)"): the expected catch rate of one host answer, averaged over the
// question's host bank, so every question is measured alike before its position decides how many the host names.
export async function oneHostCatch(db: pg.Client, date: string, q: Question): Promise<number> {
  let sum = 0;
  for (const id of q.host_bank) sum += await catchRate(db, date, q, [id]);
  return sum / q.host_bank.length;
}

// days: every drafted day, for the gap. family: a category's family (src/content/categories.ts). ids: the 7 bank
// questions to use, in order, instead of the pick.
export async function draft(db: pg.Client, bank: Bank, days: Puzzle[], date: string, family: (key: string) => string, ids?: string[]): Promise<{ day: Puzzle; guide: string[] }> {
  const chosen = ids ? namedQuestions(bank, days, date, ids, family) : pickQuestions(bank, days, date, family);
  const resolved: { q: Question; catch: number }[] = [];
  for (const q of chosen) {
    const question = await resolveQuestion(db, q);
    resolved.push({ q: question, catch: ids ? 0 : await oneHostCatch(db, date, question) });
  }
  const ordered = (ids ? resolved : easiestFirst(resolved, (r) => r.catch)).map(({ q }) => q);
  const { rows } = await db.query<{ id: string; name: string }>("select id::text, name from private.thing where id = any($1::uuid[])", [
    ordered.flatMap((q) => q.host_bank),
  ]);
  const names = new Map(rows.map((r) => [r.id, r.name]));
  // The host says a letter subset's answers by their names, so each must start with the letter (O4).
  for (const q of ordered) {
    const off = await offLetter(db, q.category, q.host_bank.map((id) => normalize(names.get(id)!)));
    const named = q.host_bank.filter((id) => off.has(normalize(names.get(id)!)));
    if (named.length) throw new Error(`${q.category}: host bank names ${named.map((id) => `"${names.get(id)}"`).join(", ")} don't start with its letter`);
  }
  // Letters for one order of the questions, and how far they got: questions before held fit with some choice, so the
  // block is at or after it.
  const tryOrder = async (questions: Question[]) => {
    let held = 0;
    const steals = await pickLetters(date, questions.length, async (upTo, trial) => {
      const part = withHosts(date, questions.slice(0, upTo), trial, names);
      if (!part) return false;
      for (let i = 0; i < upTo; i++) {
        const q = part.questions[i];
        if (!(await familiarLeft(db, q.category, q.host_answers, q.levels, stolenLetters(part, i)))) return false;
      }
      held = Math.max(held, upTo);
      return true;
    });
    return { steals, held };
  };
  // A hand-picked day keeps the order it was given; a picked one may move its blocking question earlier.
  const { questions, steals, held } = ids ? { questions: ordered, ...(await tryOrder(ordered)) } : await fitOrder(ordered, tryOrder);
  if (!steals) {
    const [from, to] = blockRange(held, questions.length);
    const at = questions.slice(from, to).map((q) => `"${q.prompt}"`).join(" or ");
    throw new Error(`no letters fit schedule A for ${date}: ${held ? `questions 1 to ${held} hold` : "no question holds"}; the block is at ${at} or after it${ids ? "" : ", in every place earlier tried"}. Change that question's bank or uncommon answers`);
  }
  const day = withHosts(date, questions, steals, names)!;
  const problems = [...checkPuzzle(date, day), ...checkHostNames(date, day, names)];
  if (problems.length) throw new Error(`the drafted day breaks the rules:\n${problems.join("\n")}`);
  return { day, guide: softGuide(await expectedCatches(db, day)) };
}

// The simulator, `npm run draft -- simulate`: draft() for SIMULATE_DAYS dates SIMULATE_STEP days apart from
// SIMULATE_FROM, the drafted days on disk as the only past days, writing no files. Its values are the ones 13e-2 to
// 13e-4 ran by hand, so the counts compare (13e-4 Evidence: 39 of 40); it was rewritten by hand three times before it
// became this command (CLAUDE.md, repeated procedures; 13e-5).
const SIMULATE_DAYS = 40;
const SIMULATE_STEP = 3;
const SIMULATE_FROM = "2027-01-01";

export function simulateDates(): string[] {
  const from = Date.parse(`${SIMULATE_FROM}T00:00:00Z`);
  return Array.from({ length: SIMULATE_DAYS }, (_, i) => new Date(from + i * SIMULATE_STEP * 86_400_000).toISOString().slice(0, 10));
}

async function simulate(db: pg.Client, bank: Bank, days: Puzzle[], family: (key: string) => string): Promise<void> {
  let drafted = 0;
  let questions = 0;
  let subset = 0;
  // A day that doesn't draft is what the simulator measures: each is printed with its reason, and any one makes the
  // command exit 1.
  for (const date of simulateDates()) {
    try {
      const { day } = await draft(db, bank, days, date, family);
      drafted++;
      questions += day.questions.length;
      subset += day.questions.filter((q) => family(q.category) !== q.category).length;
      console.log(`${date} ${day.questions.map((q) => (q.steals ? `${q.category}:${q.steals}` : q.category)).join(" ")}`);
    } catch (err) {
      console.log(`${date} FAILED: ${(err as Error).message}`);
    }
  }
  console.log(`DRAFTED ${drafted} of ${SIMULATE_DAYS}; subset questions ${subset} of ${questions}`);
  if (drafted < SIMULATE_DAYS) process.exitCode = 1;
}

// `npm run draft -- check-bank`: prints each of bankProblems' problems, and exits 1 on any.
async function checkBank(db: pg.Client, bank: Bank): Promise<void> {
  const problems = await bankProblems(db, bank.questions);
  for (const p of problems) console.log(p);
  console.log(`CHECKED ${bank.questions.length} questions: ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
  if (problems.length) process.exitCode = 1;
}

async function main(): Promise<void> {
  const [date, flag, list] = process.argv.slice(2);
  const simulating = date === "simulate" && flag === undefined;
  const checking = date === "check-bank" && flag === undefined;
  // The date is user input: a malformed one would make every gap NaN and let any category through (13d review).
  if (!simulating && !checking && (!isCalendarDate(date) || (flag !== undefined && (flag !== "--questions" || !list)))) {
    console.error("usage: npm run draft -- <date> [--questions <id>,…]\n       npm run draft -- simulate\n       npm run draft -- check-bank");
    process.exit(2);
  }
  const { bank, errors } = parseBank("bank.json", readFileSync(join("content", "bank.json"), "utf8"));
  if (!bank) throw new Error(errors.join("\n"));
  const dir = join("content", GAME_ID);
  const days = readdirSync(dir).filter((n) => n.endsWith(".json")).map((n) => {
    const file = `${GAME_ID}/${n}`;
    const text = readFileSync(join(dir, n), "utf8");
    const problems = checkPuzzleFile(file, text);
    if (problems.length) throw new Error(problems.join("\n"));
    return parsePuzzle(file, text).puzzle!;
  });
  const { categories, errors: categoryErrors } = parseCategories(CATEGORIES_FILE, readFileSync(CATEGORIES_FILE, "utf8"));
  if (!categories) throw new Error(categoryErrors.join("\n"));
  const db = await localClient();
  try {
    if (simulating) return await simulate(db, bank, days, familyOf(categories));
    if (checking) return await checkBank(db, bank);
    const { day, guide } = await draft(db, bank, days, date, familyOf(categories), list?.split(","));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${day.date}.json`), `${JSON.stringify(day, null, 2)}\n`);
    console.log(`DRAFTED ${dir}/${day.date}.json: letters ${day.questions.map((q, i) => (q.steals ? `Q${i + 1} ${q.steals.toUpperCase()}` : null)).filter(Boolean).join(", ")}`);
    console.log(guide.join("\n"));
  } finally {
    await db.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
