// The all-time friends leaderboard (docs/milestones/M09-points-and-leaderboard.md, 9b): the viewer and their friends,
// not friends of friends (D4), each with the sum of their ledger rows. The players shown are settled first, so their
// finished runs on closed days have their rows (D3, D10); today's points can't appear before the day closes (D9). A
// closed day also stays out of every total while the viewer's own run that day is still going, since a run can be
// finished after midnight (DECISIONS.md, Game 1: Timer): otherwise a friend's total would tell the viewer how far the
// friend got on questions the viewer hasn't answered (D5; 9b review, like M08 8a's past-day thread).
import { GAME_ID } from "@/content/puzzle";
import { settleRuns } from "@/game/ledger";
import type { Db } from "@/lib/db";

// name is the display name if set, else the username (M07 7a); you marks the viewer.
export type LeaderboardEntry = { username: string; name: string; points: number; you: boolean };

// Highest total first; ties alphabetically by name (D4), then by username so the order is stable.
export async function getLeaderboard(db: Db, viewerId: string): Promise<LeaderboardEntry[]> {
  const { rows: people } = await db.query<{ user_id: string }>(
    `select $1::uuid::text as user_id
     union all
     select (case when f.user_a = $1 then f.user_b else f.user_a end)::text from private.friendship f where $1 in (f.user_a, f.user_b)`,
    [viewerId],
  );
  const ids = people.map((p) => p.user_id);
  await settleRuns(db, ids);
  const { rows } = await db.query<{ user_id: string; username: string; name: string; points: number }>(
    `select p.user_id::text, p.username::text as username, coalesce(p.display_name, p.username::text) as name,
            coalesce((select sum(l.points) from private.points_ledger l
                      where l.user_id = p.user_id and l.game_id = $2
                        and l.puzzle_date not in (select s.puzzle_date from private.run_status s
                                                  where s.user_id = $3 and s.game_id = $2 and s.status = 'in_progress')), 0)::int as points
     from private.profile p
     where p.user_id = any($1::uuid[])`,
    [ids, GAME_ID, viewerId],
  );
  return rows
    .map((r) => ({ username: r.username, name: r.name, points: r.points, you: r.user_id === viewerId }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name) || a.username.localeCompare(b.username));
}
