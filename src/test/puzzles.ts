// Puzzle fixtures for the database tests: today's (or any day's) puzzle on the local stack, and answers a player can
// type. Shared by the run and board tests.
import { readFileSync } from "node:fs";
import { GAME_ID, avoids, stolenLetters, type Puzzle } from "@/content/puzzle";
import { matchAnswer } from "@/game/matching";
import { getPool } from "@/lib/db";

const created: string[] = [];

// A real puzzle file under another date: its content is valid format 2 and has QUESTIONS_PER_DAY questions.
export function fixture(date: string): Puzzle {
  return { ...JSON.parse(readFileSync("content/offbeat/2026-10-26.json", "utf8")), date };
}

// Uses the puzzle already published for a day, or adds the fixture (removed again by removeCreatedPuzzles).
export async function ensurePuzzle(date: string): Promise<Puzzle> {
  const db = getPool();
  const { rows } = await db.query<{ content: Puzzle }>("select content from private.puzzle where game_id = $1 and puzzle_date = $2::date", [GAME_ID, date]);
  if (rows.length) return rows[0].content;
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

// A name or alias of the entry that a player can type at that question, past the stolen letters (M04 13c-3).
export function typeableName(p: Puzzle, index: number, entryId: string): string | undefined {
  const entry = p.questions[index].entries.find((e) => e.id === entryId)!;
  return [entry.name, ...entry.aliases].find((n) => avoids(n, stolenLetters(p, index)));
}

// An entry the host doesn't catch, that can be typed at that question.
export function safeEntry(p: Puzzle, index: number): string {
  const q = p.questions[index];
  const id = q.entries.map((e) => e.id).find((entryId) => matchAnswer(q, entryId) === "not_matched" && typeableName(p, index, entryId));
  if (!id) throw new Error(`no safe answer for "${q.prompt}"`);
  return id;
}
