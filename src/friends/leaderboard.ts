// The weekly friends leaderboard (docs/milestones/M10-groups.md, 10a; ROADMAP "Design review", 2): the viewer and
// their friends, not friends of friends (M09 D4), each with the sum of their ledger rows this week, Monday to Sunday by
// puzzle day, and last week's below it (W1): a day's points arrive only once it closes (M09 D9), so Sunday's land
// after Monday's reset. The players shown are settled first, so their finished runs on closed days have their rows
// (M09 D3, D10). A closed day also stays out of every total while the viewer's own run that day is still going, since
// a run can be finished after midnight (DECISIONS.md, Game 1: Timer): otherwise a friend's total would tell the viewer
// how far the friend got on questions the viewer hasn't answered (M09 D5; 9b review, like M08 8a's past-day thread).
import { GAME_ID } from "@/content/puzzle";
import { settleRuns } from "@/game/ledger";
import type { Db } from "@/lib/db";
import { circleSql } from "./circle";

// name is the display name if set, else the username (M07 7a); you marks the viewer.
export type LeaderboardEntry = { username: string; name: string; points: number; you: boolean };
// from is the week's Monday, as a calendar date.
export type Week = { from: string; entries: LeaderboardEntry[] };
export type Leaderboard = { thisWeek: Week; lastWeek: Week };

// The Monday that starts the week holding this day. Days are calendar dates ("2026-10-22"), read in UTC so the
// weekday can't shift with the server's time zone.
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function daysBefore(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

type Row = { user_id: string; username: string; name: string; this_week: number; last_week: number };

// Highest total first; ties alphabetically by name (M09 D4), then by username so the order is stable.
function ranked(rows: Row[], viewerId: string, points: (r: Row) => number): LeaderboardEntry[] {
  return rows
    .map((r) => ({ username: r.username, name: r.name, points: points(r), you: r.user_id === viewerId }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name) || a.username.localeCompare(b.username));
}

export async function getLeaderboard(db: Db, viewerId: string): Promise<Leaderboard> {
  const { rows: people } = await db.query<{ user_id: string; today: string }>(
    `select c.user_id::text, private.today()::text as today from (${circleSql("$1")}) c`,
    [viewerId],
  );
  const ids = people.map((p) => p.user_id);
  const thisWeek = weekStart(people[0].today);
  const lastWeek = daysBefore(thisWeek, 7);
  await settleRuns(db, ids);
  const { rows } = await db.query<Row>(
    `select p.user_id::text, p.username::text as username, coalesce(p.display_name, p.username::text) as name,
            coalesce(sum(l.points) filter (where l.puzzle_date >= $4::date), 0)::int as this_week,
            coalesce(sum(l.points) filter (where l.puzzle_date < $4::date), 0)::int as last_week
     from private.profile p
     left join private.points_ledger l
       on l.user_id = p.user_id and l.game_id = $2 and l.puzzle_date >= $5::date
          and l.puzzle_date not in (select s.puzzle_date from private.run_status s
                                    where s.user_id = $3 and s.game_id = $2 and s.status = 'in_progress')
     where p.user_id = any($1::uuid[])
     group by p.user_id, p.username, p.display_name`,
    [ids, GAME_ID, viewerId, thisWeek, lastWeek],
  );
  return {
    thisWeek: { from: thisWeek, entries: ranked(rows, viewerId, (r) => r.this_week) },
    lastWeek: { from: lastWeek, entries: ranked(rows, viewerId, (r) => r.last_week) },
  };
}
