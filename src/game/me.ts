// The player's own stats for the Me tab (docs/milestones/M14-14a-3a-me.md; L45): totals across games, this month's
// calendar and a card per game. Dates are read as text and "today" comes from private.today()
// alone (M00 §8). "Across games" adds Offbeat's and Fragments' (docs/milestones/M16-16f-the-shared-pieces.md, 16f-1).
import { GAME_ID, SUBSTRINGS_ID } from "@/platform/game";
import type { Db } from "@/lib/db";
import { allTimePoints } from "./ledger";
import { readStats, type Stats } from "./offbeat";
import { settleSubstringRuns } from "./substring-places";
import { playedDays } from "./streak";

// since: the day the profile was made, by the Pacific day boundary. month: every day of today's month, oldest first,
// whether the player started a run in either game that day (human, 2026-11-13: "Played or not") and the points of
// their Offbeat day from the ledger, or null while it has none, for the calendar's text alternative (days after today included, so the
// calendar can draw them). fragments: Fragments' card, its best and average score from its ledger rows
// (a day's score is in once the day is closed, as Offbeat's best) and the days it was started.
export type Me = {
  username: string;
  since: string;
  totals: { points: number; daysPlayed: number; streak: number; longestStreak: number };
  month: { today: string; days: { date: string; played: boolean; points: number | null }[] };
  offbeat: { best: number | null; average: number | null };
  fragments: { best: number | null; average: number | null; daysPlayed: number };
};

export async function getMe(db: Db, userId: string): Promise<Me> {
  return (await getPlayerStats(db, userId)).me;
}

// A player's stats as another player's profile shows them (docs/milestones/M17-profiles-and-friend-requests.md, 17b):
// what Me shows, so the two can't drift apart, and recent, the game screen's chart of the last days (E3).
export async function getPlayerStats(db: Db, userId: string): Promise<{ me: Me; recent: Stats["days"] }> {
  // The day is read once, first, and every read is of it, the settling included, so a request at midnight can't mix
  // two (readStats; item 19). allTimePoints settles the player's runs closed by that day, once, so the points and the
  // best score are complete.
  const { rows: today } = await db.query<{ day: string }>("select private.today()::text as day");
  const day = today[0].day;
  const points = await allTimePoints(db, userId, day);
  await settleSubstringRuns(db);
  const stats = await readStats(db, userId, day);
  const { rows } = await db.query<{
    username: string;
    since: string;
    days_played: number;
    longest: number;
    today: string;
    month: Me["month"]["days"];
  }>(
    `with
     -- The streak's days (src/game/streak.ts); each unplayed day starts a new group.
     ${playedDays("$1", "$3")},
     groups as (select played, count(*) filter (where not played) over (order by d) as g from days)
     select p.username::text,
            private.day_of(p.created_at)::text as since,
            (select count(*) from days where played)::int as days_played,
            (select coalesce(max(n), 0) from (select count(*)::int as n from groups where played group by g) as runs)::int as longest,
            $3::text as today,
            (select json_agg(json_build_object('date', m.day::text, 'played', coalesce(d.played, false), 'points', l.points) order by m.day)
             from (select generate_series(date_trunc('month', $3::date), date_trunc('month', $3::date) + interval '1 month - 1 day',
                                          interval '1 day')::date as day) as m
             left join days d on d.d = m.day
             left join private.points_ledger l on l.user_id = $1 and l.game_id = $2 and l.puzzle_date = m.day) as month
     from private.profile p
     where p.user_id = $1`,
    [userId, GAME_ID, day],
  );
  const row = rows[0];
  const { rows: fragments } = await db.query<{ points: number; best: number | null; average: number | null; days_played: number }>(
    `select coalesce(sum(points), 0)::int as points, max(points) as best, avg(points)::float8 as average,
            (select count(*) from private.run where user_id = $1 and game_id = $2)::int as days_played
     from private.points_ledger where user_id = $1 and game_id = $2`,
    [userId, SUBSTRINGS_ID],
  );
  const me = {
    username: row.username,
    since: row.since,
    totals: { points: points + fragments[0].points, daysPlayed: row.days_played, streak: stats.streak, longestStreak: row.longest },
    month: { today: row.today, days: row.month },
    offbeat: { best: stats.best, average: stats.average },
    fragments: { best: fragments[0].best, average: fragments[0].average, daysPlayed: fragments[0].days_played },
  };
  return { me, recent: stats.days };
}

