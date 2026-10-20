// How one day's puzzle really played (docs/milestones/M03-puzzle-insights.md). Pure: it is given the day's answers
// and misses, with no user IDs (D4), and returns per-question totals. Difficulty is the share of players a question's
// host answers catch, and it should rise gently through the day (DECISIONS.md: Game 1); there is no stored target,
// so each question is compared with the day's others (D2).
import { normalize, type Puzzle } from "@/content/puzzle";
import { INSIGHTS_MIN_PLAYERS, INSIGHTS_SHAPE_DROP_POINTS, INSIGHTS_TOP_ANSWERS } from "@/config/tunables";
import { hostAnswers, named, type Named } from "@/game/payload";

export type AnswerRow = { question_idx: number; entry_id: string; matched: boolean };
export type MissRow = { question_idx: number; typed: string };

export type QuestionInsights = {
  index: number;
  prompt: string;
  hostAnswers: Named[];
  answered: number;
  caught: number;
  // Share of answers that matched the host, 0..1; null when nobody answered.
  catchRate: number | null;
  tooFew: boolean;
  // Share of answers that were in the host bank, matched or not, 0..1; null when nobody answered.
  hostBankShare: number | null;
  topAnswers: { answer: Named; count: number }[];
  // A question with enough players that catches at least INSIGHTS_SHAPE_DROP_POINTS fewer than an earlier one.
  breaksShape: boolean;
  misses: { text: string; count: number }[];
};

export type DayInsights = { date: string; finished: boolean; questions: QuestionInsights[] };

export function buildInsights(date: string, finished: boolean, puzzle: Puzzle, answers: AnswerRow[], misses: MissRow[]): DayInsights {
  const questions = puzzle.questions.map((question, index): QuestionInsights => {
    const rows = answers.filter((a) => a.question_idx === index);
    const caught = rows.filter((a) => a.matched).length;
    const bank = new Set(question.host_bank);
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.entry_id, (counts.get(row.entry_id) ?? 0) + 1);
    const topAnswers = [...counts]
      .map(([id, count]) => ({ answer: named(question, id), count }))
      .sort((a, b) => b.count - a.count || a.answer.name.localeCompare(b.answer.name))
      .slice(0, INSIGHTS_TOP_ANSWERS);
    return {
      index,
      prompt: question.prompt,
      hostAnswers: hostAnswers(question),
      answered: rows.length,
      caught,
      catchRate: rows.length ? caught / rows.length : null,
      tooFew: rows.length < INSIGHTS_MIN_PLAYERS,
      hostBankShare: rows.length ? rows.filter((a) => bank.has(a.entry_id)).length / rows.length : null,
      topAnswers,
      breaksShape: false,
      misses: groupMisses(misses.filter((m) => m.question_idx === index)),
    };
  });

  // Only questions with enough players are compared; a dip of exactly the threshold counts. The comparison is on
  // whole numbers (cross-multiplied), because in floating point 30% − 20% is 9.999… points.
  questions.forEach((later, j) => {
    if (later.tooFew) return;
    later.breaksShape = questions
      .slice(0, j)
      .some((earlier) => !earlier.tooFew && dropPoints100(earlier, later) >= INSIGHTS_SHAPE_DROP_POINTS * earlier.answered * later.answered);
  });
  return { date, finished, questions };
}

// The drop in catch rate from `earlier` to `later`, in percentage points, times both answer counts.
function dropPoints100(earlier: QuestionInsights, later: QuestionInsights): number {
  return (earlier.caught * later.answered - later.caught * earlier.answered) * 100;
}

// Misses that differ only in case, spacing, punctuation or accents are one miss; it is shown in its most common form.
function groupMisses(rows: MissRow[]): { text: string; count: number }[] {
  const groups = new Map<string, Map<string, number>>();
  for (const { typed } of rows) {
    const key = normalize(typed);
    const forms = groups.get(key) ?? new Map<string, number>();
    forms.set(typed, (forms.get(typed) ?? 0) + 1);
    groups.set(key, forms);
  }
  return [...groups.values()]
    .map((forms) => {
      const [text] = [...forms].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      return { text, count: [...forms.values()].reduce((sum, n) => sum + n, 0) };
    })
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}
