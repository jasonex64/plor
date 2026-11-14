// Where game 2 runs stand (docs/milestones/M16-16e-points-and-boards.md, 16e-2): their ledger rows once their day is
// closed, and the end of a run's place so far today. A score is always the scoring function's, from the run's words.
import { PERCENTILE_MIN_PLAYERS } from "@/config/tunables";
import { circleSql } from "@/friends/circle";
import type { Db } from "@/lib/db";
import { SUBSTRINGS_ID } from "@/platform/game";
import { percentile } from "./percentile";
import { scoreRun } from "./substring-scoring";
import type { Standing } from "./substring-state";

type RunWords = { user_id: string; date: string; bonus_letter: string; keys: string[] };

// Each run's words, from its day's puzzle and round_word; where picks the runs.
const runsSql = (where: string) => `
  select r.user_id::text, r.puzzle_date::text as date, p.content ->> 'bonus_letter' as bonus_letter,
         coalesce(array_agg(w.word_key) filter (where w.word_key is not null), '{}') as keys
  from private.run r
  join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
  left join private.round_word w on w.user_id = r.user_id and w.game_id = r.game_id and w.puzzle_date = r.puzzle_date
  where r.game_id = $1 and ${where}
  group by r.user_id, r.puzzle_date, p.content`;

// The runs finished on a date ($2), for a standing.
const finishedOn = `r.puzzle_date = $2::date
       and exists (select from private.run_status s where s.user_id = r.user_id and s.game_id = r.game_id
                   and s.puzzle_date = r.puzzle_date and s.status = 'survived')`;

const total = (run: RunWords) => scoreRun(run.keys, run.bonus_letter).total;

// Writes the missing rows for every game 2 run on a closed day, and returns how many it wrote. Every player's, as a
// day's place needs the whole day. A run belongs to its day (DECISIONS.md, Game 2), so one left unfinished counts what
// it scored (answer 14). Game 1's bonus column is its rarity bonus, and nothing reads it back, so game 2 writes 0.
export async function settleSubstringRuns(db: Db): Promise<number> {
  const { rows } = await db.query<RunWords>(
    runsSql(`r.puzzle_date < private.today()
       and not exists (select from private.points_ledger l
                       where l.user_id = r.user_id and l.game_id = r.game_id and l.puzzle_date = r.puzzle_date)`),
    [SUBSTRINGS_ID],
  );
  if (rows.length === 0) return 0;
  const { rowCount } = await db.query(
    `insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus)
     select r.user_id, $1, r.puzzle_date, r.points, 0
     from unnest($2::uuid[], $3::date[], $4::int[]) as r(user_id, puzzle_date, points)
     on conflict (user_id, game_id, puzzle_date) do nothing`,
    [SUBSTRINGS_ID, rows.map((r) => r.user_id), rows.map((r) => r.date), rows.map(total)],
  );
  return rowCount!;
}

// The totals of these runs (their players and days, in step), by "userId:date", for the feed's result items: the score is
// the scoring function's, from the run's words, as the ledger writes it.
export async function runTotals(db: Db, userIds: string[], dates: string[]): Promise<Map<string, number>> {
  const { rows } = await db.query<RunWords>(runsSql("(r.user_id, r.puzzle_date) in (select * from unnest($2::uuid[], $3::date[]))"), [SUBSTRINGS_ID, userIds, dates]);
  return new Map(rows.map((r) => [`${r.user_id}:${r.date}`, total(r)]));
}

// A finished run's place so far today (answers 3, 16, 19): among the runs finished so far, as one still going would
// count low, shown from PERCENTILE_MIN_PLAYERS of them; and among the player and their friends who've finished, shown
// once a friend has.
export async function standingToday(db: Db, userId: string, date: string): Promise<Standing> {
  const { rows } = await db.query<RunWords & { circle: boolean }>(
    `select f.*, f.user_id::uuid in (${circleSql("$3")}) as circle
     from (${runsSql(finishedOn)}) f`,
    [SUBSTRINGS_ID, date, userId],
  );
  const scores = rows.map((r) => ({ ...r, total: total(r) }));
  const you = scores.find((s) => s.user_id === userId)!.total;
  const others = scores.filter((s) => s.user_id !== userId);
  const friends = others.filter((s) => s.circle);
  return {
    percent: scores.length >= PERCENTILE_MIN_PLAYERS ? percentile(you, others.map((s) => s.total)) : null,
    friends: friends.length === 0 ? null : { rank: 1 + friends.filter((s) => s.total > you).length, of: friends.length + 1 },
  };
}

// A guest's place so far today, from the players' finished runs alone: read only, so the guest's score is never added to
// theirs (docs/milestones/M18-guest-play.md, answer 20). The same minimum as a player's; a guest has no friends.
export async function guestStandingToday(db: Db, date: string, score: number): Promise<Standing> {
  const { rows } = await db.query<RunWords>(runsSql(finishedOn), [SUBSTRINGS_ID, date]);
  return { percent: rows.length >= PERCENTILE_MIN_PLAYERS ? percentile(score, rows.map(total)) : null, friends: null };
}
