// The question bank as the admin page shows it (docs/milestones/M13-13d-the-question-bank.md; human, 2026-10-24: "Uses
// and catch rate (Recommended)"): each question with the days it ran (the drafted days asking it) and, for days that
// have been played, the share of answers the host caught, as the insights report counts it (M03, dayInsights).
// Read-only: the bank changes through content/bank.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBank, usesOf, type Bank } from "@/content/bank";
import { GAME_ID, type Puzzle } from "@/content/puzzle";
import { dayInsights } from "@/insights/queries";
import type { Db } from "@/lib/db";

// day: where the use's date stands against private.today(), so the page can say a future day is scheduled and today's
// has no answers yet (docs/milestones/M14-14b-2c-review-items.md, answer 18).
export type BankUse = { date: string; day: "past" | "today" | "future"; answered: number; catchRate: number | null };
export type BankQuestionView = { id: string; prompt: string; category: string; themes: string[]; addedBy: string; uses: BankUse[] };
export type BankView = { questions: BankQuestionView[]; themes: { date: string; theme: string }[] };

// CI validates the bank, so one that fails here is a bug: it throws. The path is written out in full, as readDrafts
// does, so the build traces the file (next.config.ts).
export function readBank(): Bank {
  const { bank, errors } = parseBank("bank.json", readFileSync(join(process.cwd(), "content", "bank.json"), "utf8"));
  if (!bank) throw new Error(`content/bank.json is invalid:\n${errors.join("\n")}`);
  return bank;
}

// drafts: the drafted days, by date. A day counts as played once its approved puzzle has started.
export async function bankView(db: Db, bank: Bank, drafts: Map<string, Puzzle>): Promise<BankView> {
  const days = [...drafts.values()];
  const { rows: started } = await db.query<{ date: string | null; today: string }>(
    `select p.puzzle_date::text as date, t.today from (select private.today()::text as today) t
     left join private.puzzle p on p.game_id = $1 and p.puzzle_date <= private.today() and p.puzzle_date = any($2::date[])`,
    [GAME_ID, days.map((d) => d.date)],
  );
  // One row with today even when no day has started. Dates are "YYYY-MM-DD", so they compare as text.
  const today = started[0].today;
  const insights = new Map<string, Awaited<ReturnType<typeof dayInsights>>>();
  for (const { date } of started) if (date !== null) insights.set(date, await dayInsights(db, date));
  const questions = bank.questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    category: q.category,
    themes: q.themes,
    addedBy: q.added_by,
    uses: usesOf(q, days).map((date) => {
      const index = drafts.get(date)!.questions.findIndex((x) => x.prompt === q.prompt && x.category === q.category);
      const played = insights.get(date)?.questions[index];
      const day = date < today ? "past" : date === today ? "today" : "future";
      return { date, day, answered: played?.answered ?? 0, catchRate: played?.catchRate ?? null } satisfies BankUse;
    }),
  }));
  return { questions, themes: Object.entries(bank.themes).sort().map(([date, theme]) => ({ date, theme })) };
}
