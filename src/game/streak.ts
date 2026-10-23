// The player's streak of days played (docs/milestones/M11-home-screen.md, H4; ROADMAP "Design review", 4): days in a
// row on which they started a run, finished or not. It counts back from today once they've played today, else from
// yesterday, so it doesn't drop to 0 each morning before they play. A day with no approved puzzle couldn't be played,
// so it neither counts nor breaks the streak (puzzles are approved by hand: DECISIONS.md, Puzzle approval).
import { GAME_ID } from "@/content/puzzle";
import type { Db } from "@/lib/db";

export async function getStreak(db: Db, userId: string): Promise<number> {
  const { rows } = await db.query<{ streak: number }>(
    `with days as (
       select p.puzzle_date as d,
              exists (select from private.run r where r.user_id = $1 and r.game_id = $2 and r.puzzle_date = p.puzzle_date) as played
       from private.puzzle p
       where p.game_id = $2 and p.puzzle_date <= private.today()
     )
     select count(*)::int as streak from days
     where played and d > coalesce((select max(d) from days where not played and d < private.today()), '-infinity'::date)`,
    [userId, GAME_ID],
  );
  return rows[0].streak;
}
