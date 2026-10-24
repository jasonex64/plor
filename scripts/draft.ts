// Drafting a day from the answer database (docs/milestones/M13-13a-the-base.md; DECISIONS.md, Puzzle drafting):
// `npm run draft -- <spec.json>`. A Claude session writes the spec: the date, and per question its prompt, category,
// host bank, host answers and uncommon answers, by name. This script turns each name into the category's thing (or
// takes "#<thing id>" for one a name can't single out), picks the letters the Wind steals (schedule A), checks the day,
// and writes content/offbeat/<date>.json for the human to approve on /admin/puzzles. The local stack only (13a: "Local
// only"); thing IDs are the same on every database (src/content/thing-id.ts), so the draft holds wherever the same
// snapshots are loaded.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type pg from "pg";
import { LETTER_SCHEDULE, LETTER_TIERS } from "../src/config/tunables.ts";
import { GAME_ID, checkHostNames, checkPuzzle, normalize, stolenLetters, type Level, type Puzzle } from "../src/content/puzzle.ts";
import { localClient } from "./base.ts";

type SpecQuestion = { prompt: string; category: string; host_bank: string[]; host_answers: string[]; uncommon?: string[] };
type Spec = { date: string; questions: SpecQuestion[] };

// A small stable hash of the date, so the letter order differs from day to day but not from run to run (as the
// format-2 picker did).
function seed(text: string): number {
  return [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
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
     join private.thing_alias a on a.thing_id = m join private.thing t on t.id = m where a.alias = any($2)`,
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

// Whether a member the host doesn't catch (not a host answer, nor under one) can be typed without the letters.
async function safeAnswerLeft(db: pg.Client, category: string, hosts: string[], stolen: string[]): Promise<boolean> {
  const { rows } = await db.query<{ ok: boolean }>(
    `with recursive caught (id) as (
       select unnest($2::uuid[])
       union
       select f.thing_id from private.fact f join caught c on f.value_thing = c.id where f.trait = 'kind_of'
     )
     select exists (select from private.category_members($1) m join private.thing_alias a on a.thing_id = m
                    where m not in (select id from caught) and ($3::text is null or a.alias !~ $3)) as ok`,
    [category, hosts, stolen.length ? `[${stolen.join("")}]` : null],
  );
  return rows[0].ok;
}

export async function draft(db: pg.Client, spec: Spec): Promise<Puzzle> {
  const questions: Puzzle["questions"] = [];
  for (const q of spec.questions) {
    const ids = await resolveNames(db, q.category, [...new Set([...q.host_bank, ...q.host_answers, ...(q.uncommon ?? [])])]);
    const levels: Record<string, Level> = {};
    for (const n of q.uncommon ?? []) levels[ids.get(n)!] = "uncommon";
    for (const n of q.host_bank) levels[ids.get(n)!] = "common";
    questions.push({ prompt: q.prompt, category: q.category, host_bank: q.host_bank.map((n) => ids.get(n)!), host_answers: q.host_answers.map((n) => ids.get(n)!), levels });
  }
  const unlettered: Puzzle = { format: 3, game_id: GAME_ID, date: spec.date, questions };
  const { rows } = await db.query<{ id: string; name: string }>("select id::text, name from private.thing where id = any($1::uuid[])", [
    questions.flatMap((q) => q.host_answers),
  ]);
  const names = new Map(rows.map((r) => [r.id, r.name]));
  const withSteals = (steals: (string | undefined)[]): Puzzle => ({
    ...unlettered,
    questions: questions.map((q, i) => (steals[i] ? { ...q, steals: steals[i] } : q)),
  });
  const steals = await pickLetters(spec.date, questions.length, async (upTo, trial) => {
    const day = withSteals(trial);
    const part = { ...day, questions: day.questions.slice(0, upTo) };
    if (checkHostNames("", part, names).length) return false;
    for (let i = 0; i < upTo; i++) {
      if (!(await safeAnswerLeft(db, part.questions[i].category, part.questions[i].host_answers, stolenLetters(part, i)))) return false;
    }
    return true;
  });
  if (!steals) throw new Error(`no letters fit schedule A for ${spec.date}`);
  const day = withSteals(steals);
  const problems = [...checkPuzzle(spec.date, day), ...checkHostNames(spec.date, day, names)];
  if (problems.length) throw new Error(`the drafted day breaks the rules:\n${problems.join("\n")}`);
  return day;
}

async function main(): Promise<void> {
  const [path] = process.argv.slice(2);
  if (!path) {
    console.error("usage: npm run draft -- <spec.json>");
    process.exit(2);
  }
  const spec = JSON.parse(readFileSync(path, "utf8")) as Spec;
  const db = await localClient();
  try {
    const day = await draft(db, spec);
    const dir = join("content", GAME_ID);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${day.date}.json`), `${JSON.stringify(day, null, 2)}\n`);
    console.log(`DRAFTED ${dir}/${day.date}.json: letters ${day.questions.map((q, i) => (q.steals ? `Q${i + 1} ${q.steals.toUpperCase()}` : null)).filter(Boolean).join(", ")}`);
  } finally {
    await db.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
