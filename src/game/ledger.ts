// Settling runs into the points ledger (docs/milestones/M09-points-and-leaderboard.md, D3, D9, D10; M00-data-design.md
// §6): a run gets its one row once its day is closed, with the points of the answers it gave before that day's midnight,
// finished or not (M16 16e-3a, docs/milestones/M16-16e-points-and-boards.md, answers 35 and 38; M23-23c, Design, "The
// score"). A day closes at its midnight Pacific; nothing is scheduled. Every read of a board, Me or the game screen's stats
// settles every player's runs first, as a day's place needs the whole day (M16 16e-3b, answer 27), which is also how runs from
// before M09 get their rows.
// Relative imports with extensions: scripts/draft.ts runs this module on plain Node, which knows no "@/" paths.
import { GAME_ID } from "../platform/game.ts";
import type { Db } from "@/lib/db";

// Writes the missing rows for every player's runs on closed days, and returns how many it wrote. Settling again writes
// nothing. Only answers given before the day's midnight count, so a row doesn't depend on when this runs, and a run
// still being played after its midnight gets the row it will keep. day: the day it settles before, when the caller reads its day once for several reads
// (src/game/me.ts, getMe); otherwise today.
export async function settleRuns(db: Db, day: string | null = null): Promise<number> {
  const { rowCount } = await db.query(
    `insert into private.points_ledger (user_id, game_id, puzzle_date, points, bonus)
     select r.user_id, r.game_id, r.puzzle_date, coalesce(sum(a.points) filter (where private.day_of(a.created_at) = a.puzzle_date), 0)::int, 0
     from private.run r
     left join private.clock_answer a on a.user_id = r.user_id and a.game_id = r.game_id and a.puzzle_date = r.puzzle_date
     where r.game_id = $1 and r.puzzle_date < coalesce($2::date, private.today())
       and not exists (select from private.points_ledger l
                       where l.user_id = r.user_id and l.game_id = r.game_id and l.puzzle_date = r.puzzle_date)
     group by r.user_id, r.game_id, r.puzzle_date
     on conflict (user_id, game_id, puzzle_date) do nothing`,
    [GAME_ID, day],
  );
  return rowCount!;
}

// A player's all-time points: the sum of their ledger rows, once the runs on closed days are settled
// (docs/milestones/M12-account.md, 12a; ROADMAP "Design review", 2). Today's run counts once the day closes (M09 D9).
export async function allTimePoints(db: Db, userId: string, day: string | null = null): Promise<number> {
  await settleRuns(db, day);
  const { rows } = await db.query<{ total: number }>(
    "select coalesce(sum(points), 0)::int as total from private.points_ledger where user_id = $1 and game_id = $2",
    [userId, GAME_ID],
  );
  return rows[0].total;
}
