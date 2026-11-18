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
// docs/milestones/M16-16e-points-and-boards.md): each adds up its game's points (the human, 2026-11-17, issue #265:
// "each individual game leaderboard should just be the raw points"), game 2's counted from the day's midnight like game
// 1's (16e, answer 21). The overall board (16e-3b, answers 2, 29 to 33) adds up both games' par scores, each day's
// points against the game's par, out of 100 (docs/milestones/M15-15i-par-scores.md), and averages them over the
// game-days played.
import { PAR_POINTS } from "@/config/tunables";
import type { ApprovedPuzzle } from "@/content/puzzle";
import { GAME_ID, OVERALL, SUBSTRINGS_ID } from "@/platform/game";
import { pooledCounts, settleRuns } from "@/game/ledger";
import { parScore, scoreAverage, scoreTotal } from "@/game/par";
import { scoreRun } from "@/game/scoring";
import { FINISHED, type RunStatus } from "@/game/status";
import { runTotals, settleSubstringRuns } from "@/game/substring-places";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/http";
import { circleSql, groupCircleSql } from "./circle";
import { ranked } from "./rank";
import { STATUS } from "@/lib/status";

// The games a board can be for.
export type BoardGame = typeof GAME_ID | typeof SUBSTRINGS_ID;
// What a board can show: one game's, or both games' par scores, the overall board.
export type BoardChoice = BoardGame | typeof OVERALL.id;

// A request names its game, as each game has its own board, thread and reactions (comments and reactions: M16 16f-3).
export function readGame(input: unknown): BoardGame {
  if (input === GAME_ID || input === SUBSTRINGS_ID) return input;
  throw new AppError("unknown_game", STATUS.badRequest);
}

// A board names its game, as each game's board counts differently, or asks for the overall one.
export function readBoardGame(input: unknown): BoardChoice {
  return input === OVERALL.id ? input : readGame(input);
}

// name is the display name if set, else the username (M07 7a); you marks the viewer.
export type LeaderboardEntry = { username: string; name: string; points: number; you: boolean };
// daily: the player's points on each of the week's days that are over, Monday first.
export type WeekEntry = LeaderboardEntry & { daily: number[] };
// from is the week's Monday, as a calendar date; days, how many of its days are over (7 for last week); hidden, those
// the viewer is still playing, by place in the week, which add nothing to anyone (M09 D5; 14b-14, answer 28).
export type Week = { from: string; days: number; hidden: number[]; entries: WeekEntry[] };
export type Leaderboard = { thisWeek: Week; lastWeek: Week };
// The overall board's weeks: points is the Sum of a player's par scores in both games, average their Average per game-day
// played (answer 2). List only (answer 33), so no days.
export type OverallEntry = LeaderboardEntry & { average: number };
export type OverallWeek = { from: string; entries: OverallEntry[] };
export type OverallBoard = { thisWeek: OverallWeek; lastWeek: OverallWeek };
// One day's standings: date is the puzzle day.
export type Day = { date: string; entries: LeaderboardEntry[] };
// Today's standings (M22): games, today's approved games among those asked, none meaning no board today; open, whether
// the viewer may see it, and until then no entries and no rest. entries: the finished players, ranked, each with their
// Average too on Overall; rest: everyone else, by name, still playing or not played yet (answer 5).
export type TodayWaiting = { username: string; name: string; you: boolean; state: "playing" | "not_played" };
export type TodayBoard = { date: string; games: BoardGame[]; open: boolean; entries: (LeaderboardEntry | OverallEntry)[]; rest: TodayWaiting[] };

// The Monday that starts the week holding this day. Days are calendar dates ("2026-10-22"), read in UTC so the
// weekday can't shift with the server's time zone.
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // docs/DECISIONS.md, Log 2026-10-22: weeks run Monday to Sunday
  return d.toISOString().split("T")[0];
}

function daysBefore(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split("T")[0];
}

// How many days from one calendar date to a later one.
function daysFrom(from: string, day: string): number {
  return (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / (24 * 60 * 60 * 1000);
}

// A player's ledger points by puzzle day ("2026-10-22" → points).
// joined is the puzzle day the account was made.
type Row = { user_id: string; username: string; name: string; joined: string; days: Record<string, number> };

// A player's points from (included) to (excluded).
function total(row: Row, from: string, to: string): number {
  return scoreTotal(inWeek(row, from, to));
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
  if (!board) throw new AppError("group_not_found", STATUS.notFound);
  return board;
}

// Yesterday's standings, a closed day's, so final (M09 D9), for the game card (docs/milestones/M11-home-screen.md, H7):
// the viewer and their friends, or the members of one of the viewer's groups (a non-member gets the group page's 404).
// The card names its game as the weekly boards do (M16 16f-6, answer 20): that game's points, or both games' par scores
// added up.
export async function getYesterdayBoard(db: Db, viewerId: string, groupId: string | null, game: BoardChoice): Promise<Day> {
  const circle =
    groupId === null
      ? await circleOf(db, circleSql("$1"), [viewerId])
      : await circleOf(db, groupCircleSql("$1", "$2"), [viewerId, groupId]);
  if (!circle) throw new AppError("group_not_found", STATUS.notFound);
  const yesterday = daysBefore(circle.today, 1);
  if (game === OVERALL.id) {
    const both = await bothGames(db, viewerId, circle.ids, groupId, yesterday, circle.today);
    return { date: yesterday, entries: ranked(overallDays(both, groupId, yesterday, circle.today).map(({ row, days }) => entry(row, viewerId, scoreTotal(days))), byTotal) };
  }
  const { rows } = await gameRows(db, game, viewerId, circle.ids, groupId, yesterday, circle.today);
  return { date: yesterday, entries: ranked(onBoard(rows, groupId, circle.today).map((r) => entry(r, viewerId, total(r, yesterday, circle.today))), byTotal) };
}

// Today's standings (docs/milestones/M22-todays-board.md): the viewer and their friends, or a group's members, with the
// score each finished run shows on its result screen, read from today's runs, not the ledger, which waits for midnight
// (M09 D9). Closed, with no score and no one's state, until the viewer has finished that game today, or for Overall
// each of today's games (answers 1 and 6; DECISIONS.md, Game 1: no spoilers). Once open: the finished players ranked,
// then the rest by name (answer 5). Overall ranks a player who's finished one game by that game's par score (answer 6).
export async function getTodayBoard(db: Db, viewerId: string, groupId: string | null, game: BoardChoice): Promise<TodayBoard> {
  const circle =
    groupId === null
      ? await circleOf(db, circleSql("$1"), [viewerId])
      : await circleOf(db, groupCircleSql("$1", "$2"), [viewerId, groupId]);
  if (!circle) throw new AppError("group_not_found", STATUS.notFound);
  const asked: BoardGame[] = game === OVERALL.id ? [GAME_ID, SUBSTRINGS_ID] : [game];
  const { rows: days } = await db.query<{ game_id: BoardGame; content: ApprovedPuzzle }>(
    "select game_id, content from private.puzzle where puzzle_date = $1::date and game_id = any($2::text[])",
    [circle.today, asked],
  );
  // Today's games among those asked, in the switch's order.
  const games = asked.filter((g) => days.some((d) => d.game_id === g));
  const closed: TodayBoard = { date: circle.today, games, open: false, entries: [], rest: [] };
  if (games.length === 0) return closed;
  const { rows: people } = await db.query<{ user_id: string; username: string; name: string; statuses: Partial<Record<BoardGame, RunStatus>> }>(
    `select p.user_id::text, p.username::text as username, coalesce(p.display_name, p.username::text) as name,
            coalesce(jsonb_object_agg(s.game_id, s.status) filter (where s.game_id is not null), '{}'::jsonb) as statuses
     from private.profile p
     left join private.run_status s on s.user_id = p.user_id and s.puzzle_date = $2::date and s.game_id = any($3::text[])
     where p.user_id = any($1::uuid[])
     group by p.user_id, p.username, p.display_name`,
    [circle.ids, circle.today, games],
  );
  const done = (statuses: Partial<Record<BoardGame, RunStatus>>, g: BoardGame) => FINISHED.includes(statuses[g] ?? "not_started");
  const viewer = people.find((p) => p.user_id === viewerId)!;
  if (!games.every((g) => done(viewer.statuses, g))) return closed;

  // Each finished player's score in each game, as their result screen shows it.
  const scores = new Map<string, number[]>();
  for (const g of games) {
    const finished = people.filter((p) => done(p.statuses, g)).map((p) => p.user_id);
    const points = g === GAME_ID ? await offbeatToday(db, days.find((d) => d.game_id === g)!.content, finished) : await runTotals(db, finished, finished.map(() => circle.today));
    for (const id of finished) {
      const score = g === GAME_ID ? points.get(id)! : points.get(`${id}:${circle.today}`)!;
      // Shown as the boards show each game: a game's own board in points (issue #265), Overall as par scores (M15 15i).
      scores.set(id, [...(scores.get(id) ?? []), game === OVERALL.id ? parScore(score, PAR_POINTS[g]) : score]);
    }
  }
  const finishedRows = people.filter((p) => scores.has(p.user_id));
  const entries = ranked(
    finishedRows.map((p) => ({
      username: p.username,
      name: p.name,
      points: scoreTotal(scores.get(p.user_id)!),
      average: scoreAverage(scores.get(p.user_id)!),
      you: p.user_id === viewerId,
    })),
    byTotal,
  ).map(({ average, ...e }) => (game === OVERALL.id ? { ...e, average } : e));
  const rest = people
    .filter((p) => !scores.has(p.user_id))
    .sort((a, b) => a.name.localeCompare(b.name) || a.username.localeCompare(b.username))
    .map((p) => ({
      username: p.username,
      name: p.name,
      you: p.user_id === viewerId,
      state: games.some((g) => p.statuses[g] === "in_progress") ? ("playing" as const) : ("not_played" as const),
    }));
  return { ...closed, open: true, entries, rest };
}

// Today's Offbeat score of each of these players' finished runs, by user ID: the ladder and the provisional rarity
// bonus, the result screen's points + bonus (src/game/runs.ts, buildState), from the same events and pooled counts.
async function offbeatToday(db: Db, puzzle: ApprovedPuzzle, userIds: string[]): Promise<Map<string, number>> {
  const { rows } = await db.query<{ user_id: string; events: { index: number; entryId: string; matched: boolean; inDay: boolean }[] }>(
    `select e.user_id::text,
            jsonb_agg(jsonb_build_object('index', e.question_idx, 'entryId', e.entry_id, 'matched', e.matched,
                                         'inDay', private.day_of(e.created_at) = e.puzzle_date) order by e.question_idx) as events
     from private.run_event e
     where e.game_id = $1 and e.puzzle_date = $2::date and e.user_id = any($3::uuid[])
     group by e.user_id`,
    [GAME_ID, puzzle.date, userIds],
  );
  const pooled = await pooledCounts(db, puzzle, false);
  // A run that ran out of time on question 1 has no answer, and scores 0.
  const byUser = new Map(userIds.map((id) => [id, 0]));
  for (const r of rows) {
    const score = scoreRun(puzzle, r.events, pooled);
    byUser.set(r.user_id, score.ladder + score.bonus);
  }
  return byUser;
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
  const lastWeek = daysBefore(thisWeek, 7); // docs/DECISIONS.md, Log 2026-10-22: weeks run Monday to Sunday
  const nextWeek = daysBefore(thisWeek, -7); // docs/DECISIONS.md, Log 2026-10-22: weeks run Monday to Sunday
  const rowsOf = (g: BoardGame) => gameRows(db, g, viewerId, circle.ids, groupId, lastWeek, nextWeek);
  if (game === OVERALL.id) {
    const both = await bothGames(db, viewerId, circle.ids, groupId, lastWeek, nextWeek);
    const overallWeek = (from: string, to: string): OverallWeek => ({
      from,
      entries: ranked(
        overallDays(both, groupId, from, to).map(({ row, days }) => ({ ...entry(row, viewerId, scoreTotal(days)), average: scoreAverage(days) })),
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
  return { thisWeek: week(thisWeek, nextWeek, daysFrom(thisWeek, today)), lastWeek: week(lastWeek, thisWeek, 7) }; // docs/DECISIONS.md, Log 2026-10-22: weeks run Monday to Sunday
}

// A game's rows for a board, from (included) to (excluded), and the days the viewer is still playing, which hold
// nothing.
async function gameRows(db: Db, game: BoardGame, viewerId: string, ids: string[], groupId: string | null, from: string, to: string) {
  if (game === GAME_ID) {
    await settleRuns(db);
    const skip = await playing(db, viewerId, from, to);
    return { rows: await ledger(db, game, ids, groupId, from, to, skip), skip };
  }
  // A game 2 run stops at midnight, so no closed day waits on the viewer's own run.
  await settleSubstringRuns(db);
  return { rows: await ledger(db, game, ids, groupId, from, to, []), skip: [] };
}

// Both games' rows for an overall board, from (included) to (excluded), each turned into par scores. Game 1's leave out
// the days the viewer is still playing, game 2's count (answer 32).
async function bothGames(db: Db, viewerId: string, ids: string[], groupId: string | null, from: string, to: string): Promise<[Row[], Row[]]> {
  const first = await gameRows(db, GAME_ID, viewerId, ids, groupId, from, to);
  const second = await gameRows(db, SUBSTRINGS_ID, viewerId, ids, groupId, from, to);
  return [parScores(GAME_ID, first.rows), parScores(SUBSTRINGS_ID, second.rows)];
}

// Each player on an overall board with the par scores of both games they hold on the days from (included) to (excluded).
const overallDays = (both: [Row[], Row[]], groupId: string | null, from: string, to: string) =>
  onBoard(both[0], groupId, to).map((row) => ({ row, days: [row, both[1].find((s) => s.user_id === row.user_id)!].flatMap((r) => inWeek(r, from, to)) }));

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

// The board's rows with each day's points turned into its par score in that game (M15 15i).
const parScores = (game: BoardGame, rows: Row[]): Row[] =>
  rows.map((r) => ({ ...r, days: Object.fromEntries(Object.entries(r.days).map(([day, points]) => [day, parScore(points, PAR_POINTS[game])])) }));

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
