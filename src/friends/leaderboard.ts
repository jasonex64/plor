// The weekly leaderboards (docs/milestones/M10-groups.md, 10a and 10c; ROADMAP "Design review", 2), and yesterday's
// (docs/milestones/M11-home-screen.md, H7): the viewer and their friends, not friends of friends (M09 D4), or a
// group's members (10c), each with the sum of their ledger rows this week, Monday to Sunday by puzzle day, and last
// week's below it (W1), or yesterday's: a day's points arrive only once it closes (M09 D9), so Sunday's land after
// Monday's reset. The players shown are settled first, so their runs on closed days have their rows, with what each
// scored by its midnight (M09 D3, D10; M16 16e-3a). A closed day also stays out of every total while the viewer's own run
// that day is still going, since a run can be finished after midnight (DECISIONS.md, Game 1: Timer): otherwise a
// friend's total would tell the viewer how far the friend got on questions the viewer hasn't answered (M09 D5; 9b
// review, like M08 8a's past-day thread). A group's boards count each member only from the puzzle day they joined,
// that day included (M12 12d, docs/milestones/M12-12d-decided-fixes.md); a friend's whole week counts, but a friends board for a week or a day that ended before a player's account was made
// doesn't list them, the viewer included (M19 19c). Each week
// also gives every player's points on each of its days that are over, for the graph view
// (docs/milestones/M14-14b-14-leaderboard-graph.md). Each board is one game's (M16 16e-2,
// docs/milestones/M16-16e-points-and-boards.md): game 1's adds up points, and game 2's each day's place, the % of that
// day's players beaten, counted from the day's midnight like game 1's points (answers 15 and 21). The overall board
// (16e-3b, answers 2, 27 to 33) adds up both games' places, a game 1 day's place worked out like game 2's among every
// player of that day, and averages them over the game-days played.
import { GAME_ID, OVERALL, SUBSTRINGS_ID } from "@/platform/game";
import { settleRuns } from "@/game/ledger";
import { dayPercentiles, placeAverage, placeTotal } from "@/game/percentile";
import { settleSubstringRuns } from "@/game/substring-places";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { circleSql, groupCircleSql } from "./circle";
import { ranked } from "./rank";

// The games a board can be for.
export type BoardGame = typeof GAME_ID | typeof SUBSTRINGS_ID;
// What a board can show: one game's, or both games' places, the overall board.
export type BoardChoice = BoardGame | typeof OVERALL.id;

// A board names its game, as each game's board counts differently, or asks for the overall one.
export function readBoardGame(input: unknown): BoardChoice {
  if (input === GAME_ID || input === SUBSTRINGS_ID || input === OVERALL.id) return input;
  throw new AppError("unknown_game", 400);
}

// name is the display name if set, else the username (M07 7a); you marks the viewer.
export type LeaderboardEntry = { username: string; name: string; points: number; you: boolean };
// daily: the player's points on each of the week's days that are over, Monday first.
export type WeekEntry = LeaderboardEntry & { daily: number[] };
// from is the week's Monday, as a calendar date; days, how many of its days are over (7 for last week); hidden, those
// the viewer is still playing, by place in the week, which add nothing to anyone (M09 D5; 14b-14, answer 28).
export type Week = { from: string; days: number; hidden: number[]; entries: WeekEntry[] };
export type Leaderboard = { thisWeek: Week; lastWeek: Week };
// The overall board's weeks: points is the Sum of a player's places in both games, average their Average per game-day
// played (answer 2). List only (answer 33), so no days.
export type OverallEntry = LeaderboardEntry & { average: number };
export type OverallWeek = { from: string; entries: OverallEntry[] };
export type OverallBoard = { thisWeek: OverallWeek; lastWeek: OverallWeek };
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

// How many days from one calendar date to a later one.
function daysFrom(from: string, day: string): number {
  return (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

// A player's ledger points by puzzle day ("2026-10-22" → points).
// joined is the puzzle day the account was made.
type Row = { user_id: string; username: string; name: string; joined: string; days: Record<string, number> };

// A player's points from (included) to (excluded). Game 2's are places with one decimal, so the sum keeps one.
function total(row: Row, from: string, to: string): number {
  return placeTotal(inWeek(row, from, to));
}

function entry(row: Row, viewerId: string, points: number): LeaderboardEntry {
  return { username: row.username, name: row.name, points, you: row.user_id === viewerId };
}

const byTotal = (e: LeaderboardEntry) => e.points;

export async function getLeaderboard(db: Db, viewerId: string, game: BoardChoice): Promise<Leaderboard | OverallBoard> {
  // Never null: the friends circle always holds the viewer.
  return (await weeklyBoard(db, viewerId, game, circleSql("$1"), [viewerId], null))!;
}

// A group's board, for its members only; anyone else gets the group page's 404 (10b).
export async function getGroupLeaderboard(db: Db, viewerId: string, groupId: string, game: BoardChoice): Promise<Leaderboard | OverallBoard> {
  const board = await weeklyBoard(db, viewerId, game, groupCircleSql("$1", "$2"), [viewerId, groupId], groupId);
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
  await settleRuns(db);
  const yesterday = daysBefore(circle.today, 1);
  const skip = await playing(db, viewerId, yesterday, circle.today);
  const rows = onBoard(await ledger(db, GAME_ID, circle.ids, groupId, yesterday, circle.today, skip), groupId, circle.today);
  return { date: yesterday, entries: ranked(rows.map((r) => entry(r, viewerId, total(r, yesterday, circle.today))), byTotal) };
}

// groupId: the group whose members players lists, or null for the friends board.
async function weeklyBoard(
  db: Db,
  viewerId: string,
  game: BoardChoice,
  players: string,
  params: unknown[],
  groupId: string | null,
): Promise<Leaderboard | OverallBoard | null> {
  const circle = await circleOf(db, players, params);
  if (!circle) return null;
  const today = circle.today;
  const thisWeek = weekStart(today);
  const lastWeek = daysBefore(thisWeek, 7);
  const nextWeek = daysBefore(thisWeek, -7);
  const rowsOf = (g: BoardGame) => gameRows(db, g, viewerId, circle.ids, groupId, lastWeek, nextWeek);
  if (game === OVERALL.id) {
    // Game 1's places leave out the days the viewer is still playing, game 2's count (answer 32).
    const first = await rowsOf(GAME_ID);
    const both = [await places(db, GAME_ID, first.rows, lastWeek, nextWeek), (await rowsOf(SUBSTRINGS_ID)).rows];
    const overallWeek = (from: string, to: string): OverallWeek => ({
      from,
      entries: ranked(
        onBoard(both[0], groupId, to).map((r) => {
          const days = [r, both[1].find((s) => s.user_id === r.user_id)!].flatMap((row) => inWeek(row, from, to));
          return { ...entry(r, viewerId, placeTotal(days)), average: placeAverage(days) };
        }),
        byTotal,
      ),
    });
    return { thisWeek: overallWeek(thisWeek, nextWeek), lastWeek: overallWeek(lastWeek, thisWeek) };
  }
  const { rows, skip } = await rowsOf(game);
  const week = (from: string, to: string, days: number): Week => ({
    from,
    days,
    hidden: skip.filter((day) => day >= from && day < to && day < today).map((day) => daysFrom(from, day)),
    entries: ranked(
      onBoard(rows, groupId, to).map((r) => ({
        ...entry(r, viewerId, total(r, from, to)),
        daily: Array.from({ length: days }, (_, i) => r.days[daysBefore(from, -i)] ?? 0),
      })),
      byTotal,
    ),
  });
  return { thisWeek: week(thisWeek, nextWeek, daysFrom(thisWeek, today)), lastWeek: week(lastWeek, thisWeek, 7) };
}

// A game's rows for a board, from (included) to (excluded), and the days the viewer is still playing, which hold
// nothing. Game 1's are points, game 2's places. Settling takes every player's runs, as a place needs the whole day.
async function gameRows(db: Db, game: BoardGame, viewerId: string, ids: string[], groupId: string | null, from: string, to: string) {
  if (game === GAME_ID) {
    await settleRuns(db);
    const skip = await playing(db, viewerId, from, to);
    return { rows: await ledger(db, game, ids, groupId, from, to, skip), skip };
  }
  // A game 2 run stops at midnight, so no closed day waits on the viewer's own run.
  await settleSubstringRuns(db);
  return { rows: await places(db, game, await ledger(db, game, ids, groupId, from, to, []), from, to), skip: [] };
}

// A friends board for a period lists only the players whose account was made before it ended, the viewer too; a group's
// keeps a member who joined later, on 0 (M19 19c; M12 12d, D3). to is the period's end, excluded.
const onBoard = (rows: Row[], groupId: string | null, to: string) => (groupId === null ? rows.filter((r) => r.joined < to) : rows);

// A row's numbers on the days from (included) to (excluded).
const inWeek = (row: Row, from: string, to: string) => Object.entries(row.days).flatMap(([day, n]) => (day >= from && day < to ? [n] : []));

// The players a board shows and today's date, or null when players lists no one. players is SQL listing user_ids,
// with its own parameters. The caller settles their game's runs on closed days into the ledger.
async function circleOf(db: Db, players: string, params: unknown[]): Promise<{ ids: string[]; today: string } | null> {
  const { rows: people } = await db.query<{ user_id: string; today: string }>(
    `select c.user_id::text, private.today()::text as today from (${players}) c`,
    params,
  );
  if (people.length === 0) return null;
  return { ids: people.map((p) => p.user_id), today: people[0].today };
}

// The board's rows with each day's points turned into that day's place among every player of the game that day, as
// the circle is only part of the day (answers 15, 25, 26, 27).
async function places(db: Db, game: BoardGame, rows: Row[], from: string, to: string): Promise<Row[]> {
  const { rows: all } = await db.query<{ user_id: string; day: string; points: number }>(
    `select user_id::text, puzzle_date::text as day, points from private.points_ledger
     where game_id = $1 and puzzle_date >= $2::date and puzzle_date < $3::date`,
    [game, from, to],
  );
  const byDay = new Map<string, Map<string, number>>();
  for (const r of all) byDay.set(r.day, (byDay.get(r.day) ?? new Map()).set(r.user_id, r.points));
  const placed = new Map([...byDay].map(([day, scores]) => [day, dayPercentiles(scores)]));
  return rows.map((r) => ({ ...r, days: Object.fromEntries(Object.keys(r.days).map((day) => [day, placed.get(day)!.get(r.user_id)!])) }));
}

// The puzzle days from (included) to (excluded) whose own run the viewer is still playing, in order: a run can be
// finished after midnight, and one waiting at a reveal stays in progress until Next (DECISIONS.md, Game 1: Timer).
async function playing(db: Db, viewerId: string, from: string, to: string): Promise<string[]> {
  const { rows } = await db.query<{ day: string }>(
    `select s.puzzle_date::text as day from private.run_status s
     where s.user_id = $1 and s.game_id = $2 and s.status = 'in_progress' and s.puzzle_date >= $3::date and s.puzzle_date < $4::date
     order by s.puzzle_date`,
    [viewerId, GAME_ID, from, to],
  );
  return rows.map((r) => r.day);
}

// Each player's ledger points on each puzzle day from (included) to (excluded), but none on the days in skip. In a
// group's board (groupId), only the days from the one each member joined on.
async function ledger(db: Db, game: BoardGame, ids: string[], groupId: string | null, from: string, to: string, skip: string[]): Promise<Row[]> {
  const { rows } = await db.query<Row>(
    `select p.user_id::text, p.username::text as username, coalesce(p.display_name, p.username::text) as name,
            private.day_of(p.created_at)::text as joined,
            coalesce(jsonb_object_agg(l.puzzle_date::text, l.points) filter (where l.puzzle_date is not null), '{}'::jsonb) as days
     from private.profile p
     left join private.points_ledger l
       on l.user_id = p.user_id and l.game_id = $2 and l.puzzle_date >= $3::date and l.puzzle_date < $4::date
          and l.puzzle_date <> all($5::date[])
          and ($6::uuid is null or l.puzzle_date >= (select private.day_of(m.joined_at) from private.group_member m
                                                     where m.group_id = $6::uuid and m.user_id = p.user_id))
     where p.user_id = any($1::uuid[])
     group by p.user_id, p.username, p.display_name, p.created_at`,
    [ids, game, from, to, skip, groupId],
  );
  return rows;
}
