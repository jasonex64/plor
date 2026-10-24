// Puzzle fixtures for the database tests: the fixture day (src/test/answer-fixture.ts) on the local stack, and answers
// a player can type. Shared by the run and board tests.
import { GAME_ID, avoids, stolenLetters, type ApprovedPuzzle } from "@/content/puzzle";
import { getPool } from "@/lib/db";
import { FIXTURE, FIXTURE_ALIASES, FIXTURE_NAMES, fixtureDay, fixtureId, isFixtureDay, loadFixtureBase } from "./answer-fixture";

const created: string[] = [];
let approvedAt: string | null = null;

// Loads the fixture base once per test file; every fixture day is approved as of then.
export async function ensureFixtureBase(): Promise<void> {
  approvedAt ??= await loadFixtureBase(getPool());
}

// The fixture day under a date. ensureFixtureBase must have run.
export function fixture(date: string): ApprovedPuzzle {
  if (!approvedAt) throw new Error("fixture(): call ensureFixtureBase() first");
  return fixtureDay(date, approvedAt);
}

// Uses the fixture day already published for a date, or adds it (removed again by removeCreatedPuzzles). A real day
// under that date is refused: the tests would play it, and the helpers below know only the fixture's names.
export async function ensurePuzzle(date: string): Promise<ApprovedPuzzle> {
  await ensureFixtureBase();
  const db = getPool();
  const { rows } = await db.query<{ content: ApprovedPuzzle }>("select content from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, date]);
  if (rows.length) {
    if (!isFixtureDay(rows[0].content)) throw new Error(`${date} has a real puzzle; the database tests need it free for the fixture day`);
    return rows[0].content;
  }
  await db.query("insert into private.puzzle (game_id, puzzle_date, content) values ($1, $2::date, $3)", [GAME_ID, date, fixture(date)]);
  created.push(date);
  return fixture(date);
}

// Run after the runs that use them are deleted (a run references its puzzle).
export async function removeCreatedPuzzles(): Promise<void> {
  for (const date of created.splice(0)) {
    await getPool().query("delete from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, date]);
  }
}

// A thing's main name in the fixture.
export function nameOf(thingId: string): string {
  const name = FIXTURE_NAMES.get(thingId);
  if (!name) throw new Error(`${thingId} is not a fixture thing`);
  return name;
}

// A name of the thing that a player can type at that question, past the stolen letters (M04 13c-3).
export function typeableName(p: ApprovedPuzzle, index: number, thingId: string): string | undefined {
  return (FIXTURE_ALIASES.get(thingId) ?? []).find((n) => avoids(n, stolenLetters(p, index)));
}

// The question's first host answer, by a name a player can type.
export function hostName(p: ApprovedPuzzle, index: number): string {
  const name = typeableName(p, index, p.questions[index].host_answers[0]);
  if (!name) throw new Error(`the host answer of "${p.questions[index].prompt}" can't be typed`);
  return name;
}

// The things of the question's category, in the fixture's order, that the host doesn't catch (not a host answer, not
// under one) and that can be typed at that question.
export function safeEntries(p: ApprovedPuzzle, index: number): string[] {
  const caught = new Set(p.questions[index].host_answers);
  return [...FIXTURE_NAMES.keys()].filter(
    (thingId) => fixtureQuestionOf(thingId) === index && !caught.has(thingId) && typeableName(p, index, thingId) && !isUnderHost(thingId, index),
  );
}

export function safeEntry(p: ApprovedPuzzle, index: number): string {
  const [id] = safeEntries(p, index);
  if (!id) throw new Error(`no safe answer for "${p.questions[index].prompt}"`);
  return id;
}


function fixtureQuestionOf(thingId: string): number {
  return FIXTURE.findIndex((q, i) => Object.keys(q.members).some((slug) => fixtureId(i, slug) === thingId));
}

function isUnderHost(thingId: string, index: number): boolean {
  const q = FIXTURE[index];
  let slug = Object.keys(q.members).find((s) => fixtureId(index, s) === thingId);
  while (slug) {
    if (q.host.includes(slug)) return true;
    slug = q.members[slug].under;
  }
  return false;
}
