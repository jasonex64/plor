// The weekly leaderboards (docs/milestones/M10-groups.md, 10a and 10c; ROADMAP "Design review", 2), and yesterday's
// (docs/milestones/M11-home-screen.md, H7): the viewer and their friends, not friends of friends (M09 D4), or a
// group's members (10c), each with the sum of their ledger rows this week, Monday to Sunday by puzzle day, and last
// week's below it (W1), or yesterday's: a day's points arrive only once it closes (M09 D9), so Sunday's land after
// Monday's reset. The players shown are settled first, so their finished runs on
// closed days have their rows (M09 D3, D10). A closed day also stays out of every total while the viewer's own run
// that day is still going, since a run can be finished after midnight (DECISIONS.md, Game 1: Timer): otherwise a
// friend's total would tell the viewer how far the friend got on questions the viewer hasn't answered (M09 D5; 9b
// review, like M08 8a's past-day thread). A group's boards count each member only from the puzzle day they joined,
// that day included (M12 12d, docs/milestones/M12-12d-decided-fixes.md); a friend's whole week counts.
import { GAME_ID } from "@/content/puzzle";
import { settleRuns } from "@/game/ledger";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { circleSql, groupCircleSql } from "./circle";

// name is the display name if set, else the username (M07 7a); you marks the viewer.
export type LeaderboardEntry = { username: string; name: string; points: number; you: boolean };
// from is the week's Monday, as a calendar date.
export type Week = { from: string; entries: LeaderboardEntry[] };
export type Leaderboard = { thisWeek: Week; lastWeek: Week };
// One day's standings: date is the puzzle day.
export type Day = { date: string; entries: LeaderboardEntry[] };

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

type Row = { user_id: string; username: string; name: string; points: number[] };

// Highest total first; ties alphabetically by name (M09 D4), then by username so the order is stable.
function ranked(rows: Row[], viewerId: string, range: number): LeaderboardEntry[] {
  return rows
    .map((r) => ({ username: r.username, name: r.name, points: r.points[range], you: r.user_id === viewerId }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name) || a.username.localeCompare(b.username));
}

export async function getLeaderboard(db: Db, viewerId: string): Promise<Leaderboard> {
  // Never null: the friends circle always holds the viewer.
  return (await weeklyBoard(db, viewerId, circleSql("$1"), [viewerId], null))!;
}

// A group's board, for its members only; anyone else gets the group page's 404 (10b).
export async function getGroupLeaderboard(db: Db, viewerId: string, groupId: string): Promise<Leaderboard> {
  const board = await weeklyBoard(db, viewerId, groupCircleSql("$1", "$2"), [viewerId, groupId], groupId);
  if (!board) throw new AppError("group_not_found", 404);
  return board;
}

// Yesterday's points, a closed day's, so final (M09 D9), for the game card (docs/milestones/M11-home-screen.md, H7):
// the viewer and their friends, or the members of one of the viewer's groups (a non-member gets the group page's 404).
export async function getYesterdayBoard(db: Db, viewerId: string, groupId: string | null): Promise<Day> {
  const circle =
    groupId === null
      ? await circleOf(db, circleSql("$1"), [viewerId])
      : await circleOf(db, groupCircleSql("$1", "$2"), [viewerId, groupId]);
  if (!circle) throw new AppError("group_not_found", 404);
  const yesterday = daysBefore(circle.today, 1);
  const rows = await totals(db, viewerId, circle.ids, groupId, [{ from: yesterday, to: circle.today }]);
  return { date: yesterday, entries: ranked(rows, viewerId, 0) };
}

// groupId: the group whose members players lists, or null for the friends board.
async function weeklyBoard(db: Db, viewerId: string, players: string, params: unknown[], groupId: string | null): Promise<Leaderboard | null> {
  const circle = await circleOf(db, players, params);
  if (!circle) return null;
  const thisWeek = weekStart(circle.today);
  const lastWeek = daysBefore(thisWeek, 7);
  const rows = await totals(db, viewerId, circle.ids, groupId, [
    { from: thisWeek, to: daysBefore(thisWeek, -7) },
    { from: lastWeek, to: thisWeek },
  ]);
  return {
    thisWeek: { from: thisWeek, entries: ranked(rows, viewerId, 0) },
    lastWeek: { from: lastWeek, entries: ranked(rows, viewerId, 1) },
  };
}

// The players a board shows and today's date, with their finished runs on closed days settled into the ledger, or
// null when players lists no one. players is SQL listing user_ids, with its own parameters.
async function circleOf(db: Db, players: string, params: unknown[]): Promise<{ ids: string[]; today: string } | null> {
  const { rows: people } = await db.query<{ user_id: string; today: string }>(
    `select c.user_id::text, private.today()::text as today from (${players}) c`,
    params,
  );
  if (people.length === 0) return null;
  const ids = people.map((p) => p.user_id);
  await settleRuns(db, ids);
  return { ids, today: people[0].today };
}

// Each player's ledger sum over each range of puzzle days, from (included) to (excluded), in that order. In a group's
// board (groupId), only the days from the one each member joined on.
async function totals(db: Db, viewerId: string, ids: string[], groupId: string | null, ranges: { from: string; to: string }[]): Promise<Row[]> {
  const sums = ranges.map(
    (_, i) => `coalesce(sum(l.points) filter (where l.puzzle_date >= $${6 + 2 * i}::date and l.puzzle_date < $${7 + 2 * i}::date), 0)::int`,
  );
  const { rows } = await db.query<Row>(
    `select p.user_id::text, p.username::text as username, coalesce(p.display_name, p.username::text) as name,
            array[${sums.join(", ")}] as points
     from private.profile p
     left join private.points_ledger l
       on l.user_id = p.user_id and l.game_id = $2 and l.puzzle_date >= $4::date
          and l.puzzle_date not in (select s.puzzle_date from private.run_status s
                                    where s.user_id = $3 and s.game_id = $2 and s.status = 'in_progress')
          and ($5::uuid is null or l.puzzle_date >= (select private.day_of(m.joined_at) from private.group_member m
                                                     where m.group_id = $5::uuid and m.user_id = p.user_id))
     where p.user_id = any($1::uuid[])
     group by p.user_id, p.username, p.display_name`,
    [ids, GAME_ID, viewerId, ranges.map((r) => r.from).sort()[0], groupId, ...ranges.flatMap((r) => [r.from, r.to])],
  );
  return rows;
}
