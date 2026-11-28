// A run on a clock written straight into its tables, for the database tests that need a finished run, or one on a day that has
// closed (docs/milestones/M23-23c-the-run-on-a-clock.md). Playing one through the routes can't give a past day's answers or
// times: the answer trigger sets each answer's time to now and refuses one after the clock's end, so the rows are inserted as the
// local superuser with the triggers switched off (session_replication_role), as src/game/ledger.db.test.ts does.
import type { Pool } from "pg";
import { GAME_ID } from "@/platform/game";

// when: at the day's noon, a few minutes after its midnight, or now.
export type ClockGiven = { question: number; entry: string; tier: "common" | "uncommon" | "rare"; points: number; when: "noon" | "afterMidnight" | "now" };

const WHEN = {
  noon: "(($1::date + time '12:00') at time zone 'America/Los_Angeles')",
  afterMidnight: "((($1::date + 1) + time '00:10') at time zone 'America/Los_Angeles')",
  now: "statement_timestamp()",
};

// The player's run on that day, with these answers in order, finished by Finish when finish is set. The day's puzzle is there already.
// startedAt: an SQL timestamp expression; by default the run starts a minute before the day's noon, or now if that is later, so a past
// day's run is long over and today's is not.
export async function writeClockRun(
  admin: Pool,
  userId: string,
  date: string,
  answers: ClockGiven[],
  { finish = false, startedAt = "least(statement_timestamp(), (($3::date + time '11:59') at time zone 'America/Los_Angeles'))" }: { finish?: boolean; startedAt?: string } = {},
): Promise<void> {
  const client = await admin.connect();
  try {
    await client.query("begin");
    await client.query("set local session_replication_role = replica");
    await client.query(`insert into private.run (user_id, game_id, puzzle_date, started_at) values ($1, $2, $3::date, ${startedAt})`, [userId, GAME_ID, date]);
    const opened = Math.max(0, ...answers.map((a) => a.question));
    for (let question = 1; question <= opened; question++) {
      await client.query("insert into private.question_open (user_id, game_id, puzzle_date, question_idx) values ($1, $2, $3::date, $4)", [userId, GAME_ID, date, question]);
    }
    for (const a of answers) {
      // added_ms is at least a second, as the table's check holds it.
      await client.query(
        `insert into private.clock_answer (user_id, game_id, puzzle_date, question_idx, entry_id, tier, added_ms, points, created_at)
         values ($2, $3, $1::date, $4, $5, $6, 1000, $7, ${WHEN[a.when]})`,
        [date, userId, GAME_ID, a.question, a.entry, a.tier, a.points],
      );
    }
    if (finish) {
      await client.query("insert into private.clock_finish (user_id, game_id, puzzle_date, finished_at) values ($1, $2, $3::date, statement_timestamp())", [userId, GAME_ID, date]);
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
