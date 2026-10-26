// What Offbeat's game screen shows besides the run (docs/milestones/M14-14a-2b-game-screen.md): the player's stats and
// yesterday's answers. Dates are read as text and "today" comes from private.today() alone (M00 §8).
import { GAME_ID, type ApprovedPuzzle } from "@/content/puzzle";
import { STATS_CHART_DAYS } from "@/config/tunables";
import type { Db } from "@/lib/db";
import { settleRuns } from "./ledger";
import { hostAnswers, named, thingNames, type Named } from "./payload";
import { FINISHED, type RunStatus } from "./status";
import { getStreak } from "./streak";

// best: the highest points plus final bonus over closed days, null before one is settled. average: questions survived
// per finished run, today's included once it's over; null before the first. days: today and the days before it,
// STATS_CHART_DAYS in all (L35),
// oldest first, with the questions survived, or null for a day with no finished run.
export type Stats = {
  streak: number;
  best: number | null;
  average: number | null;
  days: { date: string; survived: number | null }[];
};

export type YesterdayQuestion = { index: number; prompt: string; hostAnswers: Named[]; yours: { answer: Named; matched: boolean } | null };

// "none": no puzzle yesterday. "in_play": the player's own run yesterday is still going, so its answers stay hidden
// until they finish it (human, 2026-10-25: "Hide from that player (Recommended)"). "shown": every question, with the
// Wind's answers, and the player's own where they gave one (L34).
export type Yesterday =
  | { date: string; state: "none" | "in_play" }
  | { date: string; state: "shown"; questions: YesterdayQuestion[] };

export async function getStats(db: Db, userId: string): Promise<Stats> {
  // The ledger has a day's row only once a read after its midnight settles it (DECISIONS.md, Points ledger).
  await settleRuns(db, [userId]);
  const { rows } = await db.query<{ best: number | null; average: number | null; days: Stats["days"] }>(
    `with finished as (
       select s.puzzle_date,
              (select count(*) from private.run_event e
               where e.user_id = s.user_id and e.game_id = s.game_id and e.puzzle_date = s.puzzle_date and not e.matched)::int as survived
       from private.run_status s
       where s.user_id = $1 and s.game_id = $2 and s.status = any($3::text[])
     )
     select (select max(points) from private.points_ledger where user_id = $1 and game_id = $2) as best,
            (select avg(survived)::float8 from finished) as average,
            (select json_agg(json_build_object('date', w.day::text, 'survived', f.survived) order by w.day)
             from (select generate_series(private.today() - ($4::int - 1), private.today(), interval '1 day')::date as day) as w
             left join finished f on f.puzzle_date = w.day) as days`,
    [userId, GAME_ID, FINISHED, STATS_CHART_DAYS],
  );
  return { streak: await getStreak(db, userId), ...rows[0] };
}

export async function getYesterday(db: Db, userId: string): Promise<Yesterday> {
  const { rows } = await db.query<{ date: string; content: ApprovedPuzzle | null; status: RunStatus | null }>(
    `select (private.today() - 1)::text as date,
            (select content from private.puzzle where game_id = $2 and puzzle_date = private.today() - 1) as content,
            (select status from private.run_status where user_id = $1 and game_id = $2 and puzzle_date = private.today() - 1) as status`,
    [userId, GAME_ID],
  );
  const { date, content, status } = rows[0];
  if (!content) return { date, state: "none" };
  if (status === "in_progress") return { date, state: "in_play" };
  const { rows: events } = await db.query<{ question_idx: number; entry_id: string; matched: boolean }>(
    "select question_idx, entry_id, matched from private.run_event where user_id = $1 and game_id = $2 and puzzle_date = $3::date",
    [userId, GAME_ID, date],
  );
  const names = await thingNames(db, [...content.questions.flatMap((q) => q.host_answers), ...events.map((e) => e.entry_id)]);
  return {
    date,
    state: "shown",
    questions: content.questions.map((question, index) => {
      const own = events.find((e) => e.question_idx === index);
      return {
        index,
        prompt: question.prompt,
        hostAnswers: hostAnswers(question, names),
        yours: own ? { answer: named(names, own.entry_id), matched: own.matched } : null,
      };
    }),
  };
}
