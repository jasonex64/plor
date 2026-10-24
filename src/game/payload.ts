// What the client may see of a puzzle (DECISIONS.md: Game 1, "Server is authoritative"; Answer model).
// Before a question is answered: its prompt and the stolen letters only. The answers stay on the server, since showing
// them was a free hint (human, 2026-10-21). After it is answered: the player's answer and the host answer(s), by the
// things' main names (human, 2026-10-24: the reveal shows the thing's main name).
import { stolenLetters, type ApprovedPuzzle, type Question } from "@/content/puzzle";
import type { Db } from "@/lib/db";

// stolen: the letters the Wind has taken by this question, which the answer box refuses (M04 13c-3).
export type PublicQuestion = { index: number; prompt: string; stolen: string[] };
export type Named = { id: string; name: string };
export type Names = Map<string, string>;

export function publicQuestion(puzzle: ApprovedPuzzle, index: number): PublicQuestion {
  return { index, prompt: puzzle.questions[index].prompt, stolen: stolenLetters(puzzle, index) };
}

// The main names of these things, from the answer database (private.thing_names).
export async function thingNames(db: Db, ids: string[]): Promise<Names> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { rows } = await db.query<{ id: string; name: string }>("select id::text, name from private.thing_names($1::uuid[])", [unique]);
  return new Map(rows.map((r) => [r.id, r.name]));
}

export function hostAnswers(question: Question, names: Names): Named[] {
  return question.host_answers.map((id) => named(names, id));
}

export function named(names: Names, id: string): Named {
  const name = names.get(id);
  // Stored answers and host answers were checked against the base when they were written, and things are never deleted.
  if (name === undefined) throw new Error(`thing ${id} has no name`);
  return { id, name };
}
