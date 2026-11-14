// The player's streak of days played (docs/milestones/M11-home-screen.md, H4; ROADMAP "Design review", 4): days in a
// row on which they started a run, finished or not, in either game (docs/milestones/M16-16f-the-shared-pieces.md,
// 16f-1; human, 2026-11-13: "One shared streak", "Started counts", "Play what's there"). It counts back from today once
// they've played today, else from yesterday, so it doesn't drop to 0 each morning before they play. A day with no
// approved puzzle in either game couldn't be played, so it neither counts nor breaks the streak (puzzles are approved
// by hand: DECISIONS.md, Puzzle approval); a day with one in only one game needs only that game.
import type { Db } from "@/lib/db";

// The CTE `days` the streak and Me's longest streak and days played all read, so a played day has one definition: every
// day with an approved puzzle in any game up to $day, played if the player started a run in any game on it. user and
// day are SQL expressions (a parameter such as "$1", or a call).
export const playedDays = (user: string, day: string) => `days as (
       select p.puzzle_date as d,
              exists (select from private.run r where r.user_id = ${user} and r.puzzle_date = p.puzzle_date) as played
       from (select distinct puzzle_date from private.puzzle where puzzle_date <= ${day}::date) p
     )`;

// day: the day to count back from, when the caller reads its day once for several reads (src/game/offbeat.ts,
// readStats); otherwise today.
export async function getStreak(db: Db, userId: string, day: string | null = null): Promise<number> {
  const until = "coalesce($2::date, private.today())";
  const { rows } = await db.query<{ streak: number }>(
    `with ${playedDays("$1", until)}
     select count(*)::int as streak from days
     where played and d > coalesce((select max(d) from days where not played and d < ${until}), '-infinity'::date)`,
    [userId, day],
  );
  return rows[0].streak;
}
