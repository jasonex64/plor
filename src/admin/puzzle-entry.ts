// Puzzle entry's pure step (docs/milestones/M06-puzzle-entry.md): a day drafted from the question bank into
// content/offbeat/<date>.json (DECISIONS.md: Puzzle drafting; M13 13d) is reviewed on the admin page, where the human
// may change the drawn host answers before approving it.
import type { Puzzle } from "@/content/puzzle";

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
