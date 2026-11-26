// A day on a clock, built from the researched lists, and the choice of which lists it asks (docs/milestones/M23-23e-drafting-
// and-approving.md, 23e-1; the human's answers 48 to 50, 54 to 57 in M23-offbeat-on-a-clock.md). One function builds a day, so
// the draft, the approval page's preview and the approve route all hold the same thing. Pure and relative-imported (the draft
// script uses it too): the lists, the admin's edits and the days already used come in as arguments.
import { createHash } from "node:crypto";
import { QUESTIONS_PER_CLOCK_DAY, RARE_PER_CLOCK_QUESTION } from "../config/tunables.ts";
import { GAME_ID } from "../platform/game.ts";
import { daysApart, seed } from "./bank.ts";
import { formsOf, type ListEdit } from "./list-edits.ts";
import { answerId, type ResearchList } from "./list.ts";
import { CLOCK_FORMAT, checkClockDay, normalize, type ClockDraft, type ClockDraftQuestion, type Level } from "./puzzle.ts";

// What the admin chose for one question: its list, a wording of their own, and how many times they re-rolled its six.
export type ClockPick = { category: string; wording?: string; reroll: number };
// What a day is built from: every researched list, the admin's edits to them that no load has folded into the files yet
// (private.list_edit), and each list's wording (the bank's, by category).
export type ClockSource = { lists: ResearchList[]; edits: ListEdit[]; prompts: Map<string, string> };

// A list's answers as a day holds them. The answers struck on the Lists page are left out, as a load ends them. An answer
// added there and not yet in the file counts in `size`, but is not drawn as an example: its thing is made when it is added
// and replaced by the file's line when the file holds it, so its ID would not last (src/content/list-edits.ts).
export type ClockAnswers = { levels: Record<string, Level>; rare: { id: string; name: string }[]; size: number };

export function listAnswers(list: ResearchList, edits: ListEdit[]): ClockAnswers {
  const mine = edits.filter((e) => e.category === list.category);
  const struck = new Set(mine.filter((e) => e.kind === "strike").map((e) => normalize(e.name)));
  const standing = list.answers.filter((a) => !formsOf(a).some((form) => struck.has(form)));
  const added = new Set(mine.filter((e) => e.kind === "add" && !list.answers.some((a) => formsOf(a).includes(normalize(e.name)))).map((e) => normalize(e.name)));
  const levels: Record<string, Level> = {};
  const rare: ClockAnswers["rare"] = [];
  for (const a of standing) {
    const id = answerId(list.category, a.name);
    if (a.tier === "rare") rare.push({ id, name: a.name });
    else levels[id] = a.tier;
  }
  return { levels, rare, size: standing.length + added.size };
}

// The answers a question shows as rare examples: RARE_PER_CLOCK_QUESTION of the pool, ranked by a hash of the date, the list
// and the re-roll count, so the same for them every time and another six for another count. The list, not the question's
// place in the day, is in the hash, so moving a question up or down keeps its six.
function drawRare(date: string, category: string, reroll: number, pool: ClockAnswers["rare"]): ClockAnswers["rare"] {
  if (pool.length < RARE_PER_CLOCK_QUESTION) throw new Error(`${category} has ${pool.length} rare answers, and a day on a clock needs ${RARE_PER_CLOCK_QUESTION}`);
  const key = (id: string) => createHash("sha256").update(`${date}:${category}:${reroll}:${id}`).digest("hex");
  return pool
    .map((a) => ({ a, key: key(a.id) }))
    .sort((x, y) => x.key.localeCompare(y.key))
    .slice(0, RARE_PER_CLOCK_QUESTION)
    .map((x) => x.a);
}

// The day for these picks, with the names of each question's six (as the lists write them) for the page. A list that is not a
// researched one, or has too few rare answers, throws: the callers say so to the admin. Whether the day is a good one (three
// questions, three lists, a wording) is checkClockDay's.
export function buildClockDay(date: string, picks: ClockPick[], source: ClockSource): { day: ClockDraft; examples: string[][] } {
  const built = picks.map((pick) => {
    const list = source.lists.find((l) => l.category === pick.category);
    if (!list) throw new Error(`"${pick.category}" is not a researched list`);
    const { levels, rare, size } = listAnswers(list, source.edits);
    const six = drawRare(date, pick.category, pick.reroll, rare);
    const prompt = pick.wording ?? source.prompts.get(pick.category);
    if (prompt === undefined) throw new Error(`the bank has no question for ${pick.category}`);
    const question: ClockDraftQuestion = { prompt, category: pick.category, levels, rare: six.map((a) => a.id), size };
    return { question, names: six.map((a) => a.name) };
  });
  return { day: { format: CLOCK_FORMAT, game_id: GAME_ID, date, questions: built.map((b) => b.question) }, examples: built.map((b) => b.names) };
}

// The day for these picks, or what is wrong with it: a list that is not a researched one, one without enough rare answers, and
// what checkClockDay finds (three questions of three lists, a wording, the rest). Each problem names its question as "q1".
export function buildChecked(date: string, picks: ClockPick[], source: ClockSource): { built: { day: ClockDraft; examples: string[][] } } | { problems: string[] } {
  const unknown = picks.flatMap((p, i) => (source.lists.some((l) => l.category === p.category) ? [] : [`${date} q${i + 1}: "${p.category}" is not a researched list`]));
  if (unknown.length) return { problems: unknown };
  let built: ReturnType<typeof buildClockDay>;
  try {
    built = buildClockDay(date, picks, source);
  } catch (err) {
    return { problems: [`${date}: ${(err as Error).message}`] };
  }
  const problems = checkClockDay(date, built.day);
  return problems.length ? { problems } : { built };
}

// A day on which questions were asked, as the choice reads it: a drafted file's or an approved day's.
export type UseDay = { date: string; questions: { category: string }[] };
export type ListUse = { category: string; last: string | null };

// Every list, longest unused first (answer 50: "Least recently used, random"): a list never asked first, then by the latest day
// it was asked, ties in an order seeded by the date as the bank's pick breaks them. The date's own day is left out, as a
// redraft replaces it.
export function rankLists(date: string, categories: string[], days: UseDay[]): ListUse[] {
  const others = days.filter((d) => d.date !== date);
  return categories
    .map((category) => ({ category, last: others.filter((d) => d.questions.some((q) => q.category === category)).map((d) => d.date).sort().at(-1) ?? null, tie: seed(`${date}:${category}`) }))
    .sort((a, b) => (a.last ?? "").localeCompare(b.last ?? "") || a.tie - b.tie)
    .map(({ category, last }) => ({ category, last }));
}

// The lists a day asks: the QUESTIONS_PER_CLOCK_DAY longest unused, leaving out `skip` (the ones a redraft has already shown).
export function pickLists(date: string, categories: string[], days: UseDay[], skip: string[] = []): ListUse[] {
  return rankLists(date, categories.filter((c) => !skip.includes(c)), days).slice(0, QUESTIONS_PER_CLOCK_DAY);
}

// When a list was last asked, for the draft's summary and the swap menu (answers 54 and 55). A day after the date is said as
// "in N days": the draft may be made before a later day's.
export function whenText(date: string, last: string | null): string {
  if (last === null) return "never";
  const ago = Math.round(daysApart(date, last)) * (last < date ? 1 : -1);
  const n = Math.abs(ago);
  return `${ago > 0 ? "" : "in "}${n} ${n === 1 ? "day" : "days"}${ago > 0 ? " ago" : ""}`;
}

// The approved days of the game, for the choice's last use (answer 54: the draft reads both these and the drafted files).
export async function approvedDays(db: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }): Promise<UseDay[]> {
  const { rows } = await db.query(
    `select puzzle_date::text as date, array(select q ->> 'category' from jsonb_array_elements(content -> 'questions') as q) as categories
     from private.puzzle where game_id = $1`,
    [GAME_ID],
  );
  return rows.map((r) => ({ date: r.date as string, questions: (r.categories as string[]).map((category) => ({ category })) }));
}
