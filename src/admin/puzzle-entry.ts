// Puzzle entry's pure steps (docs/milestones/M06-puzzle-entry.md): the human types a day's questions, a Claude
// session drafts the answers into content/offbeat/<date>.json (DECISIONS.md: Puzzle drafting), and the human may
// change the suggested host answers before approving the day.
import { QUESTIONS_PER_DAY } from "@/config/tunables";
import type { Puzzle } from "@/content/puzzle";

// The questions as typed on the admin page: exactly QUESTIONS_PER_DAY pieces of text, trimmed, none empty.
// Returns null for anything else; the route turns that into a 400.
export function readQuestions(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length !== QUESTIONS_PER_DAY) return null;
  const prompts = input.map((q) => (typeof q === "string" ? q.trim() : ""));
  return prompts.every((q) => q.length > 0) ? prompts : null;
}

// What "Copy for Claude" puts on the clipboard: everything a session needs to draft the day.
export function copyForClaude(date: string, prompts: string[]): string {
  return [
    `Offbeat questions for ${date}:`,
    ...prompts.map((q, i) => `${i + 1}. ${q}`),
    "",
    "Draft this day: follow the Puzzle drafting steps in docs/DECISIONS.md.",
  ].join("\n");
}

// The drafted day with the host answers the admin chose, one list per question. Each chosen answer joins the host
// bank, because the rules require host answers to be in it (DECISIONS.md: Answer model). Whether the result is a valid
// day is for checkPuzzle to say, so a bad choice is reported like any other content error.
export function withHostAnswers(draft: Puzzle, hostAnswers: string[][]): Puzzle {
  if (hostAnswers.length !== draft.questions.length) {
    throw new Error(`expected ${draft.questions.length} host answer lists, got ${hostAnswers.length}`);
  }
  return {
    ...draft,
    questions: draft.questions.map((q, i) => ({
      ...q,
      host_answers: hostAnswers[i],
      host_bank: [...q.host_bank, ...hostAnswers[i].filter((id) => !q.host_bank.includes(id))],
    })),
  };
}
