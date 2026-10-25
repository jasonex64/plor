// Drafting a day from the question bank and the answer database (DECISIONS.md, Puzzle drafting; M13 13a–13d):
// `npm run draft -- <date> [--questions <id>,…]`. It picks the day's 7 questions from content/bank.json (src/content/bank.ts:
// the 30-day gap per category, the date's theme first, never used or least recently used first), or takes the 7 named
// ones in that order; orders picked ones easiest first; turns each name into the category's thing (or takes
// "#<thing id>" for one a name can't single out); draws the host answers from each question's bank at random (13c);
// picks the letters the Wind steals (schedule A) so 3 familiar answers stay typeable and safe; checks the day; writes
// content/offbeat/<date>.json for the human to approve on /admin/puzzles; and prints the soft guide: each question's
// expected catch rate against its target. The local stack only (13a: "Local only"); thing IDs are the same on every
// database (src/content/thing-id.ts), so the draft holds wherever the same snapshots are loaded.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type pg from "pg";
import { CATCH_TARGETS, FAMILIAR_SAFE_MIN, HOST_ANSWERS_PER_QUESTION, LETTER_SCHEDULE, LETTER_TIERS } from "../src/config/tunables.ts";
import { easiestFirst, namedQuestions, parseBank, pickQuestions, seed, type Bank, type BankQuestion } from "../src/content/bank.ts";
import { GAME_ID, checkHostNames, checkPuzzle, checkPuzzleFile, isCalendarDate, normalize, parsePuzzle, stolenLetters, type Level, type Puzzle } from "../src/content/puzzle.ts";
import { pooledCounts } from "../src/game/ledger.ts";
import { blendedShare, firstGuess } from "../src/game/scoring.ts";
import { localClient } from "./base.ts";

// The host answers for question index: HOST_ANSWERS_PER_QUESTION[index] of the bank, drawn at random but the same for
// a date every time (human, 2026-10-24: "1 1 1 1 2 2 3", "Random from the host bank").
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

// Each name's thing among the category's members: "#<id>" as given, else the members bearing that name. Throws, listing
// the candidates, for a name with none or several.
async function resolveNames(db: pg.Client, category: string, names: string[]): Promise<Map<string, string>> {
  const texts = names.filter((n) => !n.startsWith("#")).map(normalize);
  const { rows } = await db.query<{ alias: string; id: string; name: string }>(
    `select a.alias, m::text as id, t.name from private.category_members($1) m
     join private.thing_alias a on a.thing_id = m join private.thing t on t.id = m where a.alias = any($2) and a.removed_at is null`,
    [category, texts],
  );
  const { rows: given } = await db.query<{ id: string }>("select m::text as id from private.category_members($1) m where m = any($2::uuid[])", [
    category,
    names.filter((n) => n.startsWith("#")).map((n) => n.slice(1)),
  ]);
  const out = new Map<string, string>();
  for (const name of names) {
    if (name.startsWith("#")) {
      if (!given.some((g) => g.id === name.slice(1))) throw new Error(`${category}: ${name} is not a member`);
      out.set(name, name.slice(1));
      continue;
    }
    const found = [...new Map(rows.filter((r) => r.alias === normalize(name)).map((r) => [r.id, r.name])).entries()];
    if (found.length !== 1) {
      throw new Error(`${category}: "${name}" names ${found.length === 0 ? "no member" : `several members: ${found.map(([id, n]) => `${n} #${id}`).join(", ")}`}`);
    }
    out.set(name, found[0][0]);
  }
  return out;
}

// What the host catches: the host answers and every member under them.
async function caughtMembers(db: pg.Client, category: string, hosts: string[]): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `with recursive caught (id) as (
       select unnest($2::uuid[])
       union
       select f.thing_id from private.fact f join caught c on f.value_thing = c.id where f.trait = 'kind_of' and f.removed_at is null
     )
     select m::text as id from private.category_members($1) m where m in (select id from caught)`,
    [category, hosts],
  );
  return rows.map((r) => r.id);
}

// Whether at least FAMILIAR_SAFE_MIN familiar members (in levels) the host doesn't catch can be typed without the
// letters (human, 2026-10-24: "Typeable and safe (Recommended)"; private.approve_puzzle checks the same).
export async function familiarLeft(db: pg.Client, category: string, hosts: string[], levels: Record<string, Level>, stolen: string[]): Promise<boolean> {
  const caught = new Set(await caughtMembers(db, category, hosts));
  const { rows } = await db.query<{ id: string }>(
    `select distinct m::text as id from private.category_members($1) m join private.thing_alias a on a.thing_id = m
     where m = any($2::uuid[]) and a.removed_at is null and ($3::text is null or a.alias !~ $3)`,
    [category, Object.keys(levels), stolen.length ? `[${stolen.join("")}]` : null],
  );
  return rows.filter((r) => !caught.has(r.id)).length >= FAMILIAR_SAFE_MIN;
}

type Question = Puzzle["questions"][number];

// The expected share of players some host answers catch: the blended share (the first guess with the category's pooled
// past days, as the provisional bonus sees them) of every member the host catches.
async function catchRate(db: pg.Client, date: string, q: Question, hosts: string[]): Promise<number> {
  const { rows } = await db.query<{ n: number }>("select count(*)::int as n from private.category_members($1)", [q.category]);
  const question = { ...q, host_answers: hosts, root: "", member_of: null, members: rows[0].n };
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

// days: every drafted day, for the gap. ids: the 7 bank questions to use, in order, instead of the pick.
export async function draft(db: pg.Client, bank: Bank, days: Puzzle[], date: string, ids?: string[]): Promise<{ day: Puzzle; guide: string[] }> {
  const chosen = ids ? namedQuestions(bank, days, date, ids) : pickQuestions(bank, days, date);
  const resolved: { q: Question; catch: number }[] = [];
  for (const q of chosen) {
    const question = await resolveQuestion(db, q);
    resolved.push({ q: question, catch: ids ? 0 : await oneHostCatch(db, date, question) });
  }
  const ordered = ids ? resolved : easiestFirst(resolved, (r) => r.catch);
  const questions = ordered.map(({ q }, i) => ({ ...q, host_answers: pickHosts(date, i, q.host_bank) }));
  const unlettered: Puzzle = { format: 3, game_id: GAME_ID, date, questions };
  const { rows } = await db.query<{ id: string; name: string }>("select id::text, name from private.thing where id = any($1::uuid[])", [
    questions.flatMap((q) => q.host_answers),
  ]);
  const names = new Map(rows.map((r) => [r.id, r.name]));
  const withSteals = (steals: (string | undefined)[]): Puzzle => ({
    ...unlettered,
    questions: questions.map((q, i) => (steals[i] ? { ...q, steals: steals[i] } : q)),
  });
  // The furthest the letters got: questions before it held with some choice, so the block is at or after it.
  let held = 0;
  const steals = await pickLetters(date, questions.length, async (upTo, trial) => {
    const day = withSteals(trial);
    const part = { ...day, questions: day.questions.slice(0, upTo) };
    if (checkHostNames("", part, names).length) return false;
    for (let i = 0; i < upTo; i++) {
      const q = part.questions[i];
      if (!(await familiarLeft(db, q.category, q.host_answers, q.levels, stolenLetters(part, i)))) return false;
    }
    held = Math.max(held, upTo);
    return true;
  });
  if (!steals) {
    const at = questions[held];
    throw new Error(`no letters fit schedule A for ${date}: ${held ? `questions 1 to ${held} hold` : "no question holds"}; the block is at question ${held + 1} ("${at.prompt}", hosts drawn ${at.host_answers.map((id) => names.get(id) ?? id).join(", ")}) or after it. Change that question's bank or uncommon answers`);
  }
  const day = withSteals(steals);
  const problems = [...checkPuzzle(date, day), ...checkHostNames(date, day, names)];
  if (problems.length) throw new Error(`the drafted day breaks the rules:\n${problems.join("\n")}`);
  return { day, guide: softGuide(await expectedCatches(db, day)) };
}

async function main(): Promise<void> {
  const [date, flag, list] = process.argv.slice(2);
  // The date is user input: a malformed one would make every gap NaN and let any category through (13d review).
  if (!isCalendarDate(date) || (flag !== undefined && (flag !== "--questions" || !list))) {
    console.error("usage: npm run draft -- <date> [--questions <id>,…]");
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
  const db = await localClient();
  try {
    const { day, guide } = await draft(db, bank, days, date, list?.split(","));
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
