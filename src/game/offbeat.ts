// What Offbeat's game screen shows besides the run (docs/milestones/M14-14a-2b-game-screen.md): the player's stats and
// yesterday's answers. Dates are read as text and "today" comes from private.today() alone (M00 §8).
import type { ClockPuzzle } from "@/content/puzzle";
import { GAME_ID } from "@/platform/game";
import { ANSWER_SHARE_MIN_PLAYERS, RAREST_ANSWERS_SHOWN, STATS_CHART_DAYS } from "@/config/tunables";
import type { Db } from "@/lib/db";
import { settleRuns } from "./ledger";
import { named, thingNames, type Named } from "./payload";
import { type RunStatus } from "./status";
import { getStreak } from "./streak";

// best: the highest points over closed days, null before one is settled. average: the points a day over the player's
// closed days, a whole number, null before the first (M23 23f-2, answer 66). days: today and the days before it,
// STATS_CHART_DAYS in all (L35), oldest first, with that day's points from the ledger, or null for a day with no row
// (not played, or not closed yet).
export type Stats = {
  streak: number;
  best: number | null;
  average: number | null;
  days: { date: string; points: number | null }[];
};

// Per question (M23 23f-2, answer 68) the answers most players gave and the rarest, each with how many
// players gave it. counts is null while fewer than ANSWER_SHARE_MIN_PLAYERS players gave an answer to the question.
export type Counted = { answer: Named; players: number };
export type YesterdayClockQuestion = { index: number; prompt: string; counts: { top: Counted[]; rarest: Counted[] } | null };

// "none": no puzzle yesterday. "in_play": the player's own run yesterday is still going, so its answers stay hidden
// until they finish it (human, 2026-10-25: "Hide from that player (Recommended)"). "clock": yesterday's answers, as counts.
export type Yesterday = { date: string; state: "none" | "in_play" } | { date: string; state: "clock"; questions: YesterdayClockQuestion[] };

export async function getStats(db: Db, userId: string): Promise<Stats> {
  // The ledger has a day's row only once a read after its midnight settles it (DECISIONS.md, Points ledger). The day
  // is read first, so the settling and the stats are of the same one (readStats).
  const { rows } = await db.query<{ day: string }>("select private.today()::text as day");
  await settleRuns(db, rows[0].day);
  return readStats(db, userId, rows[0].day);
}

// The stats as of day, read once by the caller so every part is of the same day: private.today() is each statement's
// own (supabase/migrations/20261028140000_baseline.sql), so separate reads at midnight could mix two
// (item 19). The caller has settled the player's closed runs.
export async function readStats(db: Db, userId: string, day: string): Promise<Stats> {
  const { rows } = await db.query<{ best: number | null; average: number | null; days: Stats["days"] }>(
    `select (select max(points) from private.points_ledger where user_id = $1 and game_id = $2) as best,
            (select round(avg(points))::int from private.points_ledger where user_id = $1 and game_id = $2) as average,
            (select json_agg(json_build_object('date', w.day::text, 'points', l.points) order by w.day)
             from (select generate_series($4::date - ($3::int - 1), $4::date, interval '1 day')::date as day) as w
             left join private.points_ledger l on l.user_id = $1 and l.game_id = $2 and l.puzzle_date = w.day) as days`,
    [userId, GAME_ID, STATS_CHART_DAYS, day],
  );
  return { streak: await getStreak(db, userId, day), ...rows[0] };
}

export async function getYesterday(db: Db, userId: string): Promise<Yesterday> {
  const { rows } = await db.query<{ date: string; content: ClockPuzzle | null; status: RunStatus | null }>(
    `select (private.today() - 1)::text as date,
            (select content from private.puzzle where game_id = $2 and puzzle_date = private.today() - 1) as content,
            (select status from private.run_status where user_id = $1 and game_id = $2 and puzzle_date = private.today() - 1) as status`,
    [userId, GAME_ID],
  );
  const { date, content, status } = rows[0];
  if (!content) return { date, state: "none" };
  if (status === "in_progress") return { date, state: "in_play" };
  return { date, state: "clock", questions: await clockCounts(db, date, content) };
}

// How many signed-in players gave each answer to each of a closed clock day's questions, up to the day's midnight as the
// ledger counts them (settleRuns). Only counts and names leave here, never which player gave what. Guests' answers are
// not kept by player, so they are not counted (docs/milestones/M23-23f-the-switch.md, Design, item 3). `date` is
// yesterday's, so today's answers are never read. Top: most players first; rarest: fewest first, never an answer already in
// the top; ties by the answer's name.
async function clockCounts(db: Db, date: string, content: ClockPuzzle): Promise<YesterdayClockQuestion[]> {
  const { rows } = await db.query<{ question_idx: number; entry_id: string; players: number; asked: number }>(
    `select a.question_idx, a.entry_id, count(*)::int as players,
            (select count(distinct b.user_id)::int from private.clock_answer b
             where b.game_id = $1 and b.puzzle_date = $2::date and b.question_idx = a.question_idx
               and private.day_of(b.created_at) = b.puzzle_date) as asked
     from private.clock_answer a
     where a.game_id = $1 and a.puzzle_date = $2::date and private.day_of(a.created_at) = a.puzzle_date
     group by a.question_idx, a.entry_id`,
    [GAME_ID, date],
  );
  const enough = rows.filter((r) => r.asked >= ANSWER_SHARE_MIN_PLAYERS);
  const names = await thingNames(db, enough.map((r) => r.entry_id));
  const byName = (a: Counted, b: Counted) => a.answer.name.localeCompare(b.answer.name);
  return content.questions.map((question, index) => {
    const counted = enough.filter((r) => r.question_idx === index).map((r): Counted => ({ answer: named(names, r.entry_id), players: r.players }));
    if (counted.length === 0) return { index, prompt: question.prompt, counts: null };
    const top = [...counted].sort((a, b) => b.players - a.players || byName(a, b)).slice(0, RAREST_ANSWERS_SHOWN);
    const rarest = counted
      .filter((c) => !top.includes(c))
      .sort((a, b) => a.players - b.players || byName(a, b))
      .slice(0, RAREST_ANSWERS_SHOWN);
    return { index, prompt: question.prompt, counts: { top, rarest } };
  });
}
