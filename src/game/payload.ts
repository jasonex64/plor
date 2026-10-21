// What the client may see of a puzzle (DECISIONS.md: Game 1, "Server is authoritative"; Answer model).
// Before a question is answered: its prompt only. The answer list stays on the server, since showing it was a
// free hint (human, 2026-10-21). After it is answered: the player's entry and the host answer(s).
import type { Entry, Puzzle, Question } from "@/content/puzzle";

export type PublicQuestion = { index: number; prompt: string };
export type Named = { id: string; name: string };

export function publicQuestion(puzzle: Puzzle, index: number): PublicQuestion {
  return { index, prompt: puzzle.questions[index].prompt };
}

export function hostAnswers(question: Question): Named[] {
  return question.host_answers.map((id) => named(question, id));
}

export function named(question: Question, entryId: string): Named {
  const entry: Entry | undefined = question.entries.find((e) => e.id === entryId);
  // Stored answers were checked against this content when they were inserted, and a started puzzle can't change.
  if (!entry) throw new Error(`entry ${entryId} is not in "${question.prompt}"`);
  return { id: entry.id, name: entry.name };
}
