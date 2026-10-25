// The question bank as the admin page shows it (docs/milestones/M13-13d-the-question-bank.md; human, 2026-10-24: "Uses
// and catch rate (Recommended)"): each question with the days it ran (the drafted days asking it) and, for days that
// have been played, the share of answers the host caught. Read-only: the bank changes through content/bank.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBank, usesOf } from "@/content/bank";
import { GAME_ID, type Puzzle } from "@/content/puzzle";
import type { Db } from "@/lib/db";

export type BankUse = { date: string; answered: number; catchRate: number | null };
export type BankQuestionView = { id: string; prompt: string; category: string; themes: string[]; addedBy: string; uses: BankUse[] };
export type BankView = { questions: BankQuestionView[]; themes: { date: string; theme: string }[] };

// CI validates the bank, so one that fails here is a bug: it throws. The path is written out in full, as readDrafts
// does, so the build traces the file (next.config.ts).
function readBank() {
  const { bank, errors } = parseBank("bank.json", readFileSync(join(process.cwd(), "content", "bank.json"), "utf8"));
  if (!bank) throw new Error(`content/bank.json is invalid:\n${errors.join("\n")}`);
  return bank;
}

export async function bankView(db: Db, drafts: Map<string, Puzzle>): Promise<BankView> {
  const bank = readBank();
  const days = [...drafts.values()];
  const { rows } = await db.query<{ date: string; question_idx: number; answered: number; caught: number }>(
    `select puzzle_date::text as date, question_idx, count(*)::int as answered, (count(*) filter (where matched))::int as caught
     from private.run_event where game_id = $1 and puzzle_date = any($2::date[]) group by 1, 2`,
    [GAME_ID, days.map((d) => d.date)],
  );
  const questions = bank.questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    category: q.category,
    themes: q.themes,
    addedBy: q.added_by,
    uses: usesOf(q, days).map((date) => {
      const index = drafts.get(date)!.questions.findIndex((x) => x.prompt === q.prompt && x.category === q.category);
      const played = rows.find((r) => r.date === date && r.question_idx === index);
      return { date, answered: played?.answered ?? 0, catchRate: played ? played.caught / played.answered : null };
    }),
  }));
  return { questions, themes: Object.entries(bank.themes).sort().map(([date, theme]) => ({ date, theme })) };
}
