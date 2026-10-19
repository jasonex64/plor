// What the client may see of a puzzle (DECISIONS.md: Game 1, "Server is authoritative"; Answer model).
// Before a question is answered: its prompt and the accepted bank only, in an order that ignores the host bank,
// so nothing marks a host answer. After it is answered: the host answer(s) too.
import type { Entry, Puzzle, Question } from "@/content/puzzle";

export type PublicEntry = { id: string; name: string; aliases: string[] };
export type PublicQuestion = { index: number; prompt: string; entries: PublicEntry[] };
export type Named = { id: string; name: string };

export function publicQuestion(puzzle: Puzzle, index: number): PublicQuestion {
  const question = puzzle.questions[index];
  const entries = question.entries
    .map(({ id, name, aliases }) => ({ id, name, aliases }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { index, prompt: question.prompt, entries };
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
