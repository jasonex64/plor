// Settling runs into the points ledger (docs/milestones/M09-points-and-leaderboard.md, D3, D9, D10; M00-data-design.md
// §6): a run gets its one row once it's finished and its day is closed, with the ladder and the final rarity bonus.
// A day closes at its midnight Pacific; nothing is scheduled. The leaderboard settles the players it shows just before
// it sums, which is also how runs from before M09 get their rows.
// Relative imports with extensions: scripts/draft.ts runs this module on plain Node, which knows no "@/" paths.
import { GAME_ID, type ApprovedPuzzle } from "../content/puzzle.ts";
import type { Db } from "@/lib/db";
import { scoreRun, type DayCounts, type ScoredEvent } from "./scoring.ts";

type EventRow = { user_id: string; date: string; question_idx: number; entry_id: string; matched: boolean; in_day: boolean };

// Writes the missing rows for these players' finished runs on closed days, and returns how many it wrote. Settling
// again writes nothing. The final bonus counts only answers given before the day's midnight, so it doesn't depend on
// when this runs. day: the day it settles before, when the caller reads its day once for several reads
// (src/game/me.ts, getMe); otherwise today.
export async function settleRuns(db: Db, userIds: string[], day: string | null = null): Promise<number> {
  const { rows: runs } = await db.query<{ user_id: string; date: string }>(
    `select s.user_id::text, s.puzzle_date::text as date
     from private.run_status s
     where s.user_id = any($1::uuid[]) and s.game_id = $2 and s.puzzle_date < coalesce($3::date, private.today())
       and s.status in ('died', 'survived', 'timed_out')
       and not exists (select from private.points_ledger l
                       where l.user_id = s.user_id and l.game_id = s.game_id and l.puzzle_date = s.puzzle_date)`,
    [userIds, GAME_ID, day],
  );
  if (runs.length === 0) return 0;
  const dates = [...new Set(runs.map((r) => r.date))];

  const { rows: puzzles } = await db.query<{ date: string; content: ApprovedPuzzle }>(
    "select puzzle_date::text as date, content from private.puzzle where game_id = $1 and puzzle_date = any($2::date[])",
    [GAME_ID, dates],
  );
  const { rows: events } = await db.query<EventRow>(
    `select e.user_id::text, e.puzzle_date::text as date, e.question_idx, e.entry_id, e.matched,
            private.day_of(e.created_at) = e.puzzle_date as in_day
     from private.run_event e
     join unnest($2::uuid[], $3::date[]) as r(user_id, puzzle_date) on r.user_id = e.user_id and r.puzzle_date = e.puzzle_date
     where e.game_id = $1
     order by e.question_idx`,
    [GAME_ID, runs.map((r) => r.user_id), runs.map((r) => r.date)],
  );

  const countsByDate = new Map<string, DayCounts>();
  for (const { date, content } of puzzles) countsByDate.set(date, await pooledCounts(db, content, true));
  const scored = runs.map((r) => {
    const puzzle = puzzles.find((p) => p.date === r.date)!.content;
    const own: ScoredEvent[] = events
      .filter((e) => e.user_id === r.user_id && e.date === r.date)
      .map((e) => ({ index: e.question_idx, entryId: e.entry_id, matched: e.matched, inDay: e.in_day }));
    const { ladder, bonus } = scoreRun(puzzle, own, countsByDate.get(r.date)!);
    return { ...r, points: ladder + bonus, bonus };
  });
  const { rowCount } = await db.query(
    `insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus)
     select r.user_id, $1, r.puzzle_date, r.points, r.bonus
     from unnest($2::uuid[], $3::date[], $4::int[], $5::int[]) as r(user_id, puzzle_date, points, bonus)
     on conflict (user_id, game_id, puzzle_date) do nothing`,
    [GAME_ID, scored.map((s) => s.user_id), scored.map((s) => s.date), scored.map((s) => s.points), scored.map((s) => s.bonus)],
  );
  return rowCount!;
}

// The answers the bonus pools for each of a day's questions (M13 D5: per category, all history equal): every answer
// given before its day's midnight (M09 D8) to a question of the same category, on the category's days before this one,
// and on this one too when withDay (the final bonus). The provisional bonus leaves this day out, so it holds all day
// (human, 2026-10-24: "Past days only (Recommended)"; docs/milestones/M13-13c-rarity-and-the-host.md).
export async function pooledCounts(db: Db, puzzle: ApprovedPuzzle, withDay: boolean): Promise<DayCounts> {
  const categories = puzzle.questions.map((q) => q.category);
  const { rows } = await db.query<{ category: string; entry_id: string; n: number }>(
    `select p.content -> 'questions' -> e.question_idx ->> 'category' as category, e.entry_id, count(*)::int as n
     from private.run_event e
     join private.puzzle p on p.game_id = e.game_id and p.puzzle_date = e.puzzle_date
     where e.game_id = $1 and p.content ->> 'format' = '3' and private.day_of(e.created_at) = e.puzzle_date
       and (e.puzzle_date < $2::date or ($3 and e.puzzle_date = $2::date))
       and p.content -> 'questions' -> e.question_idx ->> 'category' = any($4::text[])
     group by 1, 2`,
    [GAME_ID, puzzle.date, withDay, categories],
  );
  const byCategory = new Map<string, { answered: number; byEntry: Map<string, number> }>();
  for (const r of rows) {
    const pooled = byCategory.get(r.category) ?? { answered: 0, byEntry: new Map<string, number>() };
    pooled.answered += r.n;
    pooled.byEntry.set(r.entry_id, r.n);
    byCategory.set(r.category, pooled);
  }
  return new Map(categories.flatMap((c, i) => (byCategory.has(c) ? [[i, byCategory.get(c)!] as const] : [])));
}

// Every player's answers on these days before their midnight, by question and entry: the shares on the result screen
// (docs/milestones/M11-home-screen.md, H5). Today's grow until midnight.
export async function dayCounts(db: Db, dates: string[]): Promise<Map<string, DayCounts>> {
  const { rows: tallies } = await db.query<{ date: string; question_idx: number; entry_id: string; n: number }>(
    `select puzzle_date::text as date, question_idx, entry_id, count(*)::int as n
     from private.run_event
     where game_id = $1 and puzzle_date = any($2::date[]) and private.day_of(created_at) = puzzle_date
     group by puzzle_date, question_idx, entry_id`,
    [GAME_ID, dates],
  );
  const counts = new Map<string, DayCounts>(dates.map((date) => [date, new Map()]));
  for (const t of tallies) {
    const day = counts.get(t.date)!;
    const question = day.get(t.question_idx) ?? { answered: 0, byEntry: new Map<string, number>() };
    question.answered += t.n;
    question.byEntry.set(t.entry_id, t.n);
    day.set(t.question_idx, question);
  }
  return counts;
}

// A player's all-time points: the sum of their ledger rows, once their finished runs on closed days are settled
// (docs/milestones/M12-account.md, 12a; ROADMAP "Design review", 2). Today's run counts once the day closes (M09 D9).
export async function allTimePoints(db: Db, userId: string, day: string | null = null): Promise<number> {
  await settleRuns(db, [userId], day);
  const { rows } = await db.query<{ total: number }>(
    "select coalesce(sum(points), 0)::int as total from private.points_ledger where user_id = $1 and game_id = $2",
    [userId, GAME_ID],
  );
  return rows[0].total;
}
