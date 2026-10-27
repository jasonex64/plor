// The player's own stats for the Me tab (docs/milestones/M14-14a-3a-me.md; L45): totals across games, this month's
// calendar, a card per game and the rarest answers. Dates are read as text and "today" comes from private.today()
// alone (M00 §8). One game so far, so "across games" is Offbeat's numbers.
import { GAME_ID, type ApprovedPuzzle } from "@/content/puzzle";
import { ANSWER_SHARE_MIN_PLAYERS, RAREST_ANSWERS_SHOWN } from "@/config/tunables";
import type { Db } from "@/lib/db";
import { allTimePoints, dayCounts } from "./ledger";
import { FINISHED_RUNS, readStats } from "./offbeat";
import { named, thingNames, type Named } from "./payload";
import { FINISHED } from "./status";

// since: the day the profile was made, by the Pacific day boundary. month: every day of today's month, oldest first,
// with the questions survived on a finished run, or null (days after today included, so the calendar can draw them).
// rarest: the player's lowest-share answers from closed days (human, 2026-10-25: "3, from closed days").
export type Me = {
  username: string;
  since: string;
  totals: { points: number; daysPlayed: number; streak: number; longestStreak: number };
  month: { today: string; days: { date: string; survived: number | null }[] };
  offbeat: { best: number | null; average: number | null; fullClimbs: number };
  rarest: { answer: Named; prompt: string; date: string; share: number }[];
};

export async function getMe(db: Db, userId: string): Promise<Me> {
  // The day is read once, first, and every read is of it, the settling included, so a request at midnight can't mix
  // two (readStats; item 19). allTimePoints settles the player's runs closed by that day, once, so the points and the
  // best score are complete.
  const { rows: today } = await db.query<{ day: string }>("select private.today()::text as day");
  const day = today[0].day;
  const points = await allTimePoints(db, userId, day);
  const stats = await readStats(db, userId, day);
  const { rows } = await db.query<{
    username: string;
    since: string;
    days_played: number;
    full_climbs: number;
    longest: number;
    today: string;
    month: Me["month"]["days"];
  }>(
    `with ${FINISHED_RUNS},
     -- The streak's days (src/game/streak.ts): puzzle days up to today, played if a run was started. A day with no
     -- puzzle neither counts nor breaks a streak; each unplayed day starts a new group.
     days as (
       select p.puzzle_date as d,
              exists (select from private.run r where r.user_id = $1 and r.game_id = $2 and r.puzzle_date = p.puzzle_date) as played
       from private.puzzle p
       where p.game_id = $2 and p.puzzle_date <= $4::date
     ),
     groups as (select played, count(*) filter (where not played) over (order by d) as g from days)
     select p.username::text,
            private.day_of(p.created_at)::text as since,
            (select count(*) from finished)::int as days_played,
            (select count(*) from finished where status = 'survived')::int as full_climbs,
            (select coalesce(max(n), 0) from (select count(*)::int as n from groups where played group by g) as runs)::int as longest,
            $4::text as today,
            (select json_agg(json_build_object('date', m.day::text, 'survived', f.survived) order by m.day)
             from (select generate_series(date_trunc('month', $4::date), date_trunc('month', $4::date) + interval '1 month - 1 day',
                                          interval '1 day')::date as day) as m
             left join finished f on f.puzzle_date = m.day) as month
     from private.profile p
     where p.user_id = $1`,
    [userId, GAME_ID, FINISHED, day],
  );
  const row = rows[0];
  return {
    username: row.username,
    since: row.since,
    totals: { points, daysPlayed: row.days_played, streak: stats.streak, longestStreak: row.longest },
    month: { today: row.today, days: row.month },
    offbeat: { best: stats.best, average: stats.average, fullClimbs: row.full_climbs },
    rarest: await rarestAnswers(db, userId, day),
  };
}

// The player's answers that survived (a caught one is the Wind's, not theirs: human, 2026-10-25, "Leave caught out
// (Recommended)"; docs/milestones/M14-14a-3b-settings.md), given before their day's midnight on closed days, by their
// share of that question's answers then, lowest first: the counts the result's shares use (dayCounts; M11 H5), so a
// share here is the one the result showed once the day was over. Only questions at least ANSWER_SHARE_MIN_PLAYERS
// answered have a share.
async function rarestAnswers(db: Db, userId: string, day: string): Promise<Me["rarest"]> {
  const { rows: events } = await db.query<{ date: string; question_idx: number; entry_id: string }>(
    `select puzzle_date::text as date, question_idx, entry_id from private.run_event
     where user_id = $1 and game_id = $2 and puzzle_date < $3::date and private.day_of(created_at) = puzzle_date
       and not matched`,
    [userId, GAME_ID, day],
  );
  const dates = [...new Set(events.map((e) => e.date))];
  if (dates.length === 0) return [];
  const counts = await dayCounts(db, dates);
  const shared = events.flatMap((e) => {
    const question = counts.get(e.date)!.get(e.question_idx);
    if (!question || question.answered < ANSWER_SHARE_MIN_PLAYERS) return [];
    return [{ ...e, share: (question.byEntry.get(e.entry_id) ?? 0) / question.answered }];
  });
  // Lowest share first; on a tie, the later day, then the earlier question (Claude's, kept by the human, 2026-10-25:
  // "Keep it (Recommended)").
  const picked = shared
    .sort((a, b) => a.share - b.share || b.date.localeCompare(a.date) || a.question_idx - b.question_idx)
    .slice(0, RAREST_ANSWERS_SHOWN);
  if (picked.length === 0) return [];
  const { rows: puzzles } = await db.query<{ date: string; content: ApprovedPuzzle }>(
    "select puzzle_date::text as date, content from private.puzzle where game_id = $1 and puzzle_date = any($2::date[])",
    [GAME_ID, [...new Set(picked.map((p) => p.date))]],
  );
  const names = await thingNames(db, picked.map((p) => p.entry_id));
  return picked.map((p) => ({
    answer: named(names, p.entry_id),
    prompt: puzzles.find((z) => z.date === p.date)!.content.questions[p.question_idx].prompt,
    date: p.date,
    share: p.share,
  }));
}
